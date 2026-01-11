import { useState, useRef, useEffect } from 'react';
import ScreenshotPreview from './ScreenshotPreview';
import './InputArea.css';
import { showAlert } from '../lib/alertService';

function InputArea({ onSendMessage, hasApiKey, currentUser, guestStatus, userUsageCount = 0, dailyUsageStatus, onLoginClick, onOpenSettings }) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [pendingScreenshot, setPendingScreenshot] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [isSending, setIsSending] = useState(false); // ✨ v2.10.8 新增：发送状态
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
    console.log('输入框获得焦点', { hasApiKey, hasPrompted, isGuest: !currentUser && guestStatus, userUsageCount });

    // 游客模式下不需要提示输入API Key（使用官方Key）
    // 登录用户只有在用完10次免费额度后才提示配置API Key
    const isGuest = !currentUser && guestStatus;
    const FREE_QUOTA = 10;
    const hasUsedFreeQuota = currentUser && userUsageCount >= FREE_QUOTA;

    // 只有满足以下条件才弹出设置窗口：
    // 1. 没有 API Key
    // 2. 不是游客模式
    // 3. 已经用完 10 次免费额度
    // 4. 还没有提示过
    if (!hasApiKey && !hasPrompted && !isGuest && hasUsedFreeQuota) {
      console.log('自动打开设置窗口');
      setHasPrompted(true);
      onOpenSettings();
    }
  };

  const handleKeyDown = (e) => {
    // 如果输入法正在 composition（选词），不发送消息
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!message.trim() && files.length === 0 && screenshots.length === 0) return;

    // 防止重复发送
    if (isSending) return;

    // 合并文件和截图
    const allFiles = [...files, ...screenshots];
    const messageContent = message; // 保存消息内容
    const filesContent = [...files]; // 保存文件引用
    const screenshotsContent = [...screenshots]; // 保存截图引用

    setIsSending(true); // 设置发送状态

    try {
      // ✨ v2.10.8 改进：等待发送结果
      const result = await onSendMessage(messageContent, allFiles);

      // 🔍 调试：查看返回值
      console.log('📤 [InputArea] 发送结果:', result);
      console.log('   result.success:', result?.success);
      console.log('   result.type:', result?.id ? 'chat对象' : typeof result);
      console.log('   result所有字段:', Object.keys(result || {}));

      // 只有发送成功才清空输入框
      // 检查返回值或是否抛出错误
      if (result === undefined || result === null || result.success !== false) {
        // 发送成功（或者没有明确的失败标记）
        console.log('✅ [InputArea] 清空输入框');
        setMessage('');
        setFiles([]);
        setScreenshots([]);
      } else {
        console.log('❌ [InputArea] 保留输入框内容');
      }
      // 如果 result.success === false，保留消息和文件，让用户重试
    } catch (error) {
      // 发送失败，保留消息和文件
      console.error('发送失败，保留消息:', error);
    } finally {
      setIsSending(false); // 重置发送状态
    }
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
        showAlert('截图失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('截图失败:', error);
      showAlert('截图失败: ' + error.message, 'error');
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

  // ✨ v2.20.5 新增：支持粘贴截图
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // 查找剪贴板中的图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 检查是否是图片类型
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // 阻止默认粘贴行为

        const file = item.getAsFile();
        if (!file) continue;

        console.log('📋 粘贴了图片:', file.type, file.name, file.size);

        // 🔥 关键修复：将 blob 转换为 base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result; // data:image/png;base64,xxxx

          // 保存截图数据并显示预览
          const screenshotData = {
            path: null, // 粘贴的图片没有文件路径
            name: `粘贴截图-${Date.now()}.png`,
            preview: base64, // 直接使用 base64 作为预览
            blob: file // 保存原始 blob 数据
          };

          setPendingScreenshot(screenshotData);
          setShowPreview(true);
        };

        reader.readAsDataURL(file); // 读取为 base64

        // 只处理第一个图片
        break;
      }
    }
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
          <button className="btn-screenshot" title="截图 (Cmd+Shift+4)" onClick={handleScreenshot}>
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
            onPaste={handlePaste}
            placeholder="输入消息... 支持上传文件、截图、或直接粘贴截图 (Enter 发送)"
            rows={1}
          />
          <button
            className={`btn-send ${isSending ? 'sending' : ''}`}
            onClick={handleSend}
            disabled={(!message.trim() && files.length === 0 && screenshots.length === 0) || isSending}
            title={isSending ? '发送中...' : '发送消息 (Enter)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        {!currentUser && guestStatus && (
          <div className="guest-status-bar">
            <span className="guest-status-text">
              游客模式 - 剩余 <strong>{guestStatus.remaining}</strong> 次（<a className="login-link" onClick={onLoginClick}>登录</a>可同步对话历史）
            </span>
          </div>
        )}
        {currentUser && dailyUsageStatus && (
          <div className="guest-status-bar">
            <span className="guest-status-text">
              今日使用 <strong>{dailyUsageStatus.dailyUsed}/{dailyUsageStatus.dailyLimit}</strong> 次，剩余 <strong>{dailyUsageStatus.remaining}</strong> 次
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InputArea;
