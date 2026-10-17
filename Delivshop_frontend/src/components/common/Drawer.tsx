import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  metrics?: React.ReactNode;
  tabs?: DrawerTab[];
  activeTab?: string;
  onSelectTab?: (tabId: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerActions,
  metrics,
  tabs,
  activeTab,
  onSelectTab,
  children,
  footer,
  maxWidth = '760px',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="drawer-panel"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon && (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #BFDBFE',
                }}
              >
                {icon}
              </div>
            )}
            <div>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    margin: '2px 0 0',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {headerActions}
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Optional KPI Metrics Bar */}
        {metrics && <div className="drawer-metric-grid">{metrics}</div>}

        {/* Optional Tabs Bar */}
        {tabs && tabs.length > 0 && (
          <div className="drawer-tabs-bar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`drawer-tab-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectTab && onSelectTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isActive
                          ? 'var(--color-primary-subtle)'
                          : 'var(--bg-muted)',
                        color: isActive
                          ? 'var(--color-primary)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="drawer-body">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
