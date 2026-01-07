import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { visit } from 'unist-util-visit';
import './MarkdownRenderer.css';

// 检测文件路径的正则表达式 - 支持绝对路径、相对路径和中文文件名
const FILE_PATH_PATTERN = /(~?\/[a-zA-Z0-9_\-./~\u4e00-\u9fa5]+[a-zA-Z0-9\u4e00-\u9fa5])(?!\w)/g;

// remark 插件：预处理文件路径
function remarkFilePathLinks() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value) return;

      const text = node.value;
      const parts = [];
      let lastIndex = 0;
      let match;

      // 查找所有文件路径
      FILE_PATH_PATTERN.lastIndex = 0; // 重置正则表达式
      console.log('🔍 [MarkdownRenderer] 检查文本:', text);
      while ((match = FILE_PATH_PATTERN.exec(text)) !== null) {
        const [path] = match;
        const matchIndex = match.index;
        console.log('✅ [MarkdownRenderer] 找到路径:', path, '在位置:', matchIndex);

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

        lastIndex = matchIndex + path.length;
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

function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkFilePathLinks]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          return !inline && language ? (
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              className="code-block"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={`inline-code ${className || ''}`} {...props}>
              {children}
            </code>
          );
        },
        a({ children, href, title }) {
          // 检查是否是文件路径链接（支持 / 和 ~/ 开头）
          console.log('🔗 [MarkdownRenderer.a] href:', href, 'title:', title);
          const isFilePath = href && (href.startsWith('/') || href.startsWith('~')) && title === '点击打开';
          console.log('  → isFilePath:', isFilePath);

          if (isFilePath) {
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
