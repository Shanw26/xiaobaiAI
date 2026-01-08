# 从 Supabase 获取官方 API Key 配置指南

> **适用版本**: v2.10.13+
> **更新时间**: 2026-01-08
> **安全等级**: ⭐⭐⭐⭐ (相比硬编码大幅提升)

---

## 📋 概述

从 v2.10.13 开始，小白AI 支持从 Supabase 远程获取官方 API Key，**完全避免了在源代码中硬编码敏感信息**。

### 优势

✅ **安全**: API Key 不在源代码中，即使代码泄露也不会暴露密钥
✅ **灵活**: 可以随时在 Supabase 中更换 Key，无需更新应用
✅ **集中管理**: 所有环境（开发、测试、生产）使用同一个配置源
✅ **降级方案**: 如果 Supabase 不可用，自动降级到环境变量

---

## 🚀 快速开始

### 步骤 1：应用数据库迁移

登录 Supabase 控制台，执行以下 SQL：

```sql
-- 方式 1：在 SQL Editor 中执行
-- 复制 supabase/migrations/20260108_add_system_configs.sql 的内容
-- 粘贴到 SQL Editor 并执行

-- 方式 2：使用 CLI（如果配置了 Supabase CLI）
supabase db push
```

### 步骤 2：插入官方 API Key

在 Supabase SQL Editor 中执行：

```sql
-- 插入新的 API Key（替换 YOUR_NEW_KEY_HERE）
INSERT INTO public.system_configs (key, value, description, is_sensitive)
VALUES
  ('official_api_key', 'YOUR_NEW_KEY_HERE', '官方智谱 GLM API Key（游客模式使用）', true),
  ('official_provider', 'zhipu', '官方模型提供商', false),
  ('official_model', 'glm-4.7', '官方默认模型', false),
  ('free_usage_limit', '10', '游客免费使用次数限制', false)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

**⚠️ 重要**：
- 将 `YOUR_NEW_KEY_HERE` 替换为你的智谱 AI API Key
- 如果之前的 Key 已泄露，**请先在智谱 AI 控制台删除并生成新的 Key**

### 步骤 3：验证配置

```sql
-- 验证配置是否成功
SELECT * FROM public.system_configs;

-- 或者使用安全函数
SELECT * FROM get_system_config('official_api_key');
```

预期输出：
```
key                 | value                | description
--------------------|----------------------|---------------------------
official_api_key    | xxxxxxxxxxxxx...     | 官方智谱 GLM API Key（游...
official_provider   | zhipu                | 官方模型提供商
official_model      | glm-4.7              | 官方默认模型
free_usage_limit    | 10                   | 游客免费使用次数限制
```

### 步骤 4：重启应用

```bash
# 开发环境
npm run dev

# 或者重新构建
npm run dist
```

首次启动时，应用会自动从 Supabase 获取配置并写入本地数据库。

---

## 🔧 配置优先级

应用按以下优先级获取 API Key：

```
1. Supabase 远程配置（推荐）⭐
   ↓ 如果失败
2. 环境变量 ZHIPU_OFFICIAL_API_KEY
   ↓ 如果失败
3. 游客模式不可用（显示错误）
```

### 1. Supabase 远程配置（推荐）

**优点**：
- ✅ 最安全，Key 不在任何本地文件中
- ✅ 可以随时更换，无需重新部署
- ✅ 集中管理，方便运维

**要求**：
- 应用需要有网络连接
- Supabase 服务可用

### 2. 环境变量（降级方案）

```bash
# .env 文件
ZHIPU_OFFICIAL_API_KEY=your_api_key_here
```

**使用场景**：
- 开发环境（不想每次启动都请求 Supabase）
- Supabase 服务不可用时的紧急备用

### 3. 硬编码（已移除）❌

v2.10.12 及之前的版本使用了硬编码，这存在严重安全风险，已在 v2.10.13 中移除。

---

## 🛡️ 安全设计

### RLS（Row Level Security）策略

```sql
-- 所有人可读（通过客户端 API）
CREATE POLICY "允许所有人读取系统配置"
  ON public.system_configs
  FOR SELECT
  TO public
  USING (true);

