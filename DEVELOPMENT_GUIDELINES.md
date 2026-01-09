# 小白AI开发规范

> **说明**: 本文件定义小白AI项目的基本开发规则和约定
> **适用对象**: 所有参与项目开发的开发者和AI助手
> **强制执行**: 每次开发前必须阅读，开发后必须遵守

---

## 📜 核心原则

### 第一条：阅读并更新 Memory 文件 ⭐

**要求**:
1. **开发前**: 必须阅读项目根目录的 `MEMORY.md` 文件
2. **了解上下文**: 理解之前做了什么，为什么这样做
3. **避免重复**: 检查是否已有类似功能或方案
4. **尊重历史**: 理解废弃方案的原因，不要重复踩坑

**执行时机**:
- 开始任何新功能开发前
- 修复任何 bug 前
- 进行任何重构前
- 接手项目时

**更新要求**:
- 每次重大变更后立即更新 `MEMORY.md`
- 记录：做了什么、为什么、有什么影响
- 按时间倒序排列（最新的在最上面）

---

### 第二条：更新文档 📚

**要求**:
1. **同步更新**: 代码修改后，同步更新 `docs/` 目录下的相关文档
2. **保持准确**: 文档必须与代码保持一致
3. **记录决策**: 重要决策要在文档中说明原因
4. **方便他人**: 文档要写得让其他人能看懂

**更新检查清单**:
- [ ] 修改了登录逻辑？→ 更新 `docs/02-登录系统.md`
- [ ] 修改了数据库结构？→ 更新 `docs/03-数据库设计.md`
- [ ] 添加了新功能？→ 更新对应文档或创建新文档
- [ ] 修改了架构？→ 更新 `docs/06-系统架构.md`
- [ ] 更新了配置？→ 更新 `docs/07-部署与配置.md`

**文档维护原则**:
- **不要偷懒**: 宁可多写也不要少写
- **不要过时**: 代码改了，文档必须同步改
- **不要模糊**: 使用准确的术语和清晰的说明
- **不要缺失**: 重要配置和密钥信息要记录

---

### 第三条：理解产品约束 🎯

**核心约束**: 小白AI的产品定位决定技术选型

**必须牢记**:
1. **无密码**: 只有手机号 + 验证码，**没有密码**
2. **无Email**: 用户只有手机号，**没有email**
3. **简单原则**: 功能简单易用，降低用户门槛
4. **游客友好**: 游客也能完整使用（有限制）

**技术选型边界**:
- ❌ 不使用需要 Email 的认证方案（如 Supabase Auth）
- ❌ 不使用复杂的权限管理
- ❌ 不增加不必要的配置项
- ✅ 使用最简单的方案解决问题

**设计原则**:
- **预测**: 预测用户需求，提前满足
- **单点击穿**: 找到一个关键点，做到极致
- **All-in**: 专注一个功能，投入所有资源

---

### 第四条：文件命名规范 📁

**要求**: 所有文件名必须使用英文，禁止使用中文

**规范**:
1. **代码文件**: 使用英文命名，采用 camelCase 或 kebab-case
   - ✅ `userService.js` / `user-service.js`
   - ✅ `UserProfile.jsx` / `user-profile.jsx`
   - ❌ `用户服务.js` / `用户资料.jsx`

2. **文档文件**: 使用英文命名，但标题可以使用中文
   - ✅ `DEVELOPMENT_GUIDELINES.md` (文件名) → `# 小白AI开发规范` (标题)
   - ✅ `CHANGELOG.md` (文件名) → `# 更新日志` (标题)
   - ❌ `开发规范.md` (文件名)

3. **数据库迁移文件**: 使用时间戳 + 英文描述
   - ✅ `20260107_add_user_info_table.sql`
   - ✅ `20260107_fix_rls_policies.sql`
   - ❌ `20260107_添加用户表.sql`

4. **配置文件**: 使用标准命名
   - ✅ `package.json`
   - ✅ `.env.example`
   - ✅ `vite.config.js`

**原因**:
- ✅ 跨平台兼容性（Windows/Linux/macOS）
- ✅ 避免编码问题（UTF-8 vs GBK）
- ✅ 便于工具识别和构建
- ✅ 符合国际开源项目惯例

