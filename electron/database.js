const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

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

  // v2.9.8 - 确保数据库文件可写
  const fs = require('fs');
  const path = require('path');

  // 确保数据库目录存在
  const dbDir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (error) {
    safeError('创建数据库目录失败:', error);
  }

  // 如果数据库文件存在，检查并修复权限
  if (fs.existsSync(dbPath)) {
    try {
      fs.accessSync(dbPath, fs.constants.W_OK);
    } catch (error) {
      safeError('数据库文件只读，尝试修复:', error);
      // 尝试修复权限
      try {
        fs.chmodSync(dbPath, 0o666);
        safeLog('✓ 数据库文件权限已修复');
      } catch (chmodError) {
        safeError('无法修复数据库文件权限:', chmodError);
        // 如果无法修复，备份并重新创建
        try {
          const backupPath = dbPath + '.readonly.' + Date.now();
          fs.renameSync(dbPath, backupPath);
          safeLog('✓ 只读数据库已备份:', backupPath);
        } catch (renameError) {
          safeError('备份数据库失败:', renameError);
        }
      }
    }
  }

  try {
    db = new Database(dbPath, { /* v2.9.8 添加错误处理 */ });

    // 启用外键约束
    db.pragma('foreign_keys = ON');

    safeLog('✓ 数据库连接成功');
  } catch (error) {
    safeError('数据库连接失败:', error);
    throw error;
  }

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
  try {
    let hardwareId = null;

    // 根据不同操作系统获取硬件UUID
    if (process.platform === 'darwin') {
      // macOS: 使用 ioreg 获取硬件UUID
      try {
        hardwareId = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep UUID | awk \'{print $3}\' | tr -d \'"\'', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
      } catch (error) {
        safeError('获取macOS硬件UUID失败:', error.message);
      }
    } else if (process.platform === 'win32') {
      // Windows: 使用 MachineGuid
      try {
        hardwareId = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).match(/REG_SZ\s+([A-F0-9-]{36})/i)?.[1];
      } catch (error) {
        safeError('获取Windows MachineGuid失败:', error.message);
      }
    } else if (process.platform === 'linux') {
      // Linux: 使用 /etc/machine-id 或 /var/lib/dbus/machine-id
      try {
        const fs = require('fs');
        const machineIdPath = '/etc/machine-id';
        if (fs.existsSync(machineIdPath)) {
          hardwareId = fs.readFileSync(machineIdPath, 'utf-8').trim();
        }
      } catch (error) {
        safeError('获取Linux machine-id失败:', error.message);
      }
    }

    // 如果成功获取到硬件UUID，使用它
    if (hardwareId && hardwareId.length > 0) {
      // 转换为小写并移除可能的空格和括号
      hardwareId = hardwareId.toLowerCase().replace(/\s+/g, '');
      safeLog('✅ 使用硬件UUID:', hardwareId);
      return hardwareId;
    }
  } catch (error) {
    safeError('获取硬件UUID失败，使用降级方案:', error.message);
  }

  // 降级方案：如果硬件UUID获取失败，使用原来的方法
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus()[0]?.model || 'unknown';

  const uniqueString = `${hostname}-${platform}-${arch}-${cpus}`;
  const fallbackId = crypto.createHash('md5').update(uniqueString).digest('hex');
  safeLog('⚠️ 使用降级方案设备ID:', fallbackId);
  return fallbackId;
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

