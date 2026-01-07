# 文件路径点击功能

> **适用版本**: v2.6.3+
> **阅读时间**: 10分钟
> **相关文档**: [系统架构](./06-系统架构.md)

---

## 功能概述

在 AI 回答中，如果有涉及本地文件路径的部分，可以：
1. ✅ 自动识别路径
2. ✅ 显示绿色下划线
3. ✅ 点击后打开文件或目录

### 支持的路径格式

- `/Users/shawn/Downloads/文件.txt` - 绝对路径
- `~/Downloads/新年快乐.txt` - 用户目录
- `./relative/path/file.txt` - 相对路径
- 支持中文文件名

---

## 技术实现方案

### 整体流程

```
AI 返回 Markdown
  ↓
ReactMarkdown 解析为 AST
  ↓
remark 插件预处理（检测路径）
  ↓
转换为 link 节点
  ↓
React 渲染为可点击元素
  ↓
用户点击 → Electron 打开文件
```

### 技术栈

- **ReactMarkdown**: Markdown 渲染
- **remark-gfm**: GitHub 风格 Markdown
- **unist-util-visit**: AST 遍历
- **Electron opener**: 打开文件/目录

---

## 核心代码实现

### 1. 文件路径正则表达式

**文件**: `src/components/MarkdownRenderer.jsx`

```javascript
// 支持以下格式:
// /Users/shawn/Downloads/文件.txt
// ~/Downloads/新年快乐.txt
// ./relative/path/file.txt
const FILE_PATH_PATTERN = /(~?\/[a-zA-Z0-9_\-./~\u4e00-\u9fa5]+[a-zA-Z0-9\u4e00-\u9fa5])(?!\w)/g;
```

**正则解析**:

| 部分 | 说明 |
|-----|------|
| `~?` | 可选的波浪号（用户目录） |
| `\/` | 必须以 / 开头 |
| `[a-zA-Z0-9_\-./~\u4e00-\u9fa5]+` | 路径字符（支持中文 `\u4e00-\u9fa5`） |
| `[a-zA-Z0-9\u4e00-\u9fa5]` | 必须以字母或中文结尾 |
| `(?!\w)` | 负向前瞻，后面不能是单词字符 |

**测试用例**:

```javascript
const tests = [
  '/Users/shawn/Downloads/文件.txt',     // ✅ 匹配
  '~/Downloads/新年快乐.txt',             // ✅ 匹配
  './relative/path/file.txt',             // ✅ 匹配
  'https://example.com',                  // ❌ 不匹配
  'not/a/path',                          // ❌ 不匹配
];
```

---

### 2. remark 插件处理

**功能**: 在 AST 层面预处理，将文本中的路径转换为链接节点

```javascript
import { visit } from 'unist-util-visit';

/**
 * remark 插件：检测文件路径并转换为链接
 */
function remarkFilePathLinks() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value) return;

      const parts = [];
      let lastIndex = 0;
      let match;

      // 遍历所有匹配的路径
      FILE_PATH_PATTERN.lastIndex = 0;
      while ((match = FILE_PATH_PATTERN.exec(node.value)) !== null) {
        const [path] = match;
        const matchIndex = match.index;

        // 添加路径前的文本
        if (matchIndex > lastIndex) {
          parts.push({
            type: 'text',
            value: node.value.slice(lastIndex, matchIndex)
          });
        }

        // 创建链接节点
        parts.push({
          type: 'link',
          url: path,
          title: '点击打开',
          children: [{ type: 'text', value: path }],
          data: {
            hProperties: {
              className: 'file-path-link'
            }
          }
        });

        lastIndex = matchIndex + path.length;
      }

      // 添加剩余文本
      if (lastIndex < node.value.length) {
        parts.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }

      // 替换原节点
      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
}
```

**关键点**:
- ✅ 使用 `unist-util-visit` 遍历 AST
- ✅ 在 text 节点中检测文件路径
- ✅ 将路径转换为 link 节点
- ✅ **不在 AST 中添加 onClick**（会导致 DataCloneError）

**常见错误**:

```javascript
// ❌ 错误: 在 AST data 中添加函数
parts.push({
  type: 'link',
  url: path,
  data: {
    hProperties: {
      onClick: () => handleClick(path)  // ❌ DataCloneError
    }
  }
});

// ✅ 正确: 仅添加 className，onClick 在 React 组件中处理
parts.push({
  type: 'link',
  url: path,
  title: '点击打开',
  data: {
    hProperties: {
      className: 'file-path-link'  // ✅ 仅样式类
    }
  }
});
```

---

### 3. React 组件渲染

**文件**: `src/components/MarkdownRenderer.jsx`