**执行时机**:
- 创建新文件时
- 重构旧文件名时
- 发现中文文件名时立即修改

**检查清单**:
- [ ] 项目根目录没有中文文件名
- [ ] `src/` 目录下没有中文文件名
- [ ] `docs/` 目录下没有中文文件名
- [ ] `supabase/migrations/` 下没有中文文件名

---

### 第五条：代码质量标准 💻

**要求**:
1. **可读性优先**: 代码要写得像文档一样清晰
2. **注释充分**: 复杂逻辑必须写注释说明
3. **命名规范**: 使用清晰、准确的变量名和函数名
4. **日志完整**: 关键操作要写日志，方便调试

**代码风格**:
```javascript
// ✅ 好的代码
// 验证验证码（使用 admin 客户端绕过 RLS）
const { data: codeRecord } = await supabaseAdmin
  .from('verification_codes')
  .select('*')
  .eq('phone', phone)
  .eq('code', code)
  .eq('used', false)                      // 未使用
  .gte('expires_at', new Date().toISOString()) // 未过期
  .single();

// ❌ 不好的代码
const d = await s.from('v').select('*').eq('p', phone);
```

**日志规范**:
```javascript
// ✅ 使用表情符号标记日志级别
console.log('✅ [模块] 操作成功');
console.error('❌ [模块] 操作失败:', error);
console.warn('⚠️ [模块] 警告信息');
console.log('📝 [模块] 普通信息');
```

---

### 第五条：安全与隐私 🔐

**⚠️ 血的教训：必须避免的安全事故**

> **事故案例**: 2026-01-09 GitHub API Key 泄露事故
> - **问题**: 代码中硬编码了 Supabase API Keys，`.env.example` 包含真实密钥
> - **影响**: Keys 暴露在 GitHub 公开仓库，任何人都可以看到
> - **处理**: 紧急修复代码、重新生成 Keys、推送更新
> - **复盘**: [完整事故报告](./docs/security-incidents/20260109-github-api-key-leak.md)
> - **教训**: 永远不要在代码中硬编码敏感信息！

**绝对禁止**:
1. **密钥泄露**: Service Role Key、Access Key Secret 不能暴露在客户端代码中 🔴
2. **明文密码**: 不存储任何密码（本项目就没有密码）
3. **敏感日志**: 日志中不能包含手机号、验证码等敏感信息
4. **SQL 注入**: 使用参数化查询，防止 SQL 注入
5. **硬编码 Keys**: 代码中永远不能硬编码任何 API Key、密码、Token 🔴

**密钥管理**:
- **Service Role Key**: 仅在服务端使用（Edge Function、Electron 主进程）
- **Anon Key**: 可以在客户端使用，但受 RLS 限制
- **Access Key Secret**: 仅存储在 Supabase Secrets 中
- **用户 API Key**: 仅存储在用户本地（localStorage），不上传云端
- **环境变量**: 所有敏感信息必须通过环境变量配置（`.env` 文件）

**代码规范**:
```javascript
// ❌ 错误：硬编码 API Key
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ✅ 正确：使用环境变量
const API_KEY = import.meta.env.VITE_API_KEY;
```

**配置文件规范**:
```bash
# ❌ 错误：.env.example 包含真实 Keys
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ 正确：.env.example 使用占位符
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**检查清单**:
- [ ] 代码中没有硬编码的密钥、密码、Token 🔴 **必须检查**
- [ ] `.env.example` 只包含占位符，不包含真实数据 🔴 **必须检查**
- [ ] Git 提交前检查是否有敏感信息 🔴 **必须检查**
- [ ] `.env` 文件在 `.gitignore` 中 🔴 **必须检查**
- [ ] 日志输出不包含敏感信息
- [ ] 运行 `git diff --cached | grep -i "key\|secret\|token\|password"` 扫描

**提交前检查命令**:
```bash
# 每次提交前必须运行这些命令
git diff --cached | grep -i "key\|secret\|token\|password"
git diff --cached | grep "eyJ"  # JWT token 检测
git status  # 确认 .env 不会被提交
```

---

### 第六条：测试与验证 ✅

**要求**:
1. **自测**: 代码修改后，必须自己先测试
2. **完整流程**: 测试要覆盖完整的使用流程
3. **边界情况**: 测试要考虑异常情况
4. **回归测试**: 修改后确认没有破坏原有功能

**测试重点**:
- **登录流程**: 游客模式 → 发送验证码 → 登录 → 数据合并
- **对话功能**: 创建对话 → 发送消息 → 流式响应 → 保存
- **文件操作**: 点击路径 → 打开文件/目录
- **错误处理**: 网络错误、数据库错误、权限错误

**测试清单**:
```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器 DevTools，查看控制台

