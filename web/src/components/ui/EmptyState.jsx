import React from 'react';
import './EmptyState.css';

export function EmptyState({
  title = 'No items found',
  description,
  action,
  icon,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

