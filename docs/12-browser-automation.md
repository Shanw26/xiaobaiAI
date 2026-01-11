# 浏览器自动化功能文档

## 📖 功能概述

小白AI v2.20.8 新增浏览器自动化功能，用户可以通过对话让 AI 自动操作浏览器，实现网页访问、搜索、点击、截图等操作。

## ✨ 核心特性

### 1. 智能浏览器检测
- **自动检测系统默认浏览器**
- 支持 Chrome、Edge、Safari、Firefox
- 跨平台兼容（macOS/Windows/Linux）

### 2. 零配置
- 使用系统已安装的浏览器
- 无需下载额外的 Chromium
- 开箱即用

### 3. 智能降级策略
```
检测系统默认浏览器
  ↓ 不支持
检测已安装的浏览器
  ↓ 无浏览器
提示用户安装支持的浏览器
```

### 4. 自动重试机制
- 浏览器意外关闭时自动重启
- 操作失败时自动重试
- 确保任务完成

## 🛠️ 可用工具

| 工具名 | 功能 | 使用示例 |
|--------|------|----------|
| `browser_open` | 打开指定网址 | "打开百度" |
| `browser_search` | 搜索引擎搜索 | "搜索芦笋" |
| `browser_click` | 点击页面元素 | "点击第一个搜索结果" |
| `browser_screenshot` | 网页截图 | "截图给我看看" |
| `browser_close` | 关闭浏览器 | "关闭浏览器" |
| `browser_info` | 查看页面信息 | "现在是什么网页" |

## 💡 使用场景

### 场景 1：快速搜索
```
用户：帮我搜索"Playwright 教程"

小白AI：
⏺ 分析问题
  用户要搜索 Playwright 教程

⏺ 执行方案
  调用：browser_search 工具

⏺ 完成！
  ✅ 搜索完成
  搜索关键词：Playwright 教程
  搜索引擎：baidu
```

### 场景 2：访问特定网站
```
用户：打开我的博客

小白AI：
⏺ 分析问题
  用户要访问博客网站

⏺ 执行方案
  调用：browser_open 工具

⏺ 完成！
  ✅ 浏览器已打开
  网页标题：我的博客
  网页地址：`https://example.com`
```

### 场景 3：搜索并点击
```
用户：搜索"芦笋提词器"并点击第一个结果

小白AI：
⏺ 分析问题
  搜索并点击第一个结果

⏺ 执行方案
  1. 调用：browser_search 工具
  2. 调用：browser_click 工具

⏺ 完成！
  ✅ 搜索完成
  ✅ 已点击元素
  选择器：`.result a`
```

## 🔧 技术架构

### 文件结构
```
小白AI/
├── electron/
│   ├── browser-detector.js      # 浏览器检测模块
│   ├── browser-automation.js     # 浏览器自动化封装
│   └── agent.js                  # AI Agent（包含工具定义）
├── test-browser-automation.js    # 功能测试脚本
└── docs/
    └── 12-browser-automation.md  # 本文档
```

### 核心类：BrowserManager

```javascript
class BrowserManager {
  // 单例模式，全局唯一实例
  static getInstance()

  // 初始化浏览器
  async initialize()

  // 打开网页
  async openUrl(url)

  // 搜索
  async search(query, searchEngine)

  // 点击元素
  async clickElement(selector)

  // 截图
  async screenshot(options)

  // 获取页面信息
  async getPageInfo()

  // 关闭浏览器
  async close()