# 3. 测试登录流程
# - 游客发送消息
# - 点击登录
# - 输入手机号
# - 发送验证码
# - 验证码登录
# - 检查游客数据是否合并

# 4. 测试对话功能
# - 创建新对话
# - 发送消息
# - 查看流式响应
# - 刷新页面，数据是否保留

# 5. 测试文件路径点击
# - 让AI返回包含路径的回答
# - 点击路径
# - 检查是否打开
```

---

### 第七条：Git 提交规范 📝

**提交信息格式**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构（不改变功能）
- `docs`: 文档更新
- `style`: 代码格式调整
- `test`: 测试相关
- `chore`: 构建、工具相关

**示例**:
```bash
# 新功能
git commit -m "feat(login): 使用纯数据库方案替代 Supabase Auth"

# 修复 bug
git commit -m "fix(login): 修复 supabaseAdmin 未定义错误"

# 文档更新
git commit -m "docs: 更新登录系统文档"

# 重构
git commit -m "refactor(cloudService): 优化验证码验证逻辑"
```

**提交前检查**:
- [ ] 已更新 MEMORY.md
- [ ] 已更新 docs/ 文档
- [ ] 已通过本地测试
- [ ] 没有敏感信息
- [ ] 代码已格式化
- [ ] 没有调试用的 console.log

---

### 第八条：沟通与协作 🤝

**多人协作规范**:
1. **先读后写**: 开发前先读 `MEMORY.md` 和相关文档
2. **标注状态**: 正在开发的功能要在 MEMORY.md 中标注"开发中"
3. **及时同步**: 完成后立即更新文档和 Memory
4. **尊重决策**: 理解之前的技术决策，不要轻易推翻

**沟通机制**:
- **重大决策**: 在 MEMORY.md 中记录决策原因和讨论过程
- **技术争议**: 记录不同方案和最终选择的原因
- **废弃方案**: 说明为什么废弃，避免重复踩坑

**AI 协作提示**:
```
如果你是 AI 助手，在开始工作前：
1. 告诉用户："我先阅读 MEMORY.md 了解项目状态"
2. 读取 MEMORY.md
3. 告诉用户："我已了解项目历史，现在开始工作"
4. 工作完成后，更新 MEMORY.md
5. 更新相关文档
6. 告诉用户："工作已完成，已更新文档"
```

---

### 第九条：持续改进 🔄

**定期回顾**:
1. **每月回顾**: 检查文档是否过时
2. **版本总结**: 每个版本发布后，总结经验教训
3. **技术债务**: 记录需要重构的代码
4. **性能优化**: 定期检查性能瓶颈

**改进方向**:
- 简化代码复杂度
- 提升用户体验
- 优化性能
- 增强安全性
- 完善文档

---

### 第十条：代码审查流程 👀

**提交前自查**:
1. **功能完整**: 功能是否完整实现，没有TODO
2. **测试通过**: 所有测试用例是否通过
3. **文档更新**: MEMORY.md 和 docs/ 文档是否已更新
4. **代码质量**: 代码是否清晰、有注释、有日志
5. **安全检查**: 没有密钥泄露、敏感信息

**Code Review 检查点**:
- [ ] 代码逻辑是否正确
- [ ] 是否有性能问题
- [ ] 错误处理是否完善
- [ ] 是否符合产品约束（无密码、无Email）
- [ ] 文档是否准确

**审查流程**:
```
开发者完成 → 自查 → 提交 PR → 团队 Review → 修改 → 通过 → 合并
```

---

### 第十一条：版本发布规范 🚀

**版本号规则** (语义化版本):
- **主版本**: 重大架构变更，不兼容的修改 (例: 2.0.0)
- **次版本**: 新功能，向后兼容 (例: 2.6.0)
- **修订号**: Bug 修复，小的改进 (例: 2.6.3)

**发布前检查**:
- [ ] 所有功能已测试
- [ ] 文档已更新
- [ ] MEMORY.md 已记录
- [ ] 版本号已同步更新：
  - `package.json`
  - `electron/main.js`
  - `src/components/Sidebar.jsx`
  - `src/components/SettingsModal.jsx`

**发布流程**:
```bash
# 1. 更新版本号
npm version patch/minor/major

