import './GuestLimitModal.css';
import { getPlatformClassNames } from '../lib/platformUtil';

function GuestLimitModal({ onClose, onLogin, limit = 10 }) {
  return (
    <div className={`modal-overlay ${getPlatformClassNames().join(' ')}`} onClick={onClose}>
      <div className="modal-content guest-limit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guest-limit-icon">⚠️</div>

        <h2>免费次数已用完</h2>

        <p className="description">
          游客模式可免费使用{limit}次，您已用完免费额度。
        </p>

        <div className="benefits">
          <h3>登录后可以：</h3>
          <ul>
            <li>✓ 无限制使用AI助手</li>
            <li>✓ 配置自己的API Key</li>
            <li>✓ 保存对话历史</li>
            <li>✓ 享受更稳定的服务</li>
          </ul>
        </div>

        <div className="actions">
          <button className="btn-primary" onClick={onLogin}>
            立即登录
          </button>
          <button className="btn-secondary" onClick={onClose}>
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuestLimitModal;
