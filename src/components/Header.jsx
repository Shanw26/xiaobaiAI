import './Header.css';
import { showAlert } from '../lib/alertService';

function Header({ title, messages }) {
  const handleExport = async () => {
    if (!messages || messages.length === 0) {
      showAlert('当前对话没有内容', 'info');
      return;
    }

    try {
      const result = await window.electronAPI.exportMarkdown(messages, title);
      if (result.success) {
        showAlert('导出成功: ' + result.filePath, 'success');
      } else if (!result.canceled) {
        showAlert('导出失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('导出失败:', error);
      showAlert('导出失败: ' + error.message, 'error');
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
      </div>
    </div>
  );
}

export default Header;
