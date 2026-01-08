import { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import WaitingIndicator from './WaitingIndicator';
import './ChatArea.css';
import logoSvg from '/logo.svg';

function ChatArea({ messages, currentUser, waitingIndicator }) {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [expandedThinking, setExpandedThinking] = useState({});

  // 自动滚动到底部（messages 变化时）
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 流式更新时持续滚动（监听最后一条消息的 content 变化）
  const lastMessageContent = messages.length > 0 ? messages[messages.length - 1].content : '';
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // 任何消息有内容时都滚动（包括用户消息和AI回复）
      if (lastMessage?.content) {
        // 使用即时滚动（无动画），避免流式更新时的滚动延迟
        scrollToBottom(false);
      }
    }
  }, [lastMessageContent]); // 只监听 content 变化，不监听整个 messages

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else {
      // 降级方案：使用 scrollIntoView
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const toggleThinking = (index) => {
    setExpandedThinking(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="messages" ref={messagesContainerRef}>
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
          <div className={`avatar ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            {msg.role === 'user' ? (
              currentUser && currentUser.phone ? (
                <span className="user-avatar-text">
                  {currentUser.phone.slice(-2)}
                </span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )
            ) : (
              <img src={logoSvg} alt="小白AI" />
            )}
          </div>
          <div className="bubble">
            {msg.role === 'assistant' && msg.thinking && (
              <div className="thinking-section">
                <div
                  className="thinking-header"
                  onClick={() => toggleThinking(index)}
                >
                  <div className="thinking-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span>思考过程</span>
                  </div>
                  <svg
                    className={`collapse-icon ${expandedThinking[index] ? 'expanded' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {expandedThinking[index] && (
                  <div className="thinking-content">
                    <MarkdownRenderer content={msg.thinking} />
                  </div>
                )}
              </div>
            )}
            {msg.role === 'assistant' ? (
              <>
                {msg.content ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  // v2.8.9 - 使用新的等待指示器组件（动画 + 文字）
                  waitingIndicator?.show && index === messages.length - 1 ? (
                    <WaitingIndicator type={waitingIndicator.type} duration={waitingIndicator.duration || 0} />
                  ) : (
                    <span className="typing-indicator">正在思考中...</span>
                  )
                )}
              </>
            ) : (
              <div className="user-message">{msg.content}</div>
            )}
            {msg.files && msg.files.length > 0 && (
              <div className="files">
                {msg.files.map((file, fileIndex) => (
                  <div key={fileIndex} className="file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* 等待指示器 - 附加到最后一条消息 */}
      {waitingIndicator?.show && messages.length > 0 && (() => {
        const lastMsg = messages[messages.length - 1];
        // 只在最后一条是助手消息时显示
        if (lastMsg.role === 'assistant') {
          return null; // 助手消息会在消息内容中显示
        }
        // 如果最后一条是用户消息，则等待动画放在新消息中
        return (
          <div className="message assistant waiting-message">
            <div className="avatar assistant">
              <img src={logoSvg} alt="小白AI" />
            </div>
            <div className="bubble">
              <WaitingIndicator type={waitingIndicator.type} duration={waitingIndicator.duration || 0} />
            </div>
          </div>
        );
      })()}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatArea;
