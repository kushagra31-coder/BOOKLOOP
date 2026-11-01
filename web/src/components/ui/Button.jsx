import React from 'react';
import './Button.css';

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span className={loading ? 'btn-content-hidden' : 'btn-content'}>{children}</span>
    </button>
  );
}

