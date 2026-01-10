import { useState } from 'react';
import AlertModal from '../components/AlertModal';

export function useAlert() {
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
  };

  const hideAlert = () => {
    setAlert(null);
  };

  const AlertComponent = alert ? (
    <AlertModal
      key={alert.message}
      message={alert.message}
      type={alert.type}
      onClose={hideAlert}
    />
  ) : null;

  return {
    showAlert,
    hideAlert,
    AlertComponent
  };
}