# 2. 构建
npm run dist:mac

# 3. Git 提交
git add .
git commit -m "chore: 发布 v2.6.4"
git push

# 4. 创建标签
git tag -a v2.6.4 -m "版本说明"
git push origin v2.6.4

# 5. 创建 GitHub Release
gh release create v2.6.4 \
  --title "小白AI v2.6.4" \
  --notes "更新内容" \
  xiaobai-ai-2.6.4.dmg \
  xiaobai-ai-2.6.4-arm64.dmg \
  latest-mac.yml

# 6. 更新 MEMORY.md
```

**更新内容模板**:
```markdown
## ✨ 新功能
- 功能1
- 功能2

## 🐛 Bug 修复
- 修复xxx问题

## 🎨 优化
- 优化xxx性能

## 📝 文档
- 更新xxx文档
```

---

### 第十二条：性能要求 ⚡

**响应时间要求**:
- 登录: < 3秒
- 发送消息: < 1秒（开始流式响应）
- 加载对话历史: < 2秒（10个对话）
- 文件路径点击: < 500ms

**性能优化检查**:
- [ ] 没有不必要的重渲染
- [ ] 图片已压缩（如果有）
- [ ] 大列表使用虚拟化（如果需要）
- [ ] 数据库查询已优化（有索引）
- [ ] 没有内存泄漏

**性能测试工具**:
```javascript
// 测试渲染性能
console.time('渲染时间');
// ... 渲染代码
console.timeEnd('渲染时间');

// 测试API响应
console.time('API调用');
await api.call();
console.timeEnd('API调用');
```

**性能瓶颈排查**:
- 使用 Chrome DevTools Performance 面板
- 使用 React DevTools Profiler
- 检查数据库查询日志

---

### 第十三条：兼容性要求 💻

**操作系统支持**:
- **macOS**: 11.0+ (Big Sur 及以上)
- **Windows**: 10/11
- **Linux**: Ubuntu 20.04+, Debian 11+ (计划中)

**Node.js 版本**:
- 开发: v18.x (LTS)
- 构建: v18.x (LTS)

**浏览器内核**:
- 使用 Electron 内置 Chromium
- 不需要考虑浏览器兼容性

**分辨率支持**:
- 最低: 1280×720
- 推荐: 1920×1080
- Retina 屏幕适配

**兼容性测试**:
- [ ] 在 macOS Intel 测试
- [ ] 在 macOS Apple Silicon 测试
- [ ] 在 Windows 10/11 测试（如果有）

**降级处理**:
- API 不可用时的降级方案
- 网络错误时的友好提示
- 不支持的系统版本提示

---

### 第十四条：敏感信息记录 🔑

**要求**:
1. **自动记录**: 用户交流中反馈的任何敏感信息，必须立即记录到全局 `key.md`
2. **记录位置**: `~/Downloads/同步空间/Claude code/key.md` (多电脑通用)
3. **记录范围**: API Key、Token、密码、AccessKey、Secret 等
4. **记录格式**: 按项目分类，清晰标注用途、来源、时间

**必须记录的信息**:
- 用户提供的 API Key（任何服务）
- 用户提供的 Token（认证令牌）
- 用户提供的密码（如果有）
- Access Key ID/Secret（云服务）
- 数据库连接字符串
- 任何可用于身份认证的敏感信息

**记录模板**:
```markdown
## [服务名称] - [用途]

