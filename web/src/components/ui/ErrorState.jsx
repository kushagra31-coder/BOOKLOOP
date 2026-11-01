import React from 'react';
import './ErrorState.css';
import { Button } from './Button';

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}) {
  return (
    <div className={`error-state ${className}`} role="alert">
      <div className="error-state-badge" aria-hidden="true">!</div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="error-state-btn">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

