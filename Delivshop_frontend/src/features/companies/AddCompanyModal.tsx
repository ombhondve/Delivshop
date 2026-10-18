import React, { useState } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  PlusCircle,
  MapPin,
  Navigation,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { CompanyType, CompanyStatus } from '../../types';
import { Button } from '../../components/common/Button';
import { InteractiveMapPicker } from '../shops/InteractiveMapPicker';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: () => void;
}

const COMPANY_TYPES: CompanyType[] = [
  'Dairy Processor',
  'Milk Producer Cooperative',
  'Wholesale Dairy Supplier',
  'Packaging & Feed Supplier',
  'Logistics Partner',
  'Other',
];

const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const INDIAN_GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const INDIAN_PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_REGEX = /^[+]?[0-9\s-]{10,15}$/;

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated,
}) => {
  // Section 1: Basic Information
  const [name, setName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('Dairy Processor');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<CompanyStatus>('ACTIVE');

  // Section 2: Contact Information
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [altPhone, setAltPhone] = useState('');

  // Section 3: Tax & Legal
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  // Section 4: Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Nashik');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // Section 5: GPS Pickup Location
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationMode, setLocationMode] = useState<'picker' | 'coordinates'>('picker');

  // Section 6: Notes
  const [notes, setNotes] = useState('');

  // State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Company name must be at least 2 characters';
    }

    if (companyCode.trim() && !/^[A-Za-z0-9_-]+$/.test(companyCode.trim())) {
      errs.companyCode = 'Company code can only contain letters, numbers, hyphens, and underscores';
    }

    if (!contactPerson.trim() || contactPerson.trim().length < 2) {
      errs.contactPerson = 'Contact person name is required';
    }

    if (!phone.trim() || !PHONE_REGEX.test(phone.trim())) {
      errs.phone = 'Valid phone number with at least 10 digits is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errs.email = 'Valid official email address is required';
    }

    if (altPhone.trim() && !PHONE_REGEX.test(altPhone.trim())) {
      errs.altPhone = 'Invalid alternative phone format';
    }

    if (gstin.trim() && !INDIAN_GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
      errs.gstin = 'Invalid Indian GSTIN format (e.g. 27AAAAA0000A1Z5)';
    }

    if (pan.trim() && !INDIAN_PAN_REGEX.test(pan.trim().toUpperCase())) {
      errs.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
    }

    if (!addressLine1.trim() || addressLine1.trim().length < 3) {
      errs.addressLine1 = 'Address Line 1 is required (at least 3 characters)';
    }

    if (!city.trim()) {
      errs.city = 'City is required';
    }

    if (!state.trim()) {
      errs.state = 'State is required';
    }

    if (!postalCode.trim() || !INDIAN_PINCODE_REGEX.test(postalCode.trim())) {
      errs.postalCode = 'Valid 6-digit Indian PIN code is required';
    }

    if (latitude.trim() || longitude.trim()) {
      const latNum = parseFloat(latitude.trim());
      const lngNum = parseFloat(longitude.trim());
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.latitude = 'Latitude must be between -90 and 90';
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errs.longitude = 'Longitude must be between -180 and 180';
      }
      if ((!latitude.trim() && longitude.trim()) || (latitude.trim() && !longitude.trim())) {
        errs.coordinates = 'Both latitude and longitude are required to save company GPS location';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setName('');
    setCompanyCode('');
    setCompanyType('Dairy Processor');
    setDescription('');
    setLogoUrl('');
    setStatus('ACTIVE');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAltPhone('');
    setGstin('');
    setPan('');
    setRegistrationNumber('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('Nashik');
    setState('Maharashtra');
    setPostalCode('');
    setCountry('India');
    setLatitude('');
    setLongitude('');
    setNotes('');
    setErrors({});
    setSubmitError(null);
  };

  const handleSubmit = async (e?: React.FormEvent, addAnother = false) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    setSuccessMessage(null);

    if (!validate()) {
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      el?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        companyCode: companyCode.trim() || undefined,
        companyType,
        description: description.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        status,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        altPhone: altPhone.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        pan: pan.trim().toUpperCase() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'India',
        latitude: latitude.trim() ? parseFloat(latitude.trim()) : undefined,
        longitude: longitude.trim() ? parseFloat(longitude.trim()) : undefined,
        notes: notes.trim() || undefined,
      };

      const created = await api.companies.create(payload);
      onCompanyCreated();

      if (addAnother) {
        setSuccessMessage(`"${created.name}" created with code ${created.companyCode}. Ready for next company.`);
        resetForm();
      } else {
        onClose();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create company. Please check input details.');
    } finally {
      setIsSubmitting(false);
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
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-company-title"
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
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
            padding: '20px 28px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-navy)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <h3
                id="add-company-title"
                style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: 0 }}
              >
                Add New Dairy Company
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Register a supplier entity, cooperative, or milk processor in the distribution network
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => handleSubmit(e, false)}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* Alerts */}
          {submitError && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                color: '#B91C1C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              role="alert"
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{submitError}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #6EE7B7',
                borderRadius: '10px',
                color: '#065F46',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              role="alert"
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Basic Information
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sahyadri Dairy Producers Cooperative"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.name ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.name && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.name}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Code <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Leave blank to auto-generate)</span>
                </label>
                <input
                  id="field-companyCode"
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CMP-1001 or SHY-DAIRY"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.companyCode ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.companyCode && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.companyCode}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Type
                </label>
                <select
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value as CompanyType)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {COMPANY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CompanyStatus)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ACTIVE">ACTIVE (Operational)</option>
                  <option value="INACTIVE">INACTIVE (Dormant)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Logo URL <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description / Processing Focus <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Chilling center with 50,000L daily pasteurization capacity"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Contact Information
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Contact Person <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-contactPerson"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.contactPerson ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.contactPerson && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.contactPerson}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Official Phone <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9822012345"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.phone ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.phone && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.phone}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Official Email <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. info@sahyadridairy.com"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.email ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.email && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.email}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Alternative Phone <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="e.g. 0253 2345678"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.altPhone ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.altPhone && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.altPhone}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Business & Tax Identifiers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Business & Tax Identifiers
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  GSTIN <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  id="field-gstin"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.gstin ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.gstin && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.gstin}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  PAN <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  id="field-pan"
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.pan ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.pan && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.pan}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Registration Number <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. FSSAI / Udyam / Cooperative Reg No"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operational Facility Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Operational Address
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Address Line 1 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-addressLine1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street / Facility / Industrial Plot / Sector"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.addressLine1 ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.addressLine1 && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.addressLine1}</p>}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Address Line 2 <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Landmark / Suite / Building name"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  City <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Nashik"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.city ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.city && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.city}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  State <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.state ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.state && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.state}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  PIN Code <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="field-postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 422010"
                  maxLength={6}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.postalCode ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.postalCode && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.postalCode}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 5: GPS Pickup Location & Proximity Anchor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  5. Company Pickup Location & GPS Coordinates
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Required for Driver App 300-metre proximity verification to unlock collection quantities
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setLocationMode('picker')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: locationMode === 'picker' ? '#1E3A8A' : '#FFFFFF',
                    color: locationMode === 'picker' ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MapPin size={12} /> Map Pin Picker
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('coordinates')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: locationMode === 'coordinates' ? '#1E3A8A' : '#FFFFFF',
                    color: locationMode === 'coordinates' ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Navigation size={12} /> Direct Coordinates
                </button>
              </div>
            </div>

            {errors.coordinates && (
              <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '12px' }}>
                {errors.coordinates}
              </div>
            )}

            {/* Visual Map Pin Picker */}
            {locationMode === 'picker' && (
              <InteractiveMapPicker
                latitude={latitude ? parseFloat(latitude) : null}
                longitude={longitude ? parseFloat(longitude) : null}
                onChange={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
              />
            )}

            {/* Coordinates Inputs & Live Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Latitude (-90.0 to 90.0)
                </label>
                <input
                  id="field-latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 20.091100"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.latitude ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.latitude && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.latitude}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Longitude (-180.0 to 180.0)
                </label>
                <input
                  id="field-longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 73.916800"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: errors.longitude ? '1px solid #EF4444' : '1px solid #A7AE9F',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.longitude && <p style={{ color: '#EF4444', fontSize: '11.5px', margin: '4px 0 0 0' }}>{errors.longitude}</p>}
              </div>
            </div>

            {latitude && longitude && !errors.latitude && !errors.longitude && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '8px', fontSize: '12.5px', color: '#065F46', flexWrap: 'wrap' }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>
                  <strong>Confirmed GPS Anchor:</strong> {latitude}, {longitude}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 'auto', color: '#0284C7', textDecoration: 'underline', fontSize: '11.5px' }}
                >
                  Verify on Google Maps ↗
                </a>
              </div>
            )}
          </div>

          {/* Section 6: Additional Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                6. Internal Notes
              </h4>
            </div>

            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal administrator notes, contracts, or procurement terms..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #A7AE9F',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
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
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(undefined, true)}
              disabled={isSubmitting}
              icon={<PlusCircle size={15} />}
            >
              Save & Add Another
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(undefined, false)}
              loading={isSubmitting}
              icon={<Save size={15} />}
            >
              Save Company
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

