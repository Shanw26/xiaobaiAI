# AI 回复规则配置

> **文档目的**: 定义 AI 助手回复用户时的行为准则和格式规范
> **适用版本**: v2.8.0+
> **最后更新**: 2026-01-07
> **维护者**: 晓力

---

## 📋 目录

1. [文件与目录操作](#文件与目录操作)
2. [路径显示规则](#路径显示规则)
3. [回复格式规范](#回复格式规范)
4. [安全原则](#安全原则)
5. [用户体验优化](#用户体验优化)

---

## 文件与目录操作

### 删除操作 ⚠️

**规则**: 删除文件或目录时，**仅移动到回收站**，不永久删除

**实现要求**:
- ✅ 使用系统回收站机制
- ✅ 给用户明确的提示："已移动到回收站"
- ❌ 不使用 `rm -rf` 等永久删除命令
- ❌ 不使用 `fs.unlink()` 直接删除

**技术实现**:
```javascript
// 推荐方式：使用 trash 库
const trash = require('trash');

await trash(['/path/to/file']);
console.log('✅ 已移动到回收站');
```

**用户提示模板**:
```
✅ 已将文件移动到回收站
文件路径：/Users/xxx/Downloads/test.txt
如需恢复，请从回收站还原
```

### 文件读取

**规则**: 读取文件前先确认文件存在且大小合理

**安全限制**:
- 单个文件大小限制：< 10MB
- 总大小限制：< 50MB
- 超过限制时提示用户分段处理

**用户提示模板**:
```
⚠️ 文件较大（15MB），可能影响性能
建议：分段处理或指定读取特定行数
是否继续？
```

### 文件写入

**规则**: 写入前备份原文件（如果存在）

**实现要求**:
- ✅ 检查文件是否存在
- ✅ 如果存在，创建备份（添加 .bak 后缀）
- ✅ 写入失败时提示用户并恢复备份

**备份命名规则**:
```
原文件：config.json
备份文件：config.json.bak
多次备份：config.json.bak.1, config.json.bak.2
```

---

## 路径显示规则

### 真实路径验证 ⭐ v2.8.0

**规则**: AI 回复中包含文件路径时，必须验证路径真实性

**显示规范**:
- ✅ **真实存在**的路径：显示绿色下划线
- ❌ **不存在**的路径：显示普通文本（半透明）
- 📝 路径格式：以 `/` 或 `~/` 开头

**示例**:
```markdown
文件位于 /Users/xxx/Downloads/小白AI/      ← 绿色下划线（可点击）
配置路径 /fake/path/config.yaml             ← 普通文本（不可点击）
```

**技术实现**: 参见 [05-file-path-click.md](./05-file-path-click.md)

### 路径格式规范

**推荐的路径表达方式**:

| 场景 | 格式 | 示例 |
|------|------|------|
| 绝对路径 | `/完整/路径` | `/Users/xxx/Downloads/` |
| 用户目录 | `~/相对/路径` | `~/Desktop/文件.txt` |
| 当前目录 | `./相对/路径` | `./config.json` |
| 上级目录 | `../相对/路径` | `../package.json` |

**避免的格式**:
- ❌ 混用 `\` 和 `/`（统一使用 `/`）
- ❌ 包含多余空格：`/path/ to /file`
- ❌ 未展开的环境变量：`$HOME/file`

---

## 回复格式规范

### 代码块

**规则**: 代码必须使用语法高亮

**格式**:
````markdown
```语言名称
代码内容
```
````

**示例**:
````markdown
```javascript
const greeting = "Hello, World!";
console.log(greeting);
```
````

**常用语言标记**:
- `javascript` / `js` - JavaScript 代码
- `python` / `py` - Python 代码
- `bash` / `sh` - Shell 命令
- `json` - JSON 数据
- `markdown` / `md` - Markdown 文本

### 命令行操作

**规则**: 提供命令行操作时，必须说明预期结果

**格式模板**:
```markdown
### 操作步骤

1. 执行命令：
```bash
npm install
```

**预期结果**:
✅ 安装成功，显示 50+ 个包

**如果失败**:
❌ 检查网络连接和 Node.js 版本
```

### 文件列表

**规则**: 列出多个文件时使用 Markdown 列表

**推荐格式**:
```markdown
📁 项目结构：

```
src/
├── components/
│   ├── Header.jsx
│   └── Footer.jsx
├── utils/
│   └── helpers.js
└── App.jsx
```

或使用列表：

- `src/components/Header.jsx` - 页面头部组件
- `src/components/Footer.jsx` - 页面底部组件
- `src/utils/helpers.js` - 工具函数
```

### 操作结果反馈

**规则**: 每个操作完成后明确反馈结果

**成功反馈**:
```markdown
✅ 操作成功
- 创建了 3 个文件
- 修改了 1 个配置
- 耗时：2.3 秒
```

**失败反馈**:
```markdown
❌ 操作失败：权限不足

**问题**: 无法写入 `/root/config.json`

**解决方案**:
1. 检查文件权限
2. 使用 `sudo` 提升权限
3. 或选择其他位置保存
```

---

## 安全原则

### 敏感操作确认

**规则**: 执行危险操作前必须二次确认

**需要确认的操作**:
- ❌ 删除文件/目录（已改为回收站，但仍需提醒）
- ❌ 修改系统配置
- ❌ 网络请求（上传/下载）
- ❌ 执行Shell命令（特别是 `rm`, `sudo`, `chmod`）

**确认模板**:
```markdown
⚠️ 即将执行以下操作：

操作：删除文件
路径：/Users/xxx/important.txt
方式：移动到回收站（可恢复）

确认执行？请回复 "确认" 或 "取消"
```

### 权限检查

**规则**: 操作前检查权限是否足够

**检查项**:
- [ ] 文件/目录是否可读
- [ ] 文件/目录是否可写
- [ ] 是否需要管理员权限

**权限不足时的提示**:
```markdown
⚠️ 权限不足

**问题**: 无法写入 `/protected/file.txt`
**原因**: 当前用户无写入权限

**建议**:
1. 检查文件权限：`ls -l /protected/file.txt`
2. 联系管理员授权
3. 选择其他位置保存
```

### 数据安全

**规则**: 涉及用户数据时遵循最小必要原则

**数据收集**:
- ❌ 不收集非必要的用户信息
- ✅ 仅收集操作所需的最小数据
- ✅ 明确告知用户数据用途

**数据存储**:
- ✅ 敏感数据加密存储
- ✅ 本地数据库（不上传云端，除非用户同意）
- ✅ 提供数据清除功能

---

## 用户体验优化

### 错误提示

**原则**: 错误提示要清晰、可操作

**错误提示三要素**:
1. **问题**: 发生了什么
2. **原因**: 为什么发生
3. **解决方案**: 如何修复

**示例**:
```markdown
❌ 无法打开文件

**问题**: 找不到文件 "/Users/xxx/missing.txt"
**原因**: 文件可能已被删除或移动

**解决方案**:
1. 检查文件路径是否正确
2. 使用以下命令搜索文件：
   ```bash
   find ~ -name "missing.txt"
   ```
3. 或提供完整的文件路径
```

### 进度提示

**原则**: 长时间操作必须显示进度

**需要进度提示的操作**:
- ⏱️ 超过 3 秒的操作
- 📁 批量文件操作（> 10 个文件）
- 🌐 网络请求（上传/下载）

**进度提示模板**:
```markdown
⏳ 正在处理...

进度：███░░░░░░ 30%
已处理：3/10 个文件
当前：处理 file3.txt
预计剩余：5 秒
```

### 等待动画与反馈 ⭐ v2.8.0

**场景**: AI 需要长时间思考、查阅资料或处理复杂任务

**规则**: 超过 2 秒未响应时，自动显示等待提示

#### 触发条件

- ⏱️ AI 思考时间 > 2 秒
- 📚 需要查阅多个文件
- 🔍 需要搜索大量代码
- 🌐 需要联网查询信息
- ⚙️ 需要执行复杂计算

#### 等待动画类型

**1. 思考中动画**（推荐）

```markdown
# 简洁版
🤔 正在思考中...

# 详细版
🤔 正在分析您的需求...

正在：
- 理解问题背景
- 查找相关文件
- 分析最佳方案

请稍等片刻...
```

**2. 查阅资料动画**

```markdown
# 简洁版
📚 正在查阅资料...

# 详细版
📚 正在查阅相关资料...

已检查：
✅ package.json
✅ README.md
⏳ src/components/Header.jsx
⏳ src/utils/helpers.js

请稍候...
```

**3. 搜索代码动画**

```markdown
🔍 正在搜索代码...

搜索范围：src/
已扫描：150+ 个文件
找到相关代码：3 处

正在分析最佳方案...
```

**4. 联网查询动画**

```markdown
🌐 正在联网查询...

查询内容：最新版本信息
数据源：官方文档
预计剩余：3 秒
```

#### 动画实现建议

**技术方案**:

```javascript
// 1. 检测长时间操作
const [isWaiting, setIsWaiting] = useState(false);
const [waitingType, setWaitingType] = useState('thinking');

useEffect(() => {
  const timer = setTimeout(() => {
    if (!responseReceived) {
      setIsWaiting(true);
      setWaitingType(determineWaitingType());
    }
  }, 2000); // 2 秒后显示等待提示

  return () => clearTimeout(timer);
}, [question]);

// 2. 根据操作类型显示不同动画
const determineWaitingType = () => {
  if (involvesFileSearch()) return 'reading';
  if (involvesComplexAnalysis()) return 'thinking';
  if (involvesNetworkRequest()) return 'network';
  return 'processing';
};

// 3. 渲染等待提示
{isWaiting && (
  <div className="waiting-indicator">
    {waitingType === 'thinking' && <ThinkingAnimation />}
    {waitingType === 'reading' && <ReadingAnimation />}
    {waitingType === 'network' && <NetworkAnimation />}
    {waitingType === 'processing' && <ProcessingAnimation />}
  </div>
)}
```

**CSS 动画示例**:

```css
/* 思考动画：跳跃的点点 */
@keyframes thinking-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
}

.thinking-dot {
  display: inline-block;
  animation: thinking-bounce 1.4s infinite ease-in-out;
}

.thinking-dot:nth-child(1) { animation-delay: -0.32s; }
.thinking-dot:nth-child(2) { animation-delay: -0.16s; }
.thinking-dot:nth-child(3) { animation-delay: 0s; }

/* 查阅资料：旋转的书籍 */
@keyframes reading-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reading-icon {
  animation: reading-spin 2s linear infinite;
}

/* 搜索：脉冲效果 */
@keyframes searching-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

.searching-icon {
  animation: searching-pulse 1.5s ease-in-out infinite;
}

/* 联网：波浪动画 */
@keyframes network-wave {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-5px); }
  75% { transform: translateY(5px); }
}

.network-icon {
  animation: network-wave 1s ease-in-out infinite;
}
```

#### 用户提示层级

**Level 1: 轻度等待（2-5 秒）**

```markdown
🤔 正在思考...
```

**Level 2: 中度等待（5-10 秒）**

```markdown
🤔 正在分析您的问题...

正在：
✓ 理解需求
✓ 查找文件
⏳ 分析方案

请稍候...
```

**Level 3: 长时间等待（> 10 秒）**

```markdown
⏳ 正在处理复杂任务...

当前阶段：深度分析
进度：████░░░░░ 40%
已用时：8 秒
预计剩余：12 秒

💡 提示：这是一个复杂问题，需要仔细分析
```

#### 动态更新策略

**规则**: 每隔 3 秒更新一次提示内容

**示例流程**:

```
0 秒：用户提问
  ↓
2 秒：🤔 正在思考...
  ↓
5 秒：🤔 正在分析您的问题...
      正在：理解需求、查找文件
  ↓
8 秒：📚 正在查阅相关资料...
      已检查：package.json, README.md
      正在：分析代码结构
  ↓
11 秒：🔍 正在搜索最佳方案...
      已扫描：200+ 个文件
      找到相关代码：5 处
  ↓
14 秒：✅ 分析完成，开始回复...
```

#### 避免的提示

❌ **不好的提示**:
```markdown
❌ 正在加载...
❌ 请稍候...
❌ 处理中...
```

**问题**：太笼统，用户不知道在做什么

✅ **好的提示**:
```markdown
✅ 🤔 正在分析您的代码结构...
   已检查：3 个组件
   正在：查找依赖关系
```

**优势**：具体、透明、有信息量

### 操作可逆性

**原则**: 尽可能让操作可逆

**可逆操作**:
- ✅ 删除 → 回收站（可恢复）
- ✅ 重命名 → 保存旧名称
- ✅ 修改文件 → 备份原文件
- ✅ Git 操作 → 提供撤销命令

**不可逆操作警告**:
```markdown
⚠️ 警告：此操作不可逆！

操作：永久删除（跳过回收站）
影响：数据将无法恢复
建议：先备份重要数据

确认执行？请输入 "我知道风险，确认执行"
```

### 智能建议

**原则**: 主动提供有用建议

**建议场景**:
1. **性能优化**: 发现性能瓶颈时建议优化方案
2. **错误预防**: 检测到潜在问题时提前提醒
3. **最佳实践**: 推荐业界最佳实践

**示例**:
```markdown
💡 优化建议

当前项目包含大量图片文件，建议：

1. **压缩图片**：可减少 60-70% 体积
   ```bash
   npm install -g imagemin-cli
   imagemin images/* --out-dir=compressed
   ```

2. **使用 CDN**：提升加载速度
   - 推荐服务商：阿里云 OSS、腾讯云 COS
   - 预计提升：加载速度提升 3-5 倍

3. **懒加载**：仅在需要时加载图片
   ```javascript
   const img = new Image();
   img.loading = 'lazy';
   ```

需要我帮你实施哪个优化？
```

---

## 版本历史

### v2.8.0 (2026-01-07)

**新增**:
- ✅ 路径真实性验证规则
- ✅ 真实路径显示绿色下划线
- ✅ 无效路径显示普通文本
- ✅ **等待动画与反馈规则** ⭐
  - 4 种等待动画类型（思考、查阅、搜索、联网）
  - 3 个用户提示层级（轻度/中度/长时间）
  - 动态更新策略（每 3 秒更新）
  - 完整的 CSS 动画实现示例

**优化**:
- ✅ 删除操作改为移动到回收站
- ✅ 文件操作前备份机制

### v2.7.2 (2026-01-07)

**新增**:
- ✅ 路径自动识别和下划线显示
- ✅ 路径点击打开功能

---

## 待添加规则

### 未来计划

- [ ] 网络操作规则（上传/下载）
- [ ] 多文件操作规则（批量重命名、移动）
- [ ] 压缩/解压操作规范
- [ ] Git 操作最佳实践
- [ ] AI 模型选择建议

---

## 如何添加新规则

### 规则添加流程

1. **识别场景**: 发现新的用户交互场景
2. **定义规则**: 明确应该怎么做
3. **技术实现**: 在代码中实现规则
4. **更新文档**: 记录到本文档
5. **测试验证**: 确保规则生效

### 规则模板

```markdown
### [规则名称]

**场景**: 描述触发此规则的场景

**规则**: 明确的行为准则

**实现要求**:
- ✅ 应该做的
- ❌ 不应该做的

**示例**:
具体的代码或回复示例

**版本**: 添加此规则的版本
**日期**: 添加日期
```

---

**最后更新**: 2026-01-07
**下次审查**: 每月审查一次
**反馈**: 如有建议，请提交 Issue 或 PR
