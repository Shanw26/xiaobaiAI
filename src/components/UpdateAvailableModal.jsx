import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
                {releaseNotes ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // 自定义标签样式
                      h1: ({node, ...props}) => <h1 className="md-h1" {...props} />,
                      h2: ({node, ...props}) => <h2 className="md-h2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="md-h3" {...props} />,
                      h4: ({node, ...props}) => <h4 className="md-h4" {...props} />,
                      h5: ({node, ...props}) => <h5 className="md-h5" {...props} />,
                      h6: ({node, ...props}) => <h6 className="md-h6" {...props} />,
                      p: ({node, ...props}) => <p className="md-p" {...props} />,
                      ul: ({node, ...props}) => <ul className="md-ul" {...props} />,
                      ol: ({node, ...props}) => <ol className="md-ol" {...props} />,
                      li: ({node, ...props}) => <li className="md-li" {...props} />,
                      code: ({node, inline, ...props}) =>
                        inline ? (
                          <code className="md-inline-code" {...props} />
                        ) : (
                          <code className="md-code-block" {...props} />
                        ),
                      pre: ({node, ...props}) => <pre className="md-pre" {...props} />,
                      a: ({node, ...props}) => (
                        <a className="md-link" target="_blank" rel="noopener noreferrer" {...props} />
                      ),
                      strong: ({node, ...props}) => <strong className="md-strong" {...props} />,
                      b: ({node, ...props}) => <strong className="md-strong" {...props} />,
                      em: ({node, ...props}) => <em className="md-em" {...props} />,
                      i: ({node, ...props}) => <em className="md-em" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="md-blockquote" {...props} />,
                      hr: ({node, ...props}) => <hr className="md-hr" {...props} />,
                      // HTML 标签支持
                      div: ({node, ...props}) => <div className="md-div" {...props} />,
                      span: ({node, ...props}) => <span className="md-span" {...props} />,
                    }}
                  >
                    {releaseNotes}
                  </ReactMarkdown>
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
