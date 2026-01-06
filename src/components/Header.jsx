import './Header.css';

function Header({ title, messages }) {
  const handleExport = async () => {
    if (!messages || messages.length === 0) {
      alert('当前对话没有内容');
      return;
    }

    try {
      const result = await window.electronAPI.exportMarkdown(messages, title);
      if (result.success) {
        alert('导出成功: ' + result.filePath);
      } else if (!result.canceled) {
        alert('导出失败: ' + result.error);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败: ' + error.message);
    }
  };

  return (
    <div className="header">
      <div className="header-left">
        <div className="header-title">{title}</div>
      </div>
      <div className="header-actions">
        <button className="btn-icon" title="导出对话" onClick={handleExport}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button className="btn-icon" title="更多">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Header;
