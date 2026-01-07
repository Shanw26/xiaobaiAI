const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ==================== 安全的日志输出 ====================
// 检查流可写性，避免 EPIPE 错误
function safeLog(...args) {
  if (process.stdout.writable) {
    console.log(...args);
  }
}

function safeError(...args) {
  if (process.stderr.writable) {
    console.error(...args);
  }
}

// 数据库文件路径
const getDatabasePath = () => {
  const userDataPath = require('electron').app.getPath('userData');
  return path.join(userDataPath, 'xiaobai-ai.db');
};

let db = null;

// 初始化数据库连接
function initDatabase() {
  if (db) return db;

  const dbPath = getDatabasePath();
  safeLog('初始化数据库:', dbPath);

  db = new Database(dbPath);

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 创建表
  createTables();

  return db;
}

// 创建数据表
function createTables() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      api_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME,
      total_requests INTEGER DEFAULT 0
    )
  `);

  // 游客使用记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_usage (
      device_id TEXT PRIMARY KEY,
      used_count INTEGER DEFAULT 0,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 验证码表
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0
    )
  `);

  // 请求记录表（可选，用于统计分析）
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      device_id TEXT,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 系统配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 用户信息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AI记忆表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  safeLog('数据表创建完成');
}

// 生成设备ID（基于机器特征）
function getDeviceId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus()[0]?.model || 'unknown';

  const uniqueString = `${hostname}-${platform}-${arch}-${cpus}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
}

// ==================== 用户相关操作 ====================

// 创建用户
function createUser(phone) {
  const db = initDatabase();
  const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const stmt = db.prepare(`
    INSERT INTO users (id, phone, created_at, last_login_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  try {
    stmt.run(userId, phone);
    safeLog('用户创建成功:', userId);
    return { success: true, userId };
  } catch (error) {
    safeError('创建用户失败:', error);
    if (error.message.includes('UNIQUE')) {
      return { success: false, error: '该手机号已注册' };
    }
    return { success: false, error: error.message };
  }
}

// 根据手机号获取用户
function getUserByPhone(phone) {
  const db = initDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE phone = ?');
  return stmt.get(phone);
}

// 根据用户ID获取用户
function getUserById(userId) {
  const db = initDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(userId);
}