  // 检查是否已打开
  isOpen()
}
```

### 浏览器检测流程

```javascript
// macOS 示例
async function detectMacOSBrowser() {
  // 1. 尝试读取系统默认浏览器
  const defaultBrowser = readSystemDefault();

  if (defaultBrowser) return defaultBrowser;

  // 2. 检查已安装的浏览器（按优先级）
  const browsers = [
    { path: '/Applications/Safari.app', channel: 'webkit' },
    { path: '/Applications/Google Chrome.app', channel: 'chrome' },
    { path: '/Applications/Microsoft Edge.app', channel: 'msedge' },
    { path: '/Applications/Firefox.app', channel: 'firefox' },
  ];

  for (const browser of browsers) {
    if (await fs.access(browser.path)) {
      return browser.channel;
    }
  }

  return null;
}
```

### 工具定义示例

```javascript
{
  name: 'browser_click',
  description: '点击页面上的元素（如链接、按钮等）...',
  input_schema: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器（如：.result a）',
      },
    },
    required: ['selector'],
  },
}
```

## 🎯 常用 CSS 选择器

### 百度搜索结果
```css
.result a           /* 第一个搜索结果 */
.result:nth-child(2) a   /* 第二个搜索结果 */
```

### Google 搜索结果
```css
div#search a        /* 第一个搜索结果 */
div.g a              /* 所有搜索结果 */
```

### 通用元素
```css
button              /* 按钮 */
.btn                /* class 为 btn 的元素 */
#submit             /* id 为 submit 的元素 */
a[href*="xxx"]      /* 链接包含 xxx */
```

## ⚠️ 注意事项

### 1. 浏览器要求
用户系统需安装以下浏览器之一：
- **macOS**：Safari（系统自带）、Chrome、Edge、Firefox
- **Windows**：Chrome、Edge、Firefox
- **Linux**：Chrome、Edge、Firefox

### 2. 网络要求
- 需要网络连接访问网页
- 部分网站可能有反爬虫限制

### 3. 选择器准确性
- CSS 选择器必须准确
- 错误的选择器会导致点击失败
- 可先截图查看页面结构

### 4. 资源管理
- 浏览器会占用系统资源
- 建议使用完毕后关闭浏览器
- 系统会自动重试失败的请求

## 🧪 测试

### 运行测试脚本
```bash
cd /Users/shawn/Downloads/小白AI
node test-browser-automation.js
```

### 测试覆盖
1. ✅ 浏览器检测
2. ✅ 初始化浏览器
3. ✅ 打开网页
4. ✅ 获取页面信息
5. ✅ 网页截图
6. ✅ 搜索功能
7. ✅ 点击元素
8. ✅ 关闭浏览器

## 📊 性能指标

- **依赖体积**：约 15-20 MB（Playwright 核心库）
- **启动时间**：2-5 秒（取决于浏览器）
- **操作响应**：通常 < 1 秒
- **内存占用**：约 100-200 MB（取决于浏览器）

## 🔐 安全说明

### 1. 隐私保护
- 浏览器在用户系统运行
- AI 无法获取浏览器内的敏感数据（如密码）
- 截图保存在系统临时目录

### 2. 网站访问
- 遵守目标网站的 robots.txt
- 不要用于恶意爬虫
- 遵守法律法规

### 3. 权限管理
- 只在用户明确请求时操作浏览器
- 用户随时可以关闭浏览器
- 操作过程完全可见

## 🐛 故障排查

### 问题 1：浏览器无法启动
**症状**：提示"未检测到支持的浏览器"
**解决**：安装 Chrome/Edge/Safari/Firefox

### 问题 2：点击失败
**症状**：提示"点击元素失败"
**解决**：
- 检查 CSS 选择器是否正确
- 先截图查看页面结构
- 确认元素是否已加载

### 问题 3：浏览器自动关闭
**症状**：浏览器启动后立即关闭
**解决**：
- 系统会自动重试
- 查看日志了解具体原因
- 尝试手动启动浏览器确认可用

## 📈 未来规划

### 近期计划
- [ ] 支持表单填写（browser_fill）
- [ ] 支持等待特定元素（browser_wait）
- [ ] 支持滚动页面（browser_scroll）

### 中期计划
- [ ] 支持多标签页管理
- [ ] 支持浏览器历史记录
- [ ] 支持下载文件

### 长期规划
- [ ] 支持更复杂的交互流程
- [ ] 支持视频播放控制
- [ ] 支持文件上传

## 📝 更新日志

### v2.20.8 (2026-01-11)
- ✅ 新增浏览器自动化功能
- ✅ 6 个核心工具
- ✅ 智能浏览器检测
- ✅ 自动重试机制
- ✅ 完整的测试覆盖

---

**文档版本**：v1.0.0
**最后更新**：2026-01-11
**维护者**：晓力
