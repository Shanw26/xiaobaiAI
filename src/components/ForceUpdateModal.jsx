import { useState, useEffect } from 'react';
import './ForceUpdateModal.css';
import MarkdownRenderer from './MarkdownRenderer';
import { getPlatformClassNames } from '../lib/platformUtil';

function ForceUpdateModal({ version, releaseNotes }) {
  const [progress, setProgress] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // 监听下载进度
    window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
      setDownloading(true);
    });

    // 监听下载完成
    window.electronAPI.onUpdateDownloaded(() => {
      setDownloaded(true);
      setDownloading(false);
      setProgress({ percent: 100, transferred: 0, total: 0 });
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    await window.electronAPI.downloadUpdate();
  };

  const handleRestart = () => {
    window.electronAPI.installUpdate();
  };

  return (
    <div className={`modal-overlay force-update ${getPlatformClassNames().join(' ')}`}>
      <div className={`modal small force-update-modal ${getPlatformClassNames().join(' ')}`}>
        <div className="force-update-icon">⚠️</div>
        <h2>需要立即更新</h2>
        <p className="force-update-text">
          为了您的使用体验和数据安全，请更新到最新版本 v{version}
        </p>

        {/* 下载中显示进度，下载完成后隐藏 */}
        {downloading ? (
          <div className="update-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress?.percent || 0}%` }} />
            </div>
            <div className="progress-info">
              {`下载中: ${progress?.percent || 0}% (${progress?.transferred || 0}MB/${progress?.total || 0}MB)`}
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

        {/* 立即更新按钮 */}
        {!downloading && !downloaded && (
          <button className="btn-update primary force-update-btn" onClick={handleDownload}>
            立即更新
          </button>
        )}

        {/* 下载完成后显示重启按钮 */}
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
