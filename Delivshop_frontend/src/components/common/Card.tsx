import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  action,
  icon,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`business-card ${noPadding ? 'no-padding' : ''} ${className}`}>
      {(title || action || icon) && (
        <div className="card-header">
          <div className="card-header-left">
            {icon && <div className="card-header-icon">{icon}</div>}
            <div>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className={`card-body ${noPadding ? 'no-padding' : ''}`}>{children}</div>
    </div>
  );
};
