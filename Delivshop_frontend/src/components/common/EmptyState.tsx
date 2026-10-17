import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`table-empty-container ${className}`}
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            marginBottom: '14px',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            maxWidth: '380px',
            margin: '6px 0 0',
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
};