**类型**: API Key / Token / AccessKey / 其他
**用途**: [具体说明]
**来源**: [用户反馈 / 配置文件 / 其他]
**时间**: YYYY-MM-DD

**敏感信息**:
\`\`\`
[实际的 key 或 token]
\`\`\`

**注意事项**:
- [使用限制]
- [有效期]
- [其他重要信息]
```

**执行时机**:
- 用户在对话中提供任何敏感信息时
- 发现新的配置文件中有敏感信息时
- 测试时用户提供临时凭据时

**安全原则**:
- ✅ 记录到全局 `key.md` 文件（`~/Downloads/同步空间/Claude code/key.md`）
- ✅ 按项目分类管理
- ✅ 不要提交到 Git 仓库（全局文件已在 `.gitignore` 中）
- ❌ 不要在对话中重复展示完整敏感信息
- ❌ 不要在代码中硬编码

---

### 第十五条：版本号管理 🚀

**核心原则**: 每次修改都必须更新版本号，无例外

**必须更新版本号的情况**:
1. **新功能**: 任何新功能添加（minor 版本）
2. **Bug 修复**: 任何 bug 修复（patch 版本）
3. **重构**: 代码重构（patch 版本）
4. **配置变更**: 任何配置文件修改（patch 版本）
5. **依赖更新**: 依赖包版本升级（patch 版本）

**版本号规则** (语义化版本):
- **主版本 (Major)**: 重大架构变更，不兼容的修改 (例: 2.0.0 → 3.0.0)
- **次版本 (Minor)**: 新功能，向后兼容 (例: 2.6.3 → 2.7.0)
- **修订号 (Patch)**: Bug 修复、小的改进 (例: 2.6.3 → 2.6.4)

**必须同步更新的位置**:
```bash
# 1. package.json
"version": "2.6.4"

# 2. electron/main.js
app.getVersion() 返回的版本号
const APP_VERSION = '2.6.4';

# 3. src/components/Sidebar.jsx
<span className="version">v2.6.4</span>

# 4. src/components/SettingsModal.jsx
<span className="version">v2.6.4</span>
```

**更新流程**:
```bash
# 1. 手动更新版本号（4个位置）
# 2. 提交代码
git add .
git commit -m "feat: 新功能 (v2.6.4)"
git push

# 3. （可选）创建 Git 标签
git tag -a v2.6.4 -m "版本说明"
git push origin v2.6.4
```

**检查清单**:
- [ ] package.json 版本号已更新
- [ ] electron/main.js 版本号已更新
- [ ] Sidebar.jsx 版本号已更新
- [ ] SettingsModal.jsx 版本号已更新
- [ ] 所有版本号一致
- [ ] MEMORY.md 已记录本次变更

**常见错误**:
- ❌ 修改了代码但忘记更新版本号
- ❌ 只更新了部分文件的版本号
- ❌ 版本号不一致（package.json 是 2.6.4，但 main.js 是 2.6.3）

**正确示例**:
```javascript
// ✅ 正确：修复 bug 后更新版本号
// 修复登录失败问题
// v2.6.3 → v2.6.4

// ❌ 错误：修复 bug 但忘记更新版本号
// 修复登录失败问题
// 版本号仍是 v2.6.3（错误！）
```

**版本号查询**:
```bash
# 查看当前版本号
grep "version" package.json
grep "APP_VERSION" electron/main.js
grep "version" src/components/Sidebar.jsx
```

**版本号发布**:
- 开发阶段：每次修改都更新版本号
- 发布阶段：创建 GitHub Release 时使用对应版本标签
- 生产环境：确保版本号与 Git 标签一致

---

### 第十六条：数据库变更规范 💾

**核心原则**: 每次数据库结构变更都必须有详细的迁移文件和记录

**要求**:
1. **必须创建迁移文件**: 所有数据库变更必须通过 SQL 迁移文件
2. **详细的变更说明**: 迁移文件必须包含变更原因、影响范围、回滚方案
3. **英文命名**: 迁移文件使用时间戳 + 英文描述
4. **记录到更新日志**: 重大变更必须记录到 `docs/09-更新日志.md`
5. **测试通过**: 在生产环境应用前，必须先在测试环境验证

