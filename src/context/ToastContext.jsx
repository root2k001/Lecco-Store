'use client';

import { createContext, useState, useContext, useCallback, useMemo } from 'react';
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

  // Valor estable: mostrar/ocultar un toast no re-renderiza a todos los consumidores
  const valor = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={valor}>
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
