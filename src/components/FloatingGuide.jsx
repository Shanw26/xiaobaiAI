import { useState } from 'react';
import './FloatingGuide.css';
import WelcomeModal from './WelcomeModal';

function FloatingGuide() {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 如果用户关闭了悬浮球，就不显示
  if (dismissed) {
    return null;
  }

  const handleOpenGuide = () => {
    setShowModal(true);
  };

  const handleModalComplete = () => {
    setShowModal(false);
    setDismissed(true); // 完成引导后关闭悬浮球
  };

  const handleDismiss = () => {
    if (confirm('暂时跳过引导？你可以随时在设置中补充个人信息。')) {
      setDismissed(true);
    }
  };

  return (
    <>
      {/* 悬浮球 */}
      <div className="floating-guide" onClick={handleOpenGuide}>
        <div className="floating-ball">
          <span className="floating-icon">👋</span>
          <div className="floating-tooltip">
            <span class="floating-tooltip-text">完善个人信息</span>
          </div>
          <button className="floating-dismiss" onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}>
            ✕
          </button>
        </div>
      </div>

      {/* 引导弹窗 */}
      {showModal && (
        <WelcomeModal
          onComplete={handleModalComplete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default FloatingGuide;