**迁移文件命名规范**:
```bash
# 格式: YYYYMMDD_描述.sql
✅ 20260107_add_user_info_table.sql
✅ 20260107_add_device_id_column.sql
✅ 20260107_fix_rls_policies.sql
❌ 添加用户表.sql
❌ add_table.sql (缺少时间戳)
```

**迁移文件模板**:
```sql
-- ============================================
-- 变更标题: 添加用户信息表
-- 变更原因: 需要存储 AI 记住的个人信息
-- 影响范围: 新增表，不影响现有功能
-- 变更时间: 2026-01-07
-- 作者: Claude Code + 晓力
-- 向后兼容: 是
-- ============================================

-- 1. 创建新表
CREATE TABLE IF NOT EXISTS user_info (
  id INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID,
  device_id VARCHAR(64),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, device_id)
);

-- 2. 创建索引
CREATE INDEX idx_user_info_user_id ON user_info(user_id);
CREATE INDEX idx_user_info_device_id ON user_info(device_id);

-- 3. 添加注释
COMMENT ON TABLE user_info IS '用户信息表：存储 AI 记住的个人信息';
COMMENT ON COLUMN user_info.content IS '用户信息内容（JSON 格式）';

-- ============================================
-- 回滚方案（如需回滚，执行以下 SQL）
-- ============================================
-- DROP TABLE IF EXISTS user_info CASCADE;
```

**迁移文件存放位置**:
```
supabase/migrations/
├── 001_create_conversations.sql
├── 002_fix_user_profiles.sql
├── 003_add_device_id.sql
├── 004_fix_rls_policies.sql
├── 005_fix_rls_recursion.sql
├── 006_allow_null_user_id.sql
├── 007_auto_confirm_email.sql
├── 20260107_add_user_info_and_memory.sql
└── [新增迁移文件...]
```

**应用迁移流程**:
```bash
# 1. 创建迁移文件
cd /Users/shawn/Downloads/小白AI
nano supabase/migrations/20260107_new_feature.sql

# 2. 本地测试（如果有本地 Supabase）
supabase db reset

# 3. 推送到生产环境
# 方式1: Supabase CLI
supabase db push

# 方式2: 手动执行
# 在 Supabase Dashboard → SQL Editor 中执行迁移文件

# 4. 验证结果
# 在 Supabase Dashboard → Table Editor 中检查表结构
```

**数据库变更类型**:

| 变更类型 | 示例 | 风险等级 | 是否需要回滚方案 |
|---------|------|---------|----------------|
| 新增表 | `CREATE TABLE` | 低 | 否 |
| 新增字段 | `ALTER TABLE ... ADD COLUMN` | 中 | 是 |
| 修改字段 | `ALTER TABLE ... ALTER COLUMN` | 高 | 是 |
| 删除字段 | `ALTER TABLE ... DROP COLUMN` | 高 | 是 |
| 删除表 | `DROP TABLE` | 高 | 是 |
| 添加索引 | `CREATE INDEX` | 低 | 否 |
| 修改数据 | `UPDATE/DELETE` | 高 | 是（先备份） |

**变更检查清单**:
- [ ] 已创建迁移文件（格式正确）
- [ ] 迁移文件包含详细注释（原因、影响、回滚）
- [ ] 文件名使用英文（时间戳_描述.sql）
- [ ] 已在测试环境验证
- [ ] 已准备回滚方案（高风险变更）
- [ ] 已更新 `docs/03-数据库设计.md`
- [ ] 已记录到 `docs/09-更新日志.md`
- [ ] 已在 MEMORY.md 中记录决策原因

**常见错误**:
- ❌ 直接在 Supabase Dashboard 修改表结构，没有迁移文件
- ❌ 迁移文件没有注释，不知道为什么修改
- ❌ 使用中文文件名
- ❌ 修改生产环境前没有测试
- ❌ 删除数据前没有备份
- ❌ 没有准备回滚方案

