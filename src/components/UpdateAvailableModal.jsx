import { useState } from 'react';
import './UpdateAvailableModal.css';

function UpdateAvailableModal({ version, releaseNotes, onDownload, onLater, onClose }) {
  const [isPreparing, setIsPreparing] = useState(false);

  const handleDownload = async () => {
    setIsPreparing(true);
    // 开始后台下载，不等待完成
    onDownload();
    // 立即关闭弹窗，让用户继续使用
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="modal-overlay update-modal-overlay">
      <div className="modal update-modal">
        <div className="update-header">
          <h2>发现新版本</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="update-body">
          <div
            className={`update-version ${!isPreparing ? 'clickable' : ''}`}
            onClick={!isPreparing ? handleDownload : undefined}
            title={!isPreparing ? '点击立即更新' : ''}
          >
            v{version}
            {!isPreparing && <span className="click-hint">👆 点击版本号或下方按钮更新</span>}
          </div>

          {isPreparing && (
            <div className="update-preparing">
              <div className="preparing-spinner"></div>
              <div className="preparing-text">正在后台下载更新...</div>
              <div className="preparing-hint">您可以继续使用应用</div>
            </div>
          )}

          {!isPreparing && (
            <div className="update-notes">
              <h4>更新内容:</h4>
              <div className="notes-content">
                {releaseNotes ? (
                  <div
                    className="notes-html-content"
                    dangerouslySetInnerHTML={{ __html: releaseNotes }}
                  />
                ) : (
                  <div className="no-notes">
                    查看 <a href="https://github.com/Shanw26/xiaobaiAI/releases" target="_blank" rel="noopener noreferrer">GitHub Releases</a> 了解详情
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="update-actions">
          {!isPreparing && (
            <>
              <button className="btn-update secondary" onClick={onLater}>
                稍后提醒
              </button>
              <button className="btn-update primary" onClick={handleDownload}>
                立即更新
              </button>
            </>
          )}
          {isPreparing && (
            <button className="btn-update primary" disabled>
              后台下载中...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateAvailableModal;
