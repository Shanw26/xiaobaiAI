import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { visit } from 'unist-util-visit';
import './MarkdownRenderer.css';

// v2.9.2 - 优化的文件路径正则表达式
// 匹配以下格式的路径：
// 1. 以 / 或 ~/ 开头的绝对路径
// 2. 路径可以包含任意字符（除了空格和特殊字符）
// 3. 路径可以以扩展名、/ 或其他字符结尾
const FILE_PATH_PATTERN = /(\/|~\/)[^\s<>"'`\n]*?(?=[\s<>"'`\n,。！？；：.,!?;:]|$)/g;

// 清理路径末尾的标点符号
function cleanPath(path) {
  // 移除路径末尾的常见标点符号
  return path.replace(/[。、，！？；：.,!?:;'"`()（）【】\[\]{}「」『』>]+$/, '');
}

// 思考过程组件（支持折叠）
function ThinkingProcess({ children }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="thinking-process">
      <div className="thinking-header" onClick={toggle}>
        <span className="thinking-icon">🤔</span>
        <span className="thinking-title">思考过程</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8em' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>
      {isExpanded && (
        <div className="thinking-content">
          {children}
        </div>
      )}
    </div>
  );
}

// remark 插件：预处理文件路径（v2.9.2 - 简化版，不验证路径）
function remarkFilePathLinks() {
  return (tree) => {
    // 处理 inlineCode 节点（路径在反引号中）
    visit(tree, 'inlineCode', (node, index, parent) => {
      if (!node.value) return;

      const codeContent = node.value;

      // 检查是否是文件路径
      if (FILE_PATH_PATTERN.test(codeContent)) {
        const cleanedPath = cleanPath(codeContent);

        // 替换为链接节点
        parent.children[index] = {
          type: 'link',
          url: cleanedPath,
          title: '点击打开',
          children: [{ type: 'text', value: cleanedPath }],
          data: { hProperties: { className: 'file-path-link' } }
        };
      }
      FILE_PATH_PATTERN.lastIndex = 0; // 重置正则
    });

    // 处理 text 节点（路径不在反引号中）
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value) return;

      const text = node.value;
      const parts = [];
      let lastIndex = 0;
      let match;

      // 查找所有文件路径
      FILE_PATH_PATTERN.lastIndex = 0; // 重置正则表达式
      while ((match = FILE_PATH_PATTERN.exec(text)) !== null) {
        let path = match[0];
        const matchIndex = match.index;

        // 清理路径末尾的标点符号
        path = cleanPath(path);

        // 添加路径前的普通文本
        if (matchIndex > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, matchIndex) });
        }

        // 添加文件路径链接
        parts.push({
          type: 'link',
          url: path,
          title: '点击打开',
          children: [{ type: 'text', value: path }],
          data: { hProperties: { className: 'file-path-link' } }
        });

        // 使用清理后的路径长度计算lastIndex
        const originalPath = match[0];
        const trailingPunctuation = originalPath.length - path.length;
        lastIndex = matchIndex + originalPath.length - trailingPunctuation;
      }

      // 添加剩余的普通文本
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      // 如果找到文件路径，替换节点
      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
}

// 处理路径点击
function handlePathClick(path) {
  console.log('点击路径:', path);
  // 解码 URL 编码的路径
  const decodedPath = decodeURIComponent(path);
  console.log('解码后路径:', decodedPath);

  if (window.electronAPI && window.electronAPI.openPath) {
    window.electronAPI.openPath(decodedPath).then(result => {
      if (!result.success) {
        console.error('打开路径失败:', result.error);
      } else {
        console.log('✅ 路径打开成功');
      }
    }).catch(error => {
      console.error('打开路径失败:', error);
    });
  } else {
    console.warn('electronAPI.openPath 不可用');
  }
}

// 文件路径链接组件（v2.9.2 - 使用 React.memo 优化，避免重新渲染）
const FilePathLink = React.memo(function FilePathLink({ children, href }) {
  const handleClick = (e) => {
    e.preventDefault();
    console.log('FilePathLink 点击:', href); // 调试日志
    handlePathClick(href);
  };

  // 直接显示为绿色下划线（不验证路径是否存在）
  return (
    <span
      className="file-path-link"
      onClick={handleClick}
      title="点击打开"
      style={{ cursor: 'pointer' }}
    >
      {children}
    </span>
  );
});

function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkFilePathLinks]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const codeContent = String(children).replace(/\n$/, '');

          // 特殊处理：思考过程
          if (!inline && language === '思考') {
            return <ThinkingProcess {...props}>{children}</ThinkingProcess>;
          }

          return !inline && language ? (
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              className="code-block"
              {...props}
            >
              {codeContent}
            </SyntaxHighlighter>
          ) : (
            <code className={`inline-code ${className || ''}`} {...props}>
              {children}
            </code>
          );
        },
        a({ children, href, title }) {
          // 检查是否是文件路径链接（支持 / 和 ~/ 开头）
          const isFilePath = href && (href.startsWith('/') || href.startsWith('~')) && title === '点击打开';

          if (isFilePath) {
            // 使用新的 FilePathLink 组件（支持路径验证）
            return <FilePathLink href={href}>{children}</FilePathLink>;
          }

          return (
            <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        },
        p({ children }) {
          return <p className="markdown-paragraph">{children}</p>;
        },
        ul({ children }) {
          return <ul className="markdown-list">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="markdown-list-ordered">{children}</ol>;
        },
        li({ children }) {
          return <li className="markdown-list-item">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="markdown-h1">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="markdown-h2">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="markdown-h3">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="markdown-h4">{children}</h4>;
        },
        blockquote({ children }) {
          return <blockquote className="markdown-blockquote">{children}</blockquote>;
        },
        table({ children }) {
          return <div className="markdown-table-wrapper"><table className="markdown-table">{children}</table></div>;
        },
        thead({ children }) {
          return <thead className="markdown-thead">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="markdown-tbody">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="markdown-tr">{children}</tr>;
        },
        th({ children }) {
          return <th className="markdown-th">{children}</th>;
        },
        td({ children }) {
          return <td className="markdown-td">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;