// 更新用户API Key
function updateUserApiKey(userId, apiKey) {
  const db = initDatabase();
  const stmt = db.prepare('UPDATE users SET api_key = ? WHERE id = ?');
  try {
    stmt.run(apiKey, userId);
    return { success: true };
  } catch (error) {
    safeError('更新API Key失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新最后登录时间
function updateLastLogin(userId) {
  const db = initDatabase();
  const stmt = db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(userId);
}

// 增加用户请求次数
function incrementUserRequests(userId) {
  const db = initDatabase();
  const stmt = db.prepare('UPDATE users SET total_requests = total_requests + 1 WHERE id = ?');
  stmt.run(userId);
}

// ==================== 游客相关操作 ====================

// 获取游客使用记录
function getGuestUsage(deviceId) {
  const db = initDatabase();
  const stmt = db.prepare('SELECT * FROM guest_usage WHERE device_id = ?');
  return stmt.get(deviceId);
}

// 创建或更新游客使用记录
function initGuestUsage(deviceId) {
  const db = initDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO guest_usage (device_id, used_count, last_used_at)
    VALUES (?, 0, CURRENT_TIMESTAMP)
  `);
  stmt.run(deviceId);
  return getGuestUsage(deviceId);
}

// 增加游客使用次数
function incrementGuestUsage(deviceId) {
  const db = initDatabase();
  const stmt = db.prepare(`
    UPDATE guest_usage
    SET used_count = used_count + 1,
        last_used_at = CURRENT_TIMESTAMP
    WHERE device_id = ?
  `);
  stmt.run(deviceId);
  return getGuestUsage(deviceId);
}

// 检查游客是否可以继续使用
function canGuestUse(deviceId) {
  const usage = getGuestUsage(deviceId);
  if (!usage) {
    // 首次使用，创建记录
    initGuestUsage(deviceId);
    return { canUse: true, remaining: 10 };
  }

  const remaining = 10 - usage.used_count;
  return {
    canUse: remaining > 0,
    remaining: Math.max(0, remaining),
    usedCount: usage.used_count
  };
}

// ==================== 验证码相关操作 ====================

// 生成验证码
function generateVerificationCode() {
  // 生成6位数字验证码
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 创建验证码
function createVerificationCode(phone) {
  const db = initDatabase();
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

  const stmt = db.prepare(`
    INSERT INTO verification_codes (phone, code, expires_at)
    VALUES (?, ?, ?)
  `);

  try {
    stmt.run(phone, code, expiresAt.toISOString());
    safeLog('验证码已生成:', { phone, code, expiresAt });
    return { success: true, code };
  } catch (error) {
    safeError('创建验证码失败:', error);
    return { success: false, error: error.message };
  }
}

// 验证验证码
function verifyCode(phone, code) {
  const db = initDatabase();
  const stmt = db.prepare(`
    SELECT * FROM verification_codes
    WHERE phone = ? AND code = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const record = stmt.get(phone, code);

  if (!record) {
    return { valid: false, error: '验证码无效或已过期' };
  }

  // 标记验证码为已使用
  const updateStmt = db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?');
  updateStmt.run(record.id);

  return { valid: true };
}

// 清理过期验证码（定时任务）
function cleanExpiredCodes() {
  const db = initDatabase();
  const stmt = db.prepare('DELETE FROM verification_codes WHERE expires_at < CURRENT_TIMESTAMP');
  const result = stmt.run();
  safeLog('清理过期验证码:', result.changes, '条');
}

// ==================== 请求日志相关操作 ====================

// 记录请求日志
function logRequest({ userId, deviceId, model, inputTokens, outputTokens }) {
  const db = initDatabase();
  const stmt = db.prepare(`
    INSERT INTO request_logs (user_id, device_id, model, input_tokens, output_tokens)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(userId, deviceId, model, inputTokens, outputTokens);
}

// 获取用户请求统计
function getUserRequestStats(userId, days = 7) {
  const db = initDatabase();
  const stmt = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as requests,
      SUM(input_tokens + output_tokens) as total_tokens
    FROM request_logs
    WHERE user_id = ? AND created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);
  return stmt.all(userId, days);
}

// ==================== 系统配置操作 ====================

// 获取系统配置
function getSystemConfig(key) {
  const db = initDatabase();
  const stmt = db.prepare('SELECT value FROM system_config WHERE key = ?');
  const result = stmt.get(key);
  return result ? result.value : null;
}

// 设置系统配置
function setSystemConfig(key, value, description = null) {
  const db = initDatabase();
  const stmt = db.prepare(`
    INSERT INTO system_config (key, value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(key, value, description);
}

// 初始化官方配置（首次启动时调用）
function initOfficialConfig() {
  // 检查是否已初始化
  const isInitialized = getSystemConfig('official_config_initialized');
  if (isInitialized) {
    return;
  }

  // 写入官方API Key
  setSystemConfig('official_api_key', 'c2204ed0321b40a78e7f8b6eda93ff39.h9MOF4P51SCQpPhI', '官方智谱GLM API Key（游客模式使用）');
  setSystemConfig('official_provider', 'zhipu', '官方模型提供商');
  setSystemConfig('official_model', 'glm-4.7', '官方默认模型');
  setSystemConfig('free_usage_limit', '10', '游客免费使用次数限制');
  setSystemConfig('official_config_initialized', 'true', '配置已初始化标记');

  safeLog('官方配置已初始化到数据库');
}

// 获取官方API Key
function getOfficialApiKey() {
  return getSystemConfig('official_api_key');
}

// ==================== 用户信息和记忆操作 ====================

// 获取用户信息
function getUserInfo() {
  const db = initDatabase();
  const stmt = db.prepare('SELECT content FROM user_info WHERE id = 1');
  const result = stmt.get();

  if (result) {
    return result.content;
  }

  // 返回默认模板
  return `# 用户信息

## 基本信息
- 姓名：
- 职业：
- 兴趣爱好：

## 偏好设置
- 工作时间：
- 学习风格：
- 沟通方式：

## 其他信息
- 特殊需求：
- 常用工具：
- 备注信息：
`;
}

// 保存用户信息
function saveUserInfo(content) {
  const db = initDatabase();

  // 检查是否已存在记录
  const checkStmt = db.prepare('SELECT id FROM user_info WHERE id = 1');
  const exists = checkStmt.get();

  if (exists) {
    // 更新现有记录
    const updateStmt = db.prepare(`
      UPDATE user_info
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    updateStmt.run(content);
  } else {
    // 插入新记录
    const insertStmt = db.prepare(`
      INSERT INTO user_info (content)
      VALUES (?)
    `);
    insertStmt.run(content);
  }

  safeLog('用户信息已保存');
  return { success: true };
}

// 获取AI记忆
function getAiMemory() {
  const db = initDatabase();
  const stmt = db.prepare('SELECT content FROM ai_memory WHERE id = 1');
  const result = stmt.get();

  if (result) {
    return result.content;
  }

  // 返回默认模板
  return `# AI 记忆

## 对话历史记录
- 重要对话内容
- 用户偏好
- 常见问题

## 用户习惯
- 工作流程
- 常用命令
- 操作习惯

## 重要事项
- 特殊要求
- 注意事项
- 待办事项

## 其他信息
- 补充记录
- 备注信息
`;
}

// 保存AI记忆
function saveAiMemory(content) {
  const db = initDatabase();

  // 检查是否已存在记录
  const checkStmt = db.prepare('SELECT id FROM ai_memory WHERE id = 1');
  const exists = checkStmt.get();

  if (exists) {
    // 更新现有记录
    const updateStmt = db.prepare(`
      UPDATE ai_memory
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    updateStmt.run(content);
  } else {
    // 插入新记录
    const insertStmt = db.prepare(`
      INSERT INTO ai_memory (content)
      VALUES (?)
    `);
    insertStmt.run(content);
  }

  safeLog('AI记忆已保存');
  return { success: true };
}

// ==================== 导出 ====================

module.exports = {
  initDatabase,
  getDeviceId,

  // 用户操作
  createUser,
  getUserByPhone,
  getUserById,
  updateUserApiKey,
  updateLastLogin,
  incrementUserRequests,

  // 游客操作
  getGuestUsage,
  initGuestUsage,
  incrementGuestUsage,
  canGuestUse,

  // 验证码操作
  createVerificationCode,
  verifyCode,
  cleanExpiredCodes,

  // 请求日志
  logRequest,
  getUserRequestStats,

  // 系统配置
  getSystemConfig,
  setSystemConfig,
  initOfficialConfig,
  getOfficialApiKey,

  // 工具函数
  getDatabasePath,

  // 用户信息和记忆
  getUserInfo,
  saveUserInfo,
  getAiMemory,
  saveAiMemory,
};
