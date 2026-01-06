import { useState, useEffect } from 'react';
import './UpdateAvailableModal.css';

function UpdateAvailableModal({ version, releaseNotes, onDownload, onLater, onClose }) {
  const [progress, setProgress] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
      setIsPreparing(false);
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const handleDownload = async () => {
    setIsPreparing(true);
    await onDownload();
  };

  return (
    <div className="modal-overlay update-modal-overlay">
      <div className="modal update-modal">
        <div className="update-header">
          <div className="update-icon">📦</div>
          <h2>发现新版本</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="update-body">
          <div
            className={`update-version ${!progress && !isPreparing ? 'clickable' : ''}`}
            onClick={!progress && !isPreparing ? handleDownload : undefined}
            title={!progress && !isPreparing ? '点击立即更新' : ''}
          >
            v{version}
            {!progress && !isPreparing && <span className="click-hint">👆 点击版本号或下方按钮更新</span>}
          </div>

          {isPreparing && !progress && (
            <div className="update-preparing">
              <div className="preparing-spinner"></div>
              <div className="preparing-text">正在准备下载...</div>
            </div>
          )}

          {progress ? (
            <div className="update-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="progress-info">
                {progress.percent < 100 ? (
                  <>
                    下载中: {progress.percent}% ({progress.transferred}MB/{progress.total}MB)
                    <span className="progress-speed"> - {progress.speed}KB/s</span>
                  </>
                ) : (
                  <>下载完成！重启后即可使用新版本</>
                )}
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
          {!progress && !isPreparing && (
            <>
              <button className="btn-update secondary" onClick={onLater}>
                稍后提醒
              </button>
              <button className="btn-update primary" onClick={handleDownload}>
                立即更新
              </button>
            </>
          )}
          {isPreparing && !progress && (
            <button className="btn-update primary" disabled>
              准备中...
            </button>
          )}
          {progress && progress.percent === 100 && (
            <button className="btn-update primary" onClick={() => {
              window.electronAPI.installUpdate();
              onClose();
            }}>
              立即重启并更新
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateAvailableModal;