```javascript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

function MarkdownRenderer({ content }) {
  /**
   * 处理路径点击
   */
  function handlePathClick(path) {
    console.log('点击路径:', path);

    // URL 解码（重要！）
    const decodedPath = decodeURIComponent(path);
    console.log('解码后路径:', decodedPath);

    // 调用 Electron API 打开文件
    if (window.electronAPI && window.electronAPI.openPath) {
      window.electronAPI.openPath(decodedPath).then(result => {
        if (result.success) {
          console.log('✅ 路径打开成功');
        } else {
          console.error('❌ 打开路径失败:', result.error);
        }
      }).catch(error => {
        console.error('❌ 打开路径失败:', error);
      });
    } else {
      console.error('electronAPI.openPath 不存在');
    }
  }

  /**
   * 自定义链接组件
   */
  const LinkComponent = ({ children, href, title }) => {
    // 检测是否为文件路径
    const isFilePath = href &&
      (href.startsWith('/') || href.startsWith('~')) &&
      title === '点击打开';

    if (isFilePath) {
      // 文件路径：渲染为可点击的 span
      return (
        <span
          className="file-path-link"
          onClick={() => handlePathClick(href)}
          title="点击打开"
        >
          {children}
        </span>
      );
    }

    // 普通链接：渲染为 a 标签
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  };

  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        remarkFilePathLinks  // 自定义插件
      ]}
      components={{
        a: LinkComponent
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;
```

**关键点**:
- ✅ `isFilePath` 判断：检查 href 以 `/` 或 `~` 开头，且 title 为 '点击打开'
- ✅ URL 解码：`decodeURIComponent(href)` 将 `%E6%96%B0%E5%B9%B4` 解码为 `新年`
- ✅ 降级处理：检查 `window.electronAPI` 是否存在

---

### 4. URL 解码的重要性

**问题**: href 属性中的中文会被 URL 编码

```javascript
// 原始路径: ~/Downloads/新年快乐.txt
// href 属性: ~/Downloads/%E6%96%B0%E5%B9%B4%E5%BF%AB%E4%B9%90.txt

// ❌ 错误: 直接使用编码后的路径
window.electronAPI.openPath(href);
// 结果: 找不到文件（路径被编码）

// ✅ 正确: 先解码
const decodedPath = decodeURIComponent(href);
window.electronAPI.openPath(decodedPath);
// 结果: 成功打开文件
```

**URL 编码示例**:

| 字符 | 编码后 |
|-----|-------|
| 新 | %E6%96%B0 |
| 年 | %E5%B9%B4 |
| 快 | %E5%BF%AB |
| 乐 | %E4%B9%90 |
| .txt | .txt (不编码) |

---

### 5. CSS 样式

**文件**: `src/components/MarkdownRenderer.css`

```css
.file-path-link {
  color: #16a34a;                    /* 绿色 */
  text-decoration: underline;
  text-decoration-style: solid;
  text-decoration-color: #16a34a;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  cursor: pointer;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.95em;
  padding: 0 2px;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.file-path-link:hover {
  color: #15803d;                    /* 深绿色 */
  text-decoration-color: #15803d;
  background: rgba(22, 163, 74, 0.1);
}

.file-path-link:active {
  color: #166534;
  background: rgba(22, 163, 74, 0.2);
}
```

**效果**:
- 默认: 绿色文字 + 绿色下划线
- 悬停: 背景浅绿 + 深绿色
- 点击: 背景深绿 + 动画反馈

---

## Electron 主进程处理

### IPC Handler

**文件**: `electron/main.js`

```javascript
const { opener } = require('opener');

/**
 * 打开文件或目录
 */
ipcMain.handle('openPath', async (event, path) => {
  try {
    // 展开用户目录 (~)
    const os = require('os');
    let expandedPath = path;
    if (path.startsWith('~')) {
      expandedPath = path.replace('~', os.homedir());
    }

    // 打开文件或目录
    await opener.open(expandedPath);

    return { success: true };
  } catch (error) {
    console.error('打开路径失败:', error);
    return { success: false, error: error.message };
  }
});
```

**opener 库**:
- 跨平台文件打开工具
- 自动使用系统默认程序
- 支持: 文件、目录、URL

### Preload 暴露

**文件**: `electron/preload.js`

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  openPath: (path) => ipcRenderer.invoke('openPath', path),
  // ... 其他 API
});
```

---

## 完整流程示例

### 场景：AI 回答包含路径

**AI 返回**:
```markdown
我已经创建了文档，文件位置：~/Downloads/新年快乐.txt
```

**处理流程**:

```
1. ReactMarkdown 解析
   type: 'paragraph'
   children: [{
     type: 'text',
     value: '我已经创建了文档，文件位置：~/Downloads/新年快乐.txt'
   }]

