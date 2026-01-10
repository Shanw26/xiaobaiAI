# 故障排查指南

> **适用版本**: v2.8.0+
> **阅读时间**: 15分钟
> **相关文档**: [部署与配置](./08-deployment-config.md) | [更新日志](./10-changelog.md)

---

## 📋 目录

1. [配置问题](#配置问题)
2. [云端同步问题](#云端同步问题)
3. [用户界面问题](#用户界面问题)
4. [数据库问题](#数据库问题)
5. [开发环境问题](#开发环境问题)

---

## 配置问题

### ❌ 问题：Supabase API Key 无效

**错误信息**:
```
❌ 获取失败: Invalid API key
HTTP 401 Unauthorized
```

**症状**:
- 用户信息和 AI 记忆无法保存
- 所有 Supabase 请求返回 401 错误
- 错误提示：`Double check your Supabase anon or service_role API key`

**原因分析**:

使用了错误类型的 Key，常见错误：
- ❌ Personal Access Token（`sbp_` 开头）用于 Service Role Key 位置
- ❌ Anon Key 和 Service Role Key 混淆
- ❌ Key 过期或被重新生成

**解决方案**:

1. **确认 Key 类型**：
   ```bash
   # Personal Access Token（仅用于 CLI，不用于应用）
   sbp_YOUR_SERVICE_ROLE_KEY_HERE

   # Service Role Key（用于服务端，JWT 格式）
   REMOVED

   # Anon Key（用于客户端，JWT 格式）
   REMOVED
   ```

2. **从 Supabase Dashboard 获取正确的 Key**：
   - 访问：https://supabase.com/dashboard/project/your-project-ref/settings/api
   - 找到 **Project API keys** 部分
   - 复制 **service_role** 密钥（必须是 JWT 格式，`eyJ` 开头）
   - ⚠️ 不要复制 Personal Access Token

3. **更新配置文件**：
   ```bash
   # .env 文件
   VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...（完整的 JWT）
   ```

4. **重启开发服务器**：
   ```bash
   npm run dev
   ```

**参考文档**:
- [部署配置 - Keys 配置](./08-deployment-config.md#keys-配置)
- [更新日志 v2.8.0 - 修复 1](./10-changelog.md#2026-01-07---v280-开发版本)

---

## 云端同步问题

### ❌ 问题：用户信息保存失败

**错误信息**:
```
❌ 保存失败: Too few parameter values were provided
```

**症状**:
- 设置页面保存用户信息时报错
- 其他用户信息保存入口失败

**原因分析**:

数据保存方法不一致：
- 早期版本使用本地保存 API：`window.electronAPI.saveUserInfo()`
- 当前版本使用云端保存 API：`cloudService.saveUserInfo()`
- 数据格式可能不一致（Object vs Markdown String）

**解决方案**:

✅ **已修复**：在 v2.8.0 中统一使用云端保存

如果问题仍然存在，检查：
1. 确认 Service Role Key 正确（参见上面的问题）
2. 检查 Supabase 数据库表是否存在：
   ```sql
   SELECT * FROM user_info;
   SELECT * FROM ai_memory;
   ```
3. 检查表结构是否正确：
   ```sql
   \d user_info
   -- 应该有这些字段：
   -- id (INT, PRIMARY KEY)
   -- user_id (UUID, nullable)
   -- device_id (VARCHAR(64), nullable)
   -- content (TEXT, not null)
   -- created_at (TIMESTAMP)
   -- updated_at (TIMESTAMP)
   ```

**参考文档**:
- [更新日志 v2.8.0 - 修复 2](./10-changelog.md#修复-2-welcomemodal-保存失败-)

---

### ❌ 问题：数据不同步

**症状**:
- 悬浮框保存的数据在设置页面看不到
- 设置页面修改的数据在悬浮框看不到
- 两个入口显示的内容不一致

**原因分析**:

两个入口可能访问了不同的数据源或使用了不同的查询方法。

**解决方案**:

1. **确认数据源一致**：
   - 悬浮框和设置页面都应该调用 `cloudService.getUserInfo()`
   - 数据都存储在 Supabase 的 `user_info` 表

2. **检查查询逻辑**：
   ```javascript
   // 正确的查询方式（云端）
   const { getUserInfo } = await import('../lib/cloudService');
   const result = await getUserInfo();

   // ❌ 错误的查询方式（本地）
   const result = await window.electronAPI.getUserInfo();
   ```

3. **清除缓存**：
   ```bash
   # 删除 Vite 缓存
   rm -rf node_modules/.vite

   # 重启开发服务器
   npm run dev
   ```

4. **刷新浏览器**：
   - 按 `Cmd+R`（macOS）或 `Ctrl+R`（Windows/Linux）
   - 或打开开发者工具，右键刷新按钮选择"清空缓存并硬性重新加载"

---

## 用户界面问题

### ❌ 问题：悬浮框不显示

**症状**:
- 应用启动后看不到👋悬浮球
- 之前能看到，现在消失了

**原因分析**:

用户已经完成引导或手动关闭了悬浮框。

**解决方案**:

1. **清除 localStorage**：
   ```javascript
   // 在浏览器控制台执行
   localStorage.clear();
   // 然后刷新页面
   ```

2. **重新显示悬浮框**：
   - 打开设置 → 切换到"关于"标签
   - 查看是否有"重新显示引导"选项

3. **检查代码逻辑**：
   ```javascript
   // FloatingGuide.jsx
   const [dismissed, setDismissed] = useState(false);

   // 如果 dismissed 为 true，悬浮框不会显示
   // 需要将 dismissed 重置为 false
   ```

---

### ❌ 问题：弹窗样式错乱

**症状**:
- 弹窗内容显示不完整
- 按钮位置不对
- 颜色主题不统一

**原因分析**:
- CSS 文件未正确加载
- 样式缓存问题
- ModalBase.css 未应用

**解决方案**:

1. **清除缓存并重启**：
   ```bash
   rm -rf node_modules/.vite dist
   npm run dev
   ```

2. **检查 CSS 导入**：
   ```javascript
   // 确认组件导入了正确的 CSS
   import './ModalBase.css';  // 基础样式
   import './LoginModal.css';  // 组件特定样式
   ```

3. **检查浏览器控制台**：
   - 打开开发者工具（F12）
   - 查看 Console 是否有 CSS 加载错误
   - 查看 Network 标签，确认 CSS 文件成功加载

---

## 数据库问题

### ❌ 问题：表不存在

**错误信息**:
```
relation "user_info" does not exist
relation "ai_memory" does not exist
```

**症状**:
- 查询用户信息时报错
- 保存 AI 记忆时报错

**解决方案**:

1. **在 Supabase Dashboard 创建表**：
   ```sql
   -- 用户信息表
   CREATE TABLE user_info (
     id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     device_id VARCHAR(64),
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
     UNIQUE (user_id, device_id)
   );

   -- AI 记忆表
   CREATE TABLE ai_memory (
     id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     device_id VARCHAR(64),
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
     UNIQUE (user_id, device_id)
   );
   ```

2. **或在本地执行迁移文件**：
   ```bash
   # 如果使用 Supabase CLI
   supabase db push
   ```

**参考文档**:
- [数据库设计](./03-database-design.md)

---

## 开发环境问题

### ❌ 问题：开发服务器无法启动

**错误信息**:
```
Port 5173 is already in use
Error: listen EADDRINUSE: address already in use :::5173
```

**解决方案**:

1. **查找并终止占用端口的进程**：
   ```bash
   # macOS/Linux
   lsof -ti:5173 | xargs kill -9

   # Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   ```

2. **或使用其他端口**：
   Vite 会自动尝试下一个端口（5174, 5175...）

---

### ❌ 问题：热重载不工作

**症状**:
- 修改代码后页面不自动更新
- 需要手动刷新才能看到变化

**解决方案**:

1. **检查 Vite 配置**：
   ```javascript
   // vite.config.js
   export default {
     server: {
       hmr: true,  // 确保开启 HMR
       watch: {
         usePolling: true  // 某些环境下需要轮询
       }
     }
   };
   ```

2. **重启开发服务器**：
   ```bash
   # 按 Ctrl+C 停止
   npm run dev
   ```

---

## 🔍 调试技巧

### 1. 查看详细日志

**前端日志**（浏览器控制台）：
```javascript
// 在组件中添加调试日志
console.log('🔍 [组件名] 状态:', state);
console.log('🔍 [组件名] Props:', props);
console.table(data);  // 表格形式展示数据
```

**后端日志**（Electron 主进程）：
```javascript
// electron/main.js
console.log('🔧 [主进程] 消息:', message);
```

### 2. 检查网络请求

打开浏览器开发者工具 → Network 标签：
- 查看请求是否成功（HTTP 状态码）
- 查看请求参数是否正确
- 查看响应数据是否符合预期

### 3. 检查 Supabase 日志

1. 访问 Supabase Dashboard
2. 点击左侧菜单 → Database → Logs
3. 查看最近的查询日志和错误信息

---

## 📞 获取帮助

如果以上方案都无法解决问题：

1. **查看更新日志**：[Changelog](./10-changelog.md)
2. **查看部署配置**：[Deployment & Config](./08-deployment-config.md)
3. **提交 Issue**：https://github.com/Shanw26/xiaobaiAI/issues

---

**文档维护**: Claude Code + 晓力
**最后更新**: 2026-01-07
**适用版本**: v2.8.0+
