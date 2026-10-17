import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  bodyClassName = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className={`modal-container modal-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            {icon && <div className="modal-icon-badge">{icon}</div>}
            <div>
              <h3 className="modal-title">{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className={`modal-body ${bodyClassName}`}>{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
