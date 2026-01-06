import { useState, useRef, useEffect } from 'react';
import ScreenshotPreview from './ScreenshotPreview';
import './InputArea.css';

function InputArea({ onSendMessage, hasApiKey, currentUser, guestStatus, onOpenSettings }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [pendingScreenshot, setPendingScreenshot] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 自动调整 textarea 高度
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // 重置为自动高度以获取真实的 scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // 设置最小高度为 44px，最大高度为 160px
      textarea.style.height = Math.max(44, Math.min(scrollHeight, 160)) + 'px';
    }
  }, [message]);

  const handleFocus = () => {
    console.log('输入框获得焦点', { hasApiKey, hasPrompted, isGuest: !currentUser && guestStatus });

    // 游客模式下不需要提示输入API Key（使用官方Key）
    // 只有登录用户没有配置API Key时，才提示输入
    const isGuest = !currentUser && guestStatus;
    if (!hasApiKey && !hasPrompted && !isGuest) {
      console.log('自动打开设置窗口');
      setHasPrompted(true);
      onOpenSettings();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!message.trim() && files.length === 0 && screenshots.length === 0) return;

    // 合并文件和截图
    const allFiles = [...files, ...screenshots];
    onSendMessage(message, allFiles);
    setMessage('');
    setFiles([]);
    setScreenshots([]);
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = await window.electronAPI.selectFiles();
    if (selectedFiles) {
      const newFiles = selectedFiles.map((path) => ({
        path,
        name: path.split('/').pop(),
      }));
      setFiles([...files, ...newFiles]);
    }
  };

  const handleScreenshot = async () => {
    try {
      const result = await window.electronAPI.captureScreen();

      // 如果用户取消了截图，不显示错误
      if (result.canceled) {
        console.log('用户取消了截图');
        return;
      }

      if (result.success && result.filePath) {
        // 保存截图数据并显示预览
        const screenshotData = {
          path: result.filePath,
          name: `截图-${Date.now()}.png`,
          preview: result.preview
        };
        setPendingScreenshot(screenshotData);
        setShowPreview(true);
      } else if (result.error) {
        alert('截图失败: ' + result.error);
      }
    } catch (error) {
      console.error('截图失败:', error);
      alert('截图失败: ' + error.message);
    }
  };

  const handleConfirmScreenshot = (screenshot, boxes) => {
    // 如果有标注框，可以在文件名中体现
    const finalScreenshot = boxes.length > 0
      ? { ...screenshot, name: `${screenshot.name.replace('.png', '')}(已标注).png`, boxes }
      : screenshot;

    setScreenshots([...screenshots, finalScreenshot]);
    setShowPreview(false);
    setPendingScreenshot(null);
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPendingScreenshot(null);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const removeScreenshot = (index) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  return (
    <div className="input-area">
      {showPreview && pendingScreenshot && (
        <ScreenshotPreview
          screenshot={pendingScreenshot}
          onConfirm={handleConfirmScreenshot}
          onCancel={handleCancelPreview}
        />
      )}
      <div className="input-container">
        {(files.length > 0 || screenshots.length > 0) && (
          <div className="file-preview">
            {files.map((file, index) => (
              <div key={index} className="file-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <span>{file.name}</span>
                <span className="close" onClick={() => removeFile(index)}>
                  ✕
                </span>
              </div>
            ))}
            {screenshots.map((screenshot, index) => (
              <div key={index} className="file-tag screenshot-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{screenshot.name}</span>
                <span className="close" onClick={() => removeScreenshot(index)}>
                  ✕
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="input-wrapper">
          <button className="btn-attach" title="上传文件" onClick={handleFileSelect}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <button className="btn-screenshot" title="截图" onClick={handleScreenshot}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            rows={1}
          />
          <button
            className="btn-send"
            onClick={handleSend}
            disabled={!message.trim() && files.length === 0 && screenshots.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        {!currentUser && guestStatus && (
          <div className="guest-status-bar">
            <span className="guest-status-text">
              游客模式 - 剩余 <strong>{guestStatus.remaining}</strong> 次
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InputArea;