// ✨ v2.10.13 安全改进：从 Supabase 获取官方配置
// 避免在源代码中硬编码 API Key
async function fetchOfficialConfigFromSupabase() {
  try {
    // 从环境变量读取 Supabase 配置
    // 兼容 VITE_ 前缀（前端）和无前缀（后端）
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    // 优先使用 Service Role Key（绕过 RLS），其次使用 Anon Key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.SUPABASE_ANON_KEY ||
                        process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 配置缺失');
    }

    safeLog('📡 正在连接 Supabase:', supabaseUrl.substring(0, 30) + '...');
    safeLog('🔑 使用 Key 类型:', supabaseKey.includes('service_role') ? 'Service Role' : 'Anon');

    // 创建 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    safeLog('✅ Supabase 客户端创建成功');

    // ✨ 改用直接查询，避免 RPC 函数权限问题
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('system_configs')
      .select('key, value, description')
      .eq('key', 'official_api_key')
      .single();

    if (apiKeyError) {
      safeError('❌ 查询 API Key 失败:', apiKeyError);
      throw new Error('获取 API Key 失败: ' + apiKeyError.message);
    }

    const { data: providerData } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'official_provider')
      .single();

    const { data: modelData } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'official_model')
      .single();

    const { data: limitData } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'free_usage_limit')
      .single();

    // 提取配置值
    const apiKey = apiKeyData?.value || null;
    const provider = providerData?.value || 'zhipu';
    const model = modelData?.value || 'glm-4.7';
    const limit = limitData?.value || '10';

    if (!apiKey) {
      throw new Error('API Key 为空');
    }

    safeLog('✅ 从 Supabase 成功获取官方配置');
    safeLog('  - 模型提供商:', provider);
    safeLog('  - 模型:', model);
    safeLog('  - API Key:', apiKey.substring(0, 10) + '...');
    safeLog('  - 免费限制:', limit, '次');

    return { apiKey, provider, model, limit };
  } catch (error) {
    safeError('❌ 从 Supabase 获取配置失败:', error.message);
    return null;
  }
}

// 初始化官方配置（首次启动时调用）
async function initOfficialConfig() {
  // 检查是否已初始化
  const isInitialized = getSystemConfig('official_config_initialized');
  if (isInitialized) {
    safeLog('✅ 官方配置已存在，跳过初始化');
    return;
  }

  safeLog('🔄 开始初始化官方配置...');

  let officialApiKey = null;
  let officialProvider = 'zhipu';
  let officialModel = 'glm-4.7';
  let freeUsageLimit = '10';

  // ✨ v2.10.13 优先级：Supabase > 环境变量 > 默认值
  // 1. 尝试从 Supabase 获取（推荐）
  const supabaseConfig = await fetchOfficialConfigFromSupabase();
  if (supabaseConfig) {
    officialApiKey = supabaseConfig.apiKey;
    officialProvider = supabaseConfig.provider;
    officialModel = supabaseConfig.model;
    freeUsageLimit = supabaseConfig.limit;
    safeLog('✅ 使用 Supabase 配置');
  } else {
    // 2. 降级方案：环境变量
    officialApiKey = process.env.ZHIPU_OFFICIAL_API_KEY;
    if (officialApiKey) {
      safeLog('✅ 使用环境变量配置');
    } else {
      // 3. 最后兜底：使用默认值（不推荐，仅用于开发测试）
      safeError('⚠️  警告：无法从 Supabase 或环境变量获取 API Key');
      safeError('⚠️  游客模式将无法使用');
      safeError('⚠️  请在 Supabase system_configs 表中配置 official_api_key');
      safeError('⚠️  或在 .env 文件中设置 ZHIPU_OFFICIAL_API_KEY');
      return;  // 不使用硬编码 Key，让初始化失败
    }
  }

  // 写入官方API Key到数据库（仅首次写入）
  setSystemConfig('official_api_key', officialApiKey, '官方智谱GLM API Key（游客模式使用）');
  setSystemConfig('official_provider', officialProvider, '官方模型提供商');
  setSystemConfig('official_model', officialModel, '官方默认模型');
  setSystemConfig('free_usage_limit', freeUsageLimit, '游客免费使用次数限制');
  setSystemConfig('official_config_initialized', 'true', '配置已初始化标记');

  safeLog('✅ 官方配置已初始化到数据库（存储在本地加密数据库中）');
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
  fetchOfficialConfigFromSupabase,  // ✨ v2.10.13 新增

  // 工具函数
  getDatabasePath,

  // 用户信息和记忆
  getUserInfo,
  saveUserInfo,
  getAiMemory,
  saveAiMemory,
};
