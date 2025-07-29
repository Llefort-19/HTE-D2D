import React, { useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const Toast = ({ toast }) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => removeToast(toast.id), 300); // Wait for exit animation
  };

  const getToastStyles = () => {
    const baseStyles = {
      position: 'relative',
      padding: '12px 16px',
      marginBottom: '8px',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid',
      minWidth: '300px',
      maxWidth: '400px',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible ? 1 : 0,
      transition: 'all 0.3s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1000,
    };

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: '#d4edda',
          borderColor: '#c3e6cb',
          color: '#155724',
        };
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          color: '#721c24',
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: '#fff3cd',
          borderColor: '#ffeaa7',
          color: '#856404',
        };
      case 'info':
      default:
        return {
          ...baseStyles,
          backgroundColor: '#d1ecf1',
          borderColor: '#bee5eb',
          color: '#0c5460',
        };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div style={getToastStyles()}>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <span style={{ 
          marginRight: '8px', 
          fontSize: '16px', 
          fontWeight: 'bold' 
        }}>
          {getIcon()}
        </span>
        <span style={{ fontSize: '14px' }}>{toast.message}</span>
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.7,
          marginLeft: '8px',
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.target.style.opacity = 1}
        onMouseLeave={(e) => e.target.style.opacity = 0.7}
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer; 