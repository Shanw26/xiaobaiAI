import { useState } from 'react';
import './FloatingGuide.css';
import WelcomeModal from './WelcomeModal';
import ConfirmModal from './ConfirmModal';

function FloatingGuide() {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    setShowConfirm(true);
  };

  const handleConfirmDismiss = () => {
    setShowConfirm(false);
    setDismissed(true);
  };

  const handleCancelDismiss = () => {
    setShowConfirm(false);
  };

  return (
    <>
      {/* 悬浮球 */}
      <div className="floating-guide" onClick={handleOpenGuide}>
        <div className="floating-ball">
          <span className="floating-icon">👋</span>
          <div className="floating-tooltip">
            <span className="floating-tooltip-text">完善个人信息</span>
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

      {/* 确认弹窗 */}
      {showConfirm && (
        <ConfirmModal
          message="暂时跳过引导？你可以随时在设置中补充个人信息。"
          onConfirm={handleConfirmDismiss}
          onCancel={handleCancelDismiss}
        />
      )}
    </>
  );
}

export default FloatingGuide;
