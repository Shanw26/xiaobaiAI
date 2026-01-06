import { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import './ChatArea.css';

function ChatArea({ messages }) {
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="messages">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
          <div className={`avatar ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            {msg.role === 'user' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            )}
          </div>
          <div className="bubble">
            {msg.role === 'assistant' ? (
              msg.content ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <span className="typing-indicator">正在输入...</span>
              )
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
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatArea;
