import './ConfirmModal.css';

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal xsmall" onClick={(e) => e.stopPropagation()}>
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
