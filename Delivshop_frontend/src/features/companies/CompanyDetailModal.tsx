import React from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  Package,
  Edit2,
  Power,
  Copy,
  Check,
  Tag,
} from 'lucide-react';
import { Company } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

interface CompanyDetailModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (company: Company) => void;
  onToggleStatus: (company: Company) => void;
}

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  company,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !company) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-detail-title"
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1px solid #D6D3C8',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-navy)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {getInitials(company.name)}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2
                  id="company-detail-title"
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#1F2937',
                    margin: 0,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {company.name}
                </h2>
                <Badge variant={company.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {company.status}
                </Badge>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '6px',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#D6D3C8',
                    color: '#334155',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  {company.companyCode}
                </span>
                <span>•</span>
                <span>{company.companyType}</span>
                <span>•</span>
                <span>{company.city}, {company.state}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Associated Products
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {company.productsCount ?? 0}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Operational State
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: company.status === 'ACTIVE' ? 'var(--color-success)' : '#64748B', marginTop: '6px' }}>
                {company.status === 'ACTIVE' ? 'Active & Processing' : 'Inactive / Paused'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Registered Date
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '6px' }}>
                {formatDate(company.createdAt)}
              </div>
            </div>
          </div>

          {/* Description if present */}
          {company.description && (
            <div
              style={{
                marginBottom: '24px',
                padding: '14px 18px',
                backgroundColor: '#FEFCE8',
                border: '1px solid #FEF08A',
                borderRadius: '10px',
                color: '#713F12',
                fontSize: '13.5px',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Company Profile & Capabilities
              </strong>
              {company.description}
            </div>
          )}

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Contact Person & Communications */}
            <div
              style={{
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Phone size={16} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>
                  Contact Information
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>CONTACT PERSON</span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{company.contactPerson}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>OFFICIAL PHONE</span>
                  <a
                    href={`tel:${company.phone}`}
                    style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {company.phone}
                  </a>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>OFFICIAL EMAIL</span>
                  <a
                    href={`mailto:${company.email}`}
                    style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {company.email}
                  </a>
                </div>
                {company.altPhone && (
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>ALTERNATIVE CONTACT</span>
                    <a
                      href={`tel:${company.altPhone}`}
                      style={{ color: '#334155', textDecoration: 'none' }}
                    >
                      {company.altPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Business & Tax Identifiers */}
            <div
              style={{
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <ShieldCheck size={16} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>
                  Business & Tax Information
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>GSTIN</span>
                  {company.gstin ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1F2937' }}>
                        {company.gstin}
                      </span>
                      <button
                        onClick={() => copyToClipboard(company.gstin!, 'gstin')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                        title="Copy GSTIN"
                      >
                        {copiedKey === 'gstin' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>Not provided</span>
                  )}
                </div>

                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>PAN</span>
                  {company.pan ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1F2937' }}>
                        {company.pan}
                      </span>
                      <button
                        onClick={() => copyToClipboard(company.pan!, 'pan')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                        title="Copy PAN"
                      >
                        {copiedKey === 'pan' ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>Not provided</span>
                  )}
                </div>

                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '11.5px', fontWeight: 600 }}>REGISTRATION NUMBER</span>
                  <span style={{ color: company.registrationNumber ? '#1F2937' : '#94A3B8' }}>
                    {company.registrationNumber || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div
              style={{
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <MapPin size={16} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>
                  Operational Facility Address
                </h4>
              </div>

              <div style={{ color: '#334155', fontSize: '13px', lineHeight: 1.6 }}>
                <div>{company.addressLine1}</div>
                {company.addressLine2 && <div>{company.addressLine2}</div>}
                <div style={{ fontWeight: 600, marginTop: '4px' }}>
                  {company.city}, {company.state} — {company.postalCode}
                </div>
                <div style={{ color: '#64748B', fontSize: '12px' }}>{company.country}</div>
              </div>
            </div>

            {/* Internal Notes / System Info */}
            <div
              style={{
                border: '1px solid #D6D3C8',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <FileText size={16} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>
                  Internal Records & Audit
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Created On: </span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{formatDate(company.createdAt)}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Last Updated: </span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{formatDate(company.updatedAt)}</span>
                </div>
                {company.notes && (
                  <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>OPERATOR NOTES</span>
                    <p style={{ margin: '4px 0 0 0', color: '#475569', fontStyle: 'italic' }}>
                      "{company.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #D6D3C8',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <Button
            variant="outline"
            onClick={() => onToggleStatus(company)}
            icon={<Power size={15} />}
          >
            {company.status === 'ACTIVE' ? 'Deactivate Company' : 'Activate Company'}
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit(company);
              }}
              icon={<Edit2 size={15} />}
            >
              Edit Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

