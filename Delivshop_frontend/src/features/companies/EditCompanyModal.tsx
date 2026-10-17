import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Company, CompanyType, UpdateCompanyPayload } from '../../types';
import { api } from '../../services/api/endpoints';

interface EditCompanyModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onCompanyUpdated: (updatedCompany: Company) => void;
}

const COMPANY_TYPES: { value: CompanyType; label: string; desc: string }[] = [
  { value: 'DAIRY_PRODUCER', label: 'Dairy Producer', desc: 'Farms & collection centers providing raw milk' },
  { value: 'DISTRIBUTOR', label: 'Distributor', desc: 'Regional wholesale milk & dairy distributors' },
  { value: 'PROCESSOR', label: 'Dairy Processor', desc: 'Packaged dairy, curd, ghee, paneer plants' },
  { value: 'LOGISTICS_PARTNER', label: 'Logistics Partner', desc: 'Chilled transit & fleet service suppliers' },
  { value: 'OTHER', label: 'Other Supplier', desc: 'Packaging, feeds, or ancillary supplier' },
];

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  company,
  isOpen,
  onClose,
  onCompanyUpdated,
}) => {
  const [formData, setFormData] = useState<UpdateCompanyPayload>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (company && isOpen) {
      setFormData({
        name: company.name || '',
        companyType: company.companyType || 'DAIRY_PRODUCER',
        description: company.description || '',
        logoUrl: company.logoUrl || '',
        contactPerson: company.contactPerson || '',
        phone: company.phone || '',
        email: company.email || '',
        alternatePhone: company.alternatePhone || '',
        gstin: company.gstin || '',
        pan: company.pan || '',
        registrationNumber: company.registrationNumber || '',
        addressLine1: company.addressLine1 || '',
        addressLine2: company.addressLine2 || '',
        city: company.city || '',
        state: company.state || '',
        postalCode: company.postalCode || '',
        country: company.country || 'India',
        notes: company.notes || '',
      });
      setErrors({});
      setServerError(null);
      setSuccessMessage(null);
    }
  }, [company, isOpen]);

  if (!isOpen || !company) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Company name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Company name must be at least 2 characters';
    }

    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
        newErrors.phone = 'Valid 10-digit Indian mobile number required';
      }
    }

    if (formData.alternatePhone) {
      const cleanAlt = formData.alternatePhone.replace(/[\s-]/g, '');
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(cleanAlt)) {
        newErrors.alternatePhone = 'Valid 10-digit alternate phone required';
      }
    }

    if (formData.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = 'Valid email address required';
      }
    }

    if (formData.gstin) {
      const cleanGstin = formData.gstin.trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
        newErrors.gstin = 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)';
      }
    }

    if (formData.pan) {
      const cleanPan = formData.pan.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        newErrors.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
      }
    }

    if (formData.postalCode) {
      const cleanPin = formData.postalCode.trim();
      if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
        newErrors.postalCode = 'Valid 6-digit Indian PIN code required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const payload: UpdateCompanyPayload = {
        name: formData.name?.trim(),
        companyType: formData.companyType,
        description: formData.description?.trim() || undefined,
        logoUrl: formData.logoUrl?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim().toLowerCase() || undefined,
        alternatePhone: formData.alternatePhone?.trim() || undefined,
        gstin: formData.gstin?.trim().toUpperCase() || undefined,
        pan: formData.pan?.trim().toUpperCase() || undefined,
        registrationNumber: formData.registrationNumber?.trim() || undefined,
        addressLine1: formData.addressLine1?.trim() || undefined,
        addressLine2: formData.addressLine2?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        postalCode: formData.postalCode?.trim() || undefined,
        country: formData.country?.trim() || 'India',
        notes: formData.notes?.trim() || undefined,
      };

      const res = await api.companies.update(company.id, payload);
      if (res) {
        setSuccessMessage('Company profile updated successfully.');
        onCompanyUpdated(res);
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update company';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAF9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                  Edit Company Profile
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Lock size={11} />
                  {company.companyCode}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Update organizational info, registered address, and tax credentials
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#64748B',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {serverError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{serverError}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '8px',
                color: '#166534',
                fontSize: '13px',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <Building2 size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Basic Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Godavari Dairy Producer Ltd"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.name ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.name && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Code (System Assigned)
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '8px',
                    border: '1px solid #D6D3C8',
                    fontSize: '14px',
                    color: '#64748B',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                  }}
                >
                  <Lock size={14} color="#94A3B8" />
                  {company.companyCode}
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto', fontWeight: 'normal', fontFamily: 'inherit' }}>
                    Immutable
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Type
                </label>
                <select
                  value={formData.companyType || 'DAIRY_PRODUCER'}
                  onChange={(e) => setFormData({ ...formData, companyType: e.target.value as CompanyType })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {COMPANY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} — {t.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description / Specialization
              </label>
              <textarea
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of operations, distribution reach, or milk grades supplied..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #A7AE9F',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <Phone size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Contact Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Contact Person
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Ramesh Patil"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: '8px',
                      border: '1px solid #A7AE9F',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Official Phone
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: '#94A3B8' }} />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9822012345"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.phone ? '#EF4444' : '#A7AE9F'}`,
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {errors.phone && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Official Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: '#94A3B8' }} />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="supply@company.com"
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.email ? '#EF4444' : '#A7AE9F'}`,
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {errors.email && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone || ''}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  placeholder="Optional secondary contact"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.alternatePhone ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.alternatePhone && (
                  <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.alternatePhone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Business and Tax Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <FileText size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Tax & Registration Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AAAAA0000A1Z5"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.gstin ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.gstin && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.gstin}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  PAN
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.pan || ''}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.pan ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.pan && <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.pan}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  FSSAI / Reg. Number
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="e.g. 11521019000123"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <MapPin size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Registered Address
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.addressLine1 || ''}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Plot / Street / MIDC Area"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2 || ''}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Landmark, Sector, Ward"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  City
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Nashik"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  State
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Maharashtra"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.postalCode || ''}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="422001"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.postalCode ? '#EF4444' : '#A7AE9F'}`,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.postalCode && (
                  <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.postalCode}</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country || 'India'}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Internal Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <FileText size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                5. Internal Notes & Compliance
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Administrative Notes (Internal Only)
              </label>
              <textarea
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Payment terms, contract renewals, inspection certificates, or SLA notes..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #A7AE9F',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #D6D3C8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #A7AE9F',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSubmitting ? '#94A3B8' : 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

