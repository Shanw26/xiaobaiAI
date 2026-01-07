import './UpdateDownloadedModal.css';

function UpdateDownloadedModal({ version, onRestart, onLater }) {
  return (
    <div className="toast-overlay">
      <div className="update-downloaded-modal" onClick={(e) => e.stopPropagation()}>
        <div className="update-downloaded-header">
          <div className="update-downloaded-icon">✅</div>
          <h2>更新已准备就绪</h2>
        </div>

        <div className="update-downloaded-body">
          <div className="update-downloaded-version">v{version}</div>
          <p className="update-downloaded-message">
            新版本已下载完成，重启应用后即可使用最新功能
          </p>
        </div>

        <div className="update-downloaded-actions">
          <button className="btn-update secondary" onClick={onLater}>
            稍后提醒
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
