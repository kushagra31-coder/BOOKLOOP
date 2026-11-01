import React from 'react';
import './Card.css';

export function Card({
  children,
  className = '',
  as = 'div',
  interactive = false,
  onClick,
  ...props
}) {
  const Component = as;
  const classes = [
    'card',
    interactive ? 'card-interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      className={classes}
      onClick={onClick}
      role={interactive && !onClick ? 'region' : undefined}
      {...props}
    >
      {children}
    </Component>
  );
}