2. remarkFilePathLinks 插件处理
   type: 'paragraph'
   children: [
     {type: 'text', value: '我已经创建了文档，文件位置：'},
     {
       type: 'link',
       url: '~/Downloads/新年快乐.txt',
       title: '点击打开',
       children: [{type: 'text', value: '~/Downloads/新年快乐.txt'}],
       data: {hProperties: {className: 'file-path-link'}}
     }
   ]

3. React 渲染
   <p>
     我已经创建了文档，文件位置：
     <span className="file-path-link" onClick={handlePathClick}>
       ~/Downloads/新年快乐.txt
     </span>
   </p>

4. 用户点击
   handlePathClick('~/Downloads/新年快乐.txt')
   → decodeURIComponent()
   → window.electronAPI.openPath('~/Downloads/新年快乐.txt')
   → Electron 主进程
   → opener.open('~/Downloads/新年快乐.txt')
   → 系统打开文件 ✅
```

---

## 常见问题

### Q1: 路径显示红色，不可点击

**原因**: remark 插件未正确处理

**排查**:
```javascript
// 检查正则是否匹配
FILE_PATH_PATTERN.test('~/Downloads/文件.txt');  // 应该返回 true

// 检查插件是否正确导入
import remarkFilePathLinks from './remarkFilePathLinks';
// ✅ 确保在 remarkPlugins 中使用
```

### Q2: 点击后无法打开文件

**原因**: 路径被 URL 编码，未解码

**解决方案**:
```javascript
// ✅ 必须解码
const decodedPath = decodeURIComponent(path);
window.electronAPI.openPath(decodedPath);
```

### Q3: DataCloneError

**错误**: `() => handlePathClick(path) could not be cloned`

**原因**: 在 AST data 中添加了函数

**解决方案**:
```javascript
// ❌ 错误
data: {
  hProperties: {
    onClick: () => handleClick(path)  // 不能序列化
  }
}

// ✅ 正确
data: {
  hProperties: {
    className: 'file-path-link'  // 仅添加 className
  }
}
// 在 React 组件中处理 onClick
```

### Q4: 中文路径无法识别

**原因**: 正则表达式不支持中文

**解决方案**:
```javascript
// ✅ 添加中文 Unicode 范围
const FILE_PATH_PATTERN = /(~?\/[a-zA-Z0-9_\-./~\u4e00-\u9fa5]+[a-zA-Z0-9\u4e00-\u9fa5])(?!\w)/g;
//                                                                  ^^^^^^^^^^^^^ 中文字符
```

---

## 调试技巧

### 1. 测试正则表达式

```javascript
// 在浏览器控制台
const pattern = /(~?\/[a-zA-Z0-9_\-./~\u4e00-\u9fa5]+[a-zA-Z0-9\u4e00-\u9fa5])(?!\w)/g;
const tests = [
  '/Users/shawn/Downloads/文件.txt',
  '~/Downloads/新年快乐.txt',
  'https://example.com'
];

tests.forEach(test => {
  console.log(test, pattern.test(test));
});
```

### 2. 查看 AST

```javascript
// 在 remark 插件中添加日志
visit(tree, 'text', (node, index, parent) => {
  console.log('Text node:', node.value);
  // ...
});
```

### 3. 检查 URL 编码

```javascript
function handlePathClick(path) {
  console.log('原始路径:', path);
  console.log('解码后:', decodeURIComponent(path));
  // ...
}
```

---

## 相关文件

| 文件 | 说明 |
|-----|------|
| `src/components/MarkdownRenderer.jsx` | Markdown 渲染组件 |
| `src/components/MarkdownRenderer.css` | 样式文件 |
| `electron/main.js` | IPC handler |
| `electron/preload.js` | API 暴露 |

---

## 扩展功能

### 支持更多路径格式

```javascript
// 支持Windows路径
const FILE_PATH_PATTERN = /([a-zA-Z]:\\[^\s]+|~?\/[^\s]+)(?!\w)/g;
```

### 自定义打开方式

```javascript
function handlePathClick(path) {
  const decodedPath = decodeURIComponent(path);

  // 检查文件类型
  if (path.endsWith('.pdf')) {
    // 用 PDF 阅读器打开
    window.electronAPI.openWith(decodedPath, 'Preview.app');
  } else {
    // 默认打开
    window.electronAPI.openPath(decodedPath);
  }
}
```

---

**最后更新**: 2026-01-07
**相关文档**: [系统架构](./06-系统架构.md)
