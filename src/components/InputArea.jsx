import { useState, useRef, useEffect } from 'react';
import './InputArea.css';

function InputArea({ onSendMessage, hasApiKey, onOpenSettings }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [hasPrompted, setHasPrompted] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 自动调整 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'; // 重置为固定高度
      const scrollHeight = textareaRef.current.scrollHeight;
      if (scrollHeight > 44) {
        textareaRef.current.style.height = Math.min(scrollHeight, 160) + 'px';
      }
    }
  }, [message]);

  const handleFocus = () => {
    console.log('输入框获得焦点', { hasApiKey, hasPrompted });
    // 如果没有配置 API Key 且还没提示过，自动打开设置
    if (!hasApiKey && !hasPrompted) {
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
    if (!message.trim() && files.length === 0) return;

    onSendMessage(message, files);
    setMessage('');
    setFiles([]);
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

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="input-area">
      <div className="input-container">
        {files.length > 0 && (
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
          </div>
        )}
        <div className="input-wrapper">
          <button className="btn-attach" title="上传文件" onClick={handleFileSelect}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
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
            disabled={!message.trim() && files.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default InputArea;
