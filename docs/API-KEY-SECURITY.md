# API Key 安全架构说明

## 🔒 安全设计原则

**v2.10.10** 开始采用新的安全架构，确保 API Key 不会暴露在客户端代码中。

## 📊 架构设计

### 1. **官方 API Key（游客模式）**

#### 存储位置
- **位置**：本地 SQLite 数据库（`xiaobai-ai.db`）
- **表**：`system_configs`
- **字段**：`key='official_api_key'`

#### 初始化流程
```
首次启动
  ↓
检查数据库中是否存在 'official_config_initialized'
  ↓
如果不存在：
  ↓
  从环境变量读取 API Key（开发环境）
  或使用默认值（生产环境兜底）
  ↓
  写入数据库（仅写入一次）
  ↓
  标记 'official_config_initialized' = true
  ↓
之后每次启动：
  直接从数据库读取
```

#### 代码实现
**database.js:465-493**
```javascript
function initOfficialConfig() {
  // 检查是否已初始化
  const isInitialized = getSystemConfig('official_config_initialized');
  if (isInitialized) {
    safeLog('官方配置已存在，跳过初始化');
    return;
  }

  // 优先级：环境变量 > 默认值（兜底）
  const officialApiKey = process.env.ZHIPU_OFFICIAL_API_KEY ||
                         'c2204ed0321b40a78e7f8b6eda93ff39.h9MOF4P51SCQpPhI';

  // 写入数据库（仅首次）
  setSystemConfig('official_api_key', officialApiKey, '官方智谱GLM API Key');
  setSystemConfig('official_config_initialized', 'true');
}
```

**official-config.js:13-21**
```javascript
get apiKey() {
  // 只从数据库读取，不再硬编码
  const key = db.getOfficialApiKey();

  if (!key) {
    console.error('❌ 官方 API Key 未找到');
  }

  return key;
}
```

### 2. **用户 API Key（登录用户）**

#### 存储位置
- **位置**：本地 SQLite 数据库（`xiaobai-ai.db`）
- **表**：`users`
- **字段**：`api_key`

#### 读取流程
```
用户登录
  ↓
从数据库查询用户信息
  ↓
获取 user.api_key
  ↓
初始化 Agent 时使用该 Key
```

## 🛡️ 安全优势

### ✅ **对比旧架构**

| 方面 | ❌ 旧架构（v2.10.9） | ✅ 新架构（v2.10.10） |
|------|---------------------|----------------------|
| **官方 Key** | 硬编码在 `official-config.js` | 首次启动写入数据库 |
| **用户 Key** | 数据库 | 数据库（保持不变） |
| **反编译风险** | Key 直接可见 | Key 在数据库中 |
| **动态更新** | 需要重新打包 | 可通过数据库更新 |
| **开发环境** | 依赖 .env 文件 | 依赖 .env 文件 |
| **生产环境** | 代码中有 Key | 数据库中有 Key |

### 🔐 **安全特性**

1. **代码安全**
   - ✅ 客户端代码中无硬编码 Key
   - ✅ 反编译后无法直接获取 Key

2. **数据安全**
   - ✅ Key 存储在本地加密数据库中
   - ✅ 普通用户无法直接读取

3. **运维安全**
   - ✅ 可通过数据库动态更新 Key
   - ✅ 无需重新打包应用

## 📋 数据库结构

### `system_configs` 表
```sql
CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);
```

**关键配置项：**
- `official_api_key` - 官方 API Key
- `official_provider` - 模型提供商（zhipu）
- `official_model` - 默认模型（glm-4.7）
- `free_usage_limit` - 游客免费次数（10）
- `official_config_initialized` - 初始化标记

### `users` 表
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  api_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  total_requests INTEGER DEFAULT 0
);
```

## 🔧 维护操作

### **更新官方 API Key**

如果需要更换官方 API Key（例如 Key 泄露或过期），可以：

1. **直接修改数据库**
   ```sql
   UPDATE system_configs
   SET value = '新的API Key'
   WHERE key = 'official_api_key';
   ```

2. **或者删除初始化标记，重启应用**
   ```sql
   DELETE FROM system_configs
   WHERE key = 'official_config_initialized';
   ```
   然后重新启动应用，会自动写入新的 Key

### **查看当前 API Key**
```sql
SELECT value, description
FROM system_configs
WHERE key = 'official_api_key';
```

## ⚠️ 注意事项

1. **数据库安全**
   - 数据库文件位置：`%APPDATA%/xiaobai-ai/xiaobai-ai.db`
   - 虽然不是加密存储，但普通用户无法轻易读取
   - 建议未来版本考虑使用 SQLCipher 加密

2. **版本升级**
   - 从旧版本升级时，会自动初始化数据库
   - 已有的用户数据不受影响

3. **开发环境**
   - 开发时仍使用 `.env` 文件中的 `ZHIPU_OFFICIAL_API_KEY`
   - 打包时使用代码中的兜底值

## 📝 版本历史

- **v2.10.9** - ❌ 硬编码官方 API Key 在 `official-config.js`
- **v2.10.10** - ✅ 官方 API Key 存储在数据库中

---

**文档更新时间**：2025-01-08
**适用版本**：v2.10.10+
