import React from 'react';
import './Spinner.css';

export function Spinner({
  size = 'md',
  label = 'Loading...',
  center = false,
  className = '',
}) {
  const spinnerElement = (
    <div
      className={`spinner spinner-${size} ${className}`}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );

  if (center) {
    return <div className="spinner-center">{spinnerElement}</div>;
  }

  return spinnerElement;
}

