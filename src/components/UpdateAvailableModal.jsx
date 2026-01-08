import { useState, useEffect } from 'react';
import './UpdateAvailableModal.css';
import MarkdownRenderer from './MarkdownRenderer';
import { getPlatformClassNames } from '../lib/platformUtil';

function UpdateAvailableModal({ version, releaseNotes, onDownload, onLater, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    // 监听下载进度
    const unlistenProgress = window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
    });

    // 监听下载完成
    const unlistenDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setDownloading(false);
      setProgress({ percent: 100, transferred: 0, total: 0 });
      // 下载完成后延迟关闭，让用户看到完成状态
      setTimeout(() => {
        onClose();
      }, 800);
    });

    return () => {
      unlistenProgress();
      unlistenDownloaded();
    };
  }, [onClose]);

  const handleDownload = async () => {
    setDownloading(true);
    onDownload();
  };

  return (
    <div className={`modal-overlay update-modal-overlay ${getPlatformClassNames().join(' ')}`}>
      <div className="modal update-modal">
        <div className="update-header">
          <h2>发现新版本</h2>
          {!downloading && <button className="btn-close" onClick={onClose}>×</button>}
        </div>

        <div className="update-body">
          <div className="update-version">
            v{version}
          </div>

          {/* 🔥 新增：显示下载进度 */}
          {downloading && progress && (
            <div className="update-preparing">
              {progress.percent < 100 ? (
                <>
                  <div className="preparing-spinner"></div>
                  <div className="preparing-text">正在下载更新...</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <div className="preparing-hint">
                    {progress.percent}% ({progress.transferred}MB/{progress.total}MB)
                  </div>
                </>
              ) : (
                <>
                  <div className="preparing-text" style={{ color: '#4CAF50' }}>✓ 下载完成！</div>
                  <div className="preparing-hint">准备重启安装...</div>
                </>
              )}
            </div>
          )}

          {!downloading && (
            <div className="update-notes">
              <h4>更新内容:</h4>
              <div className="notes-content">
                {releaseNotes ? (
                  <div className="markdown-content">
                    <MarkdownRenderer content={releaseNotes} />
                  </div>
                ) : (
                  <div className="default-notes">
                    <p>✨ 体验优化和性能提升</p>
                    <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
                      本次更新包含多项改进，让小白AI更加稳定易用
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="update-actions">
          {downloading ? (
            <button className="btn-update primary" disabled>
              {progress && progress.percent < 100 ? `下载中 ${progress.percent}%` : '下载完成'}
            </button>
          ) : (
            <>
              <button className="btn-update secondary" onClick={() => { onLater(); onClose(); }}>
                稍后提醒
              </button>
              <button className="btn-update primary" onClick={handleDownload}>
                立即更新
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpdateAvailableModal;
