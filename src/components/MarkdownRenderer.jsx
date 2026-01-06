import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MarkdownRenderer.css';

function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
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
        a({ children, href }) {
          return (
            <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
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
