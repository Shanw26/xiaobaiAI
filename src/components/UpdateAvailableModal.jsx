import { useState, useEffect } from 'react';
import './UpdateAvailableModal.css';

function UpdateAvailableModal({ version, releaseNotes, onDownload, onLater, onClose }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  return (
    <div className="modal-overlay update-modal-overlay">
      <div className="modal update-modal">
        <div className="update-header">
          <div className="update-icon">📦</div>
          <h2>发现新版本</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="update-body">
          <div className="update-version">v{version}</div>

          {progress ? (
            <div className="update-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="progress-info">
                下载中: {progress.percent}% ({progress.transferred}MB/{progress.total}MB)
                <span className="progress-speed"> - {progress.speed}KB/s</span>
              </div>
            </div>
          ) : (
            <div className="update-notes">
              <h4>更新内容:</h4>
              <div className="notes-content">
                {releaseNotes || '查看 GitHub Releases 了解详情'}
              </div>
            </div>
          )}
        </div>

        <div className="update-actions">
          {!progress && (
            <>
              <button className="btn-update secondary" onClick={onLater}>
                稍后提醒
              </button>
              <button className="btn-update primary" onClick={onDownload}>
                立即更新
              </button>
            </>
          )}
          {progress && progress.percent === 100 && (
            <button className="btn-update primary" onClick={onClose}>
              下载完成，重启后生效
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateAvailableModal;
