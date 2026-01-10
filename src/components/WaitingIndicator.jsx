import React, { useState, useEffect } from 'react';
import './WaitingIndicator.css';

// 等待动画 + 文字提示 - v2.8.7 优化版
export default function WaitingIndicator({ type = 'thinking', duration = 0 }) {
  const [message, setMessage] = useState('正在思考中...');

  // 根据任务时长更新提示文字
  useEffect(() => {
    if (duration < 30) {
      setMessage('正在处理中...');
    } else if (duration < 60) {
      setMessage('任务执行中，请稍候...');
    } else if (duration < 120) {
      setMessage('任务需要一些时间，请耐心等待...');
    } else {
      setMessage('这是一个复杂任务，正在努力处理中...');
    }
  }, [duration]);

  return (
    <div className="waiting-indicator-combined">
      <div className="waiting-dots-wrapper">
        <span className="waiting-dot"></span>
        <span className="waiting-dot"></span>
        <span className="waiting-dot"></span>
      </div>
      <span className="waiting-text">{message}</span>
    </div>
  );
}
