import { createRoot } from 'react-dom/client';
import AlertModal from '../components/AlertModal';

let alertRoot = null;
let alertContainer = null;

// 确保 alertContainer 只创建一次
function getAlertContainer() {
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    document.body.appendChild(alertContainer);
    alertRoot = createRoot(alertContainer);
  }
  return alertRoot;
}

export function showAlert(message, type = 'info') {
  const root = getAlertContainer();

  const closeAlert = () => {
    root.unmount();
    if (alertContainer && alertContainer.parentNode) {
      document.body.removeChild(alertContainer);
    }
    alertContainer = null;
    alertRoot = null;
  };

  root.render(
    <AlertModal
      message={message}
      type={type}
      onClose={closeAlert}
    />
  );
}

// 简化的别名
export const alert = (message) => showAlert(message, 'info');
export const alertError = (message) => showAlert(message, 'error');
export const alertSuccess = (message) => showAlert(message, 'success');
