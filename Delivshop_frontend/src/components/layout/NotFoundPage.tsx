import React from 'react';
import { FileQuestion, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const NotFoundPage: React.FC = () => {
  const { navigate, goBack } = useNavigation();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #D6D3C8',
          boxShadow: '0 4px 16px rgba(18, 61, 50, 0.06)',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#F0FDF4',
            border: '2px solid #BBF7D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#168264',
          }}
        >
          <FileQuestion size={32} />
        </div>

        <span
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#E5B94E',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            display: 'inline-block',
            marginBottom: '6px',
          }}
        >
          Error 404
        </span>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#123D32',
            margin: '0 0 10px 0',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Page Not Found
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: '#64748B',
            lineHeight: 1.5,
            margin: '0 0 28px 0',
          }}
        >
          The requested dashboard section does not exist or may have been relocated.
          Please check the URL or use the navigation sidebar.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#168264',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#123D32')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#168264')}
          >
            <LayoutDashboard size={18} />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={goBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 20px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #A7AE9F',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

