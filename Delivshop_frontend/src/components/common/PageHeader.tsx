import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div className={`page-header-wrapper ${className}`} style={{ marginBottom: '16px' }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumbs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            marginBottom: '6px',
          }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
                {crumb.onClick && !isLast ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--color-primary)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                    }}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    style={{
                      fontWeight: isLast ? 600 : 400,
                      color: isLast ? 'var(--text-primary)' : 'inherit',
                    }}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title Row & Actions */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-title">{title}</h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && <p className="page-desc">{subtitle}</p>}
        </div>

        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
};
