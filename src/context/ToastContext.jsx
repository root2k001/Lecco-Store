import { createContext, useState, useContext, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((mensaje, tipo = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensaje, tipo }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-notification toast-${toast.tipo}`}>
            <div className="toast-icon">
              {toast.tipo === 'success' && '✓'}
              {toast.tipo === 'error' && '✕'}
              {toast.tipo === 'info' && 'i'}
            </div>
            <p>{toast.mensaje}</p>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
