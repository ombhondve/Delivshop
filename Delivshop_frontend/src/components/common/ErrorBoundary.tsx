import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[Delivshop ErrorBoundary] Uncaught runtime rendering error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/admin/dashboard';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div
          style={{
            minHeight: '360px',
            padding: '32px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div
            style={{
              maxWidth: '620px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
              padding: '28px 32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#DC2626',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {this.props.title || 'Display Interruption'}
                </h3>
                <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  The application encountered an unexpected runtime exception while rendering this view.
                  Your authentication session and data remain safe.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                border: '1px solid #FECACA',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '4px' }}>
                Error Diagnostic:
              </div>
              <code
                style={{
                  fontSize: '12.5px',
                  color: '#B91C1C',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                  display: 'block',
                }}
              >
                {errorMessage}
              </code>
            </div>

            {componentStack && (
              <details
                style={{
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Technical Stack Trace & Details
                </summary>
                <pre
                  style={{
                    padding: '12px',
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    borderRadius: '6px',
                    fontSize: '11px',
                    overflowX: 'auto',
                    maxHeight: '180px',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {componentStack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                flexWrap: 'wrap',
                paddingTop: '12px',
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Home size={15} />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#047857',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
