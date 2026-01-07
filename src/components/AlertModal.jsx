import './AlertModal.css';

function AlertModal({ message, type = 'info', onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal xsmall alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          {type === 'error' && '⚠️'}
          {type === 'success' && '✅'}
          {type === 'info' && 'ℹ️'}
        </div>

        <div className="modal-body">
          <p className="modal-description">{message}</p>
        </div>

        <div className="modal-actions">
          <button className="btn-modal primary" onClick={onClose}>
            好的
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
