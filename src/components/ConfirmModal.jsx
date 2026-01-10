import './ConfirmModal.css';
import { getPlatformClassNames } from '../lib/platformUtil';

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className={`modal-overlay ${getPlatformClassNames().join(' ')}`} onClick={onCancel}>
      <div className={`modal xsmall ${getPlatformClassNames().join(' ')}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <p className="modal-description">{message}</p>
        </div>

        <div className="modal-actions">
          <button className="btn-modal secondary" onClick={onCancel}>
            取消
          </button>
          <button className="btn-modal primary" onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