**正确示例**:
```sql
-- ✅ 好的迁移文件
-- 变更原因: 游客模式需要 device_id 字段
-- 影响范围: conversations 表，所有对话相关查询
-- 向后兼容: 是，device_id 可为 NULL
ALTER TABLE conversations ADD COLUMN device_id TEXT;

-- ❌ 不好的迁移文件
ALTER TABLE conversations ADD COLUMN device_id TEXT;
-- （没有任何注释，不知道为什么加这个字段）
```

**相关文档**:
- `docs/03-数据库设计.md` - 数据库表结构和设计
- `docs/09-更新日志.md` - 版本更新记录
- `supabase/migrations/` - 所有迁移文件

---

### 第十七条：UI样式一致性规范 🎨

**核心原则**: 新增功能或弹窗必须保持与整体UI风格的一致性

**要求**:
1. **视觉统一**: 所有新增的UI组件必须遵循现有的设计语言
2. **复用优先**: 优先使用现有组件，不要重复造轮子
3. **样式规范**: 遵循统一的颜色、字体、间距、圆角等规范
4. **交互一致**: 交互行为（悬停、点击、禁用等）要与现有组件保持一致

**小白AI设计规范**:

| 设计元素 | 规范 | 示例 |
|---------|------|------|
| **主题色** | 绿色系（#22c55e / #16a34a） | 按钮、链接、高亮 |
| **背景色** | 白色/浅灰（#ffffff / #f9fafb） | 主背景、次背景 |
| **文字色** | 深灰/黑色（#1f2937 / #111827） | 标题、正文 |
| **边框色** | 浅灰（#e5e7eb / #d1d5db） | 分割线、边框 |
| **圆角** | 8px / 12px | 卡片、按钮 |
| **阴影** | 轻微阴影（0 1px 3px rgba(0,0,0,0.1)） | 弹窗、悬浮元素 |
| **间距** | 8px 倍数（8px / 16px / 24px / 32px） | padding / margin |
| **字体** | 系统默认字体栈 | `-apple-system, BlinkMacSystemFont, "Segoe UI"` |

**弹窗设计规范**:
```css
/* 标准弹窗样式 */
.modal-overlay {
  background-color: rgba(0, 0, 0, 0.5);  /* 半透明遮罩 */
  backdrop-filter: blur(4px);              /* 背景模糊 */
}

.modal-content {
  background-color: #ffffff;              /* 白色背景 */
  border-radius: 12px;                     /* 12px圆角 */
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);  /* 柔和阴影 */
  padding: 24px;                           /* 24px内边距 */
  max-width: 500px;                        /* 最大宽度 */
}

.modal-header {
  font-size: 18px;                         /* 标题字号 */
  font-weight: 600;                        /* 标题字重 */
  color: #111827;                          /* 标题颜色 */
  margin-bottom: 16px;                     /* 下边距 16px */
}

.modal-button {
  background-color: #22c55e;               /* 主题绿色 */
  border-radius: 8px;                      /* 8px圆角 */
  padding: 10px 20px;                      /* 按钮内边距 */
  font-weight: 500;                        /* 按钮字重 */
  transition: all 0.2s;                    /* 过渡动画 */
}

.modal-button:hover {
  background-color: #16a34a;               /* 悬停时深绿色 */
}
```

**按钮样式规范**:
```css
/* 主要按钮 */
.btn-primary {
  background-color: #22c55e;
  color: #ffffff;
  border-radius: 8px;
  padding: 10px 20px;
}

/* 次要按钮 */
.btn-secondary {
  background-color: #f3f4f6;
  color: #1f2937;
  border-radius: 8px;
  padding: 10px 20px;
}

/* 危险按钮 */
.btn-danger {
  background-color: #ef4444;
  color: #ffffff;
  border-radius: 8px;
  padding: 10px 20px;
}
```

**检查清单**:
- [ ] 颜色使用了主题绿色系（#22c55e / #16a34a）
- [ ] 圆角统一为 8px（小）或 12px（大）
- [ ] 间距使用 8px 的倍数
- [ ] 字体使用系统默认字体栈
- [ ] 阴影与现有组件一致
- [ ] 弹窗有遮罩层（rgba(0,0,0,0.5)）
- [ ] 按钮有悬停和点击效果
- [ ] 响应式设计（适配不同屏幕尺寸）
- [ ] 参考了至少 2 个现有组件

