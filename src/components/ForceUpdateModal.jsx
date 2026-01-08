import { useState, useEffect } from 'react';
import './ForceUpdateModal.css';
import MarkdownRenderer from './MarkdownRenderer';
import { getPlatformClassNames } from '../lib/platformUtil';

function ForceUpdateModal({ version, releaseNotes }) {
  const [progress, setProgress] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    // 监听下载进度
    window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
    });

    // 监听下载完成
    window.electronAPI.onUpdateDownloaded(() => {
      setDownloaded(true);
      setProgress({ percent: 100, transferred: 0, total: 0 });
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const handleRestart = () => {
    window.electronAPI.installUpdate();
  };

  return (
    <div className={`modal-overlay force-update ${getPlatformClassNames().join(' ')}`}>
      <div className="modal small force-update-modal">
        <div className="force-update-icon">⚠️</div>
        <h2>需要立即更新</h2>
        <p className="force-update-text">
          为了您的使用体验和数据安全，请更新到最新版本 v{version}
        </p>

        {/* 下载中或下载完成 */}
        {progress ? (
          <div className="update-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="progress-info">
              {progress.percent < 100
                ? `下载中: ${progress.percent}% (${progress.transferred}MB/${progress.total}MB)`
                : '✓ 下载完成！'
              }
            </div>
          </div>
        ) : (
          <div className="update-notes">
            {releaseNotes ? (
              <div className="markdown-content">
                <MarkdownRenderer content={releaseNotes} />
              </div>
            ) : (
              '正在准备更新...'
            )}
          </div>
        )}

        {/* 🔥 修改：下载完成后显示按钮，而不是自动重启 */}
        {downloaded && (
          <button className="btn-update primary force-update-btn" onClick={handleRestart}>
            立即重启并安装
          </button>
        )}
      </div>
    </div>
  );
}

export default ForceUpdateModal;
