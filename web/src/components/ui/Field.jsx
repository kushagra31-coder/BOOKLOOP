import React from 'react';
import './Field.css';

export function Field({
  id,
  label,
  error,
  hint,
  required = false,
  as = 'input',
  children,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const hintId = inputId ? `${inputId}-hint` : undefined;

  const Component = as;

  return (
    <div className={`field-wrapper ${error ? 'field-has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}

      <Component
        id={inputId}
        className={`field-control field-control-${as}`}
        aria-invalid={!!error}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        required={required}
        {...props}
      >
        {children}
      </Component>

      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