**常见错误**:
- ❌ 使用鲜艳的蓝色、红色等非主题色
- ❌ 圆角大小不一致（有的 4px，有的 16px）
- ❌ 间距随意（7px、13px 等非 8px 倍数）
- ❌ 弹窗没有遮罩或遮罩不透明
- ❌ 按钮没有悬停效果
- ❌ 完全自定义样式，不参考现有组件
- ❌ 字体大小随意（11px、13px 等非标准值）

**正确示例**:
```jsx
// ✅ 好的弹窗 - 遵循设计规范
function NewFeatureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新功能</h3>
        </div>
        <div className="modal-body">
          <p>功能内容...</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// ❌ 不好的弹窗 - 不遵循设计规范
function BadModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{ background: '#000' }}>  {/* 遮罩不透明 */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',             {/* 圆角过大 */}
        padding: '15px'                    {/* 间距不是 8px 倍数 */}
      }}>
        <h3 style={{ color: 'blue' }}>     {/* 非主题色 */}
          新功能
        </h3>
        <button style={{
          background: 'red',               {/* 非主题色 */}
          borderRadius: '5px'              {/* 圆角不一致 */}
        }}>
          确定
        </button>
      </div>
    </div>
  );
}
```

**参考组件**:
- `src/components/SettingsModal.jsx` - 标准弹窗样式
- `src/components/Sidebar.jsx` - 侧边栏样式
- `src/components/ChatInput.jsx` - 输入框样式
- `src/styles/common.css` - 通用样式定义

**设计工具**:
- 使用浏览器 DevTools 检查现有组件的样式
- 参考 CSS 变量（如果有定义）
- 保持与 Figma/Sketch 设计稿一致（如果有）

**相关文档**:
- 现有组件代码：`src/components/`
- 通用样式：`src/styles/common.css`
- Tailwind 配置：`tailwind.config.js`（如果使用）

---

## 🎯 开发流程检查清单

### 开始开发前
- [ ] 阅读 `MEMORY.md`
- [ ] 阅读相关文档（`docs/`）
- [ ] 理解产品约束（无密码、无Email）
- [ ] 确认技术方案（不要重复造轮子）

### 开发过程中
- [ ] 遵循代码质量标准
- [ ] 添加必要的注释和日志
- [ ] 注意安全和隐私
- [ ] 边开发边测试

### 开发完成后
- [ ] 更新 `MEMORY.md`
- [ ] 更新 `docs/` 相关文档
- [ ] 记录敏感信息到全局 `key.md`（如果有）
- [ ] 更新版本号（4个位置）
- [ ] 运行完整测试
- [ ] 提交代码（遵循 Git 规范）
- [ ] 告诉团队成员（如果是协作）

---

## ⚠️ 违规处理

**轻微违规**:
- 忘记更新文档 → 友善提醒，补充更新
- 代码风格不一致 → Code Review 指出，要求修改

**严重违规**:
- 泄露密钥 → 立即撤销密钥，重新生成
- 破坏性修改 → 回滚代码，重新规划
- 不读 Memory 就开发 → 拒绝合并，要求重做

---

## 📋 快速参考

**必读文件**:
1. `MEMORY.md` - 项目历史和变更记录
2. `DEVELOPMENT_GUIDELINES.md` - 本文件（开发规范）
3. `docs/README.md` - 文档导航
4. 全局 `key.md` - 敏感信息记录（`~/Downloads/同步空间/Claude code/key.md`）

**核心约束**:
- 无密码、无Email
- 游客友好
- 简单原则

**技术栈**:
- React + Vite + Electron
- Supabase (PostgreSQL)
- Claude Agent SDK

---

**最后更新**: 2026-01-07
**版本**: v1.0
**状态**: 生效中

---

**声明**: 本开发规范由晓力制定，所有参与小白AI项目的开发者（包括AI助手）必须遵守。
