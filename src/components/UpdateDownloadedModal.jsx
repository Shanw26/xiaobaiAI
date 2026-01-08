import './UpdateDownloadedModal.css';
import { getPlatformClassNames } from '../lib/platformUtil';

function UpdateDownloadedModal({ version, onRestart, onClose }) {
  return (
    <div className="toast-overlay" onClick={onClose}>
      <div className="update-downloaded-modal" onClick={(e) => e.stopPropagation()}>
        <div className="update-downloaded-header">
          <div className="update-downloaded-icon">✅</div>
          <h2>更新已准备就绪</h2>
          <button className="btn-close-toast" onClick={onClose}>×</button>
        </div>

        <div className="update-downloaded-body">
          <div className="update-downloaded-version">v{version}</div>
          <p className="update-downloaded-message">
            新版本已下载完成，重启应用后即可使用最新功能
          </p>
        </div>

        <div className="update-downloaded-actions">
          <button className="btn-update secondary" onClick={onClose}>
            稍后
          </button>
          <button className="btn-update primary" onClick={onRestart}>
            立即重启
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateDownloadedModal;
