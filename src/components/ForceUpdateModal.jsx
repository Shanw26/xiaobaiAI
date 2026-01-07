import { useState, useEffect } from 'react';
import './ForceUpdateModal.css';

function ForceUpdateModal({ version, releaseNotes }) {
  const [progress, setProgress] = useState(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      // 下载完成后倒计时3秒自动安装
      let count = 3;
      setCountdown(count);

      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          window.electronAPI.installUpdate();
        }
      }, 1000);
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  return (
    <div className="modal-overlay force-update">
      <div className="modal small force-update-modal">
        <div className="force-update-icon">⚠️</div>
        <h2>需要立即更新</h2>
        <p className="force-update-text">
          为了您的使用体验和数据安全，请更新到最新版本 v{version}
        </p>

        {progress ? (
          <div className="update-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="progress-info">
              下载中: {progress.percent}% ({progress.transferred}MB/{progress.total}MB)
            </div>
          </div>
        ) : (
          <div className="update-notes">
            {releaseNotes || '正在准备更新...'}
          </div>
        )}

        {progress && progress.percent === 100 && (
          <div className="update-complete">
            ✓ 下载完成，{countdown}秒后自动重启并安装...
          </div>
        )}
      </div>
    </div>
  );
}

export default ForceUpdateModal;