-- 禁止客户端修改（只能通过 SQL Editor 或 Service Role Key）
CREATE POLICY "禁止客户端修改系统配置"
  ON public.system_configs
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
```

**安全特性**：
- ✅ 客户端（包括恶意用户）只能读取，不能修改
- ✅ 只有拥有 Service Role Key 的服务端可以修改
- ✅ 所有客户端 API 调用都受 RLS 保护

### 安全函数

```sql
-- 使用 SECURITY DEFINER 绕过 RLS
CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS TABLE (key TEXT, value TEXT, description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT sc.key, sc.value, sc.description
  FROM public.system_configs sc
  WHERE sc.key = p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**优点**：
- ✅ 函数所有者权限执行（而非调用者）
- ✅ 隐藏实现细节
- ✅ 方便调用

---

## 🔄 更新 API Key

### 场景 1：Key 泄露需要更换

```sql
-- 1. 在 Supabase SQL Editor 中执行
UPDATE public.system_configs
SET value = 'NEW_API_KEY_HERE',
    updated_at = NOW()
WHERE key = 'official_api_key';

-- 2. 验证
SELECT * FROM get_system_config('official_api_key');
```

**影响范围**：
- ✅ 新启动的应用会获取新的 Key
- ⚠️ 已启动的应用需要重启或等待下次启动
- 💡 建议定期轮换 Key（如每 3 个月）

### 场景 2：调整游客限制

```sql
-- 将游客免费次数从 10 改为 20
UPDATE public.system_configs
SET value = '20',
    updated_at = NOW()
WHERE key = 'free_usage_limit';
```

### 场景 3：切换模型

```sql
-- 从 glm-4.7 切换到 glm-4.5-flash（免费）
UPDATE public.system_configs
SET value = 'glm-4.5-flash',
    updated_at = NOW()
WHERE key = 'official_model';
```

---

## 🧪 测试与验证

### 测试 1：首次启动

```bash
# 清除本地数据库（模拟首次启动）
rm ~/Library/Application\ Support/xiaobai-ai/xiaobai-ai.db

# 启动应用
npm run dev
```

预期日志：
```
[启动] 初始化官方配置...
✅ 从 Supabase 成功获取官方配置
  - 模型提供商: zhipu
  - 模型: glm-4.7
  - API Key: xxxxxxxxx...
  - 免费限制: 10 次
✅ 使用 Supabase 配置
✅ 官方配置已初始化到数据库
[启动] ✓ 官方配置初始化完成
```

### 测试 2：Supabase 不可用

```bash
# 断开网络或设置错误的 Supabase URL
# 启动应用
npm run dev
```

预期日志：
```
[启动] 初始化官方配置...
❌ 从 Supabase 获取配置失败: Supabase 配置缺失
✅ 使用环境变量配置
✅ 官方配置已初始化到数据库
```

### 测试 3：游客模式

1. 启动应用（游客模式）
2. 发送消息
3. 检查是否使用官方 API Key

预期结果：
- ✅ 游客可以正常使用
- ✅ 使用 Supabase 中配置的 API Key
- ✅ 免费次数限制生效

---

## 📊 监控与日志

### 查看配置使用情况

```sql
-- 查看配置更新历史
SELECT
  key,
  value,
  description,
  created_at,
  updated_at
FROM public.system_configs
ORDER BY updated_at DESC;
```

### 应用日志

应用启动时会输出：
- ✅ 成功获取配置：显示 API Key 前 10 个字符
- ❌ 获取失败：显示错误原因

---

## ❓ 常见问题

### Q1: Supabase 连接失败怎么办？

**A**: 应用会自动降级到环境变量：

```bash
# 在 .env 文件中配置
ZHIPU_OFFICIAL_API_KEY=your_key_here
```

### Q2: 如何确认应用使用了 Supabase 的 Key？

**A**: 查看启动日志：

```
✅ 从 Supabase 成功获取官方配置  ← 使用 Supabase
✅ 使用环境变量配置              ← 使用环境变量
```

### Q3: RLS 策略会阻止读取吗？

**A**: 不会。RLS 策略允许所有人读取：

```sql
CREATE POLICY "允许所有人读取系统配置"
  FOR SELECT TO public USING (true);
```

### Q4: 客户端能否修改配置？

**A**: 不能。RLS 策略禁止客户端修改：

```sql
CREATE POLICY "禁止客户端修改系统配置"
  FOR ALL TO public USING (false);
```

只有使用 Service Role Key 的服务端可以修改。

### Q5: 如何迁移旧版本？

**A**:
1. 应用数据库迁移：`20260108_add_system_configs.sql`
2. 在 Supabase 中插入 API Key
3. 重启应用
4. 应用会自动从 Supabase 获取配置

旧版本用户的本地数据库已有配置，不会受影响。

---

## 🎯 最佳实践

1. **定期轮换 Key**：每 3-6 个月更换一次 API Key
2. **监控使用量**：在智谱 AI 控制台监控 API 调用量
3. **限制额度**：为游客 Key 设置每日/每月额度限制
4. **备选方案**：配置多个 Key，主 Key 失效时自动切换
5. **日志审计**：记录配置获取和更新的日志

---

## 📚 相关文档

- [游客模式设计](./04-deviceid-guest-mode.md)
- [数据库设计](./03-数据库设计.md)
- [部署配置](./08-deployment-config.md)

---

**最后更新**: 2026-01-08
**版本**: v2.10.13
**维护者**: 晓力
