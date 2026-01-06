import './ToastModal.css';

function ToastModal({ message, onClose, type = 'info' }) {
  return (
    <div className="toast-overlay" onClick={onClose}>
      <div className="toast-modal" onClick={(e) => e.stopPropagation()}>
        <div className="toast-icon">
          {type === 'error' && '⚠️'}
          {type === 'success' && '✅'}
          {type === 'info' && 'ℹ️'}
        </div>

        <div className="toast-content">
          <p className="toast-message">{message}</p>
        </div>

        <button className="toast-button" onClick={onClose}>
          我知道了
        </button>
      </div>
    </div>
  );
}

export default ToastModal;
