import React, { useEffect } from 'react';
import './Toast.css';

export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 4000,
  className = '',
}) {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`toast toast-${type} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-message">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="toast-close"
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
}

