import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Shield,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  Lock,
  MapPin,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { AutocompleteInput, AutocompleteOption } from '../../components/common/AutocompleteInput';
import { api } from '../../services/api/endpoints';
import { DriverUser, CreateDriverPayload } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import {
  searchStates,
  searchCities,
  getCitiesForState,
  isValidCity,
} from '../../utils/indianLocations';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (driver: DriverUser) => void;
}

export const AddDriverModal: React.FC<AddDriverModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { navigate } = useNavigation();

  const [formData, setFormData] = useState<CreateDriverPayload>({
    name: '',
    phone: '',
    alternatePhone: '',
    email: '',
    employeeId: '',
    licenseNumber: '',
    licenseExpiry: '',
    licenseClass: 'LMV-TR',
    joiningDate: new Date().toISOString().split('T')[0],
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '',
    gender: 'MALE',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    employmentStatus: 'ACTIVE',
    notes: '',
  });

  const [generatedEmpId, setGeneratedEmpId] = useState<string>('');
  const [isGeneratingId, setIsGeneratingId] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationErrors, setLocationErrors] = useState<{ state?: string; city?: string }>({});
  const [createdDriver, setCreatedDriver] = useState<DriverUser | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopyPassword = () => {
    if (createdDriver?.credentials?.temporaryPassword) {
      navigator.clipboard.writeText(createdDriver.credentials.temporaryPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  // Automatically fetch or generate unique Employee ID on popup open
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setIsGeneratingId(true);
      setError(null);
      setLocationErrors({});

      api.deliveries
        .generateEmployeeId()
        .then((res) => {
          if (isMounted && res.employeeId) {
            setGeneratedEmpId(res.employeeId);
            setFormData((prev) => ({ ...prev, employeeId: res.employeeId }));
          }
        })
        .catch((err) => {
          console.warn('Fallback generating client-side candidate ID:', err);
          let digits = '';
          for (let i = 0; i < 10; i++) {
            digits += Math.floor(Math.random() * 10).toString();
          }
          const candidate = `EMP-${digits}`;
          if (isMounted) {
            setGeneratedEmpId(candidate);
            setFormData((prev) => ({ ...prev, employeeId: candidate }));
          }
        })
        .finally(() => {
          if (isMounted) setIsGeneratingId(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Autocomplete Options for States
  const stateOptions = useMemo<AutocompleteOption[]>(() => {
    const query = formData.state || '';
    return searchStates(query).map((s) => ({
      label: s,
      value: s,
      secondary: `${getCitiesForState(s).length} registered locations`,
    }));
  }, [formData.state]);

  // Autocomplete Options for Cities / Villages
  const cityOptions = useMemo<AutocompleteOption[]>(() => {
    if (!formData.state || !formData.state.trim()) return [];
    const query = formData.city || '';
    const results = searchCities(query, formData.state);

    const options: AutocompleteOption[] = results.map((entry) => ({
      label: entry.city,
      value: entry.city,
      secondary: entry.state,
    }));

    // If user has typed a custom village/city not present in dataset, allow choosing it
    const trimmedQuery = query.trim();
    if (
      trimmedQuery.length >= 2 &&
      !results.some((r) => r.city.toLowerCase() === trimmedQuery.toLowerCase())
    ) {
      options.unshift({
        label: `"${trimmedQuery}" (Custom village/city in ${formData.state})`,
        value: trimmedQuery,
        badge: 'Custom Location',
        secondary: formData.state,
      });
    }

    return options;
  }, [formData.city, formData.state]);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setCreatedDriver(null);
    setError(null);
    setLocationErrors({});
    setLoading(false);
    onClose();
  };

  const handleStateChange = (newState: string) => {
    setLocationErrors((prev) => ({ ...prev, state: undefined }));
    setFormData((prev) => {
      // Clear city if state has changed so an invalid state-city combination cannot be saved
      const stateChanged = (prev.state || '').trim().toLowerCase() !== newState.trim().toLowerCase();
      return {
        ...prev,
        state: newState,
        city: stateChanged ? '' : prev.city,
      };
    });
  };

  const handleStateSelect = (selectedState: string) => {
    setLocationErrors((prev) => ({ ...prev, state: undefined }));
    setFormData((prev) => {
      const stateChanged = (prev.state || '').trim().toLowerCase() !== selectedState.trim().toLowerCase();
      return {
        ...prev,
        state: selectedState,
        city: stateChanged ? '' : prev.city,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocationErrors({});

    if (!formData.name?.trim()) {
      setError('Driver full name is required');
      return;
    }
    if (!formData.phone?.trim()) {
      setError('Driver primary phone number is required');
      return;
    }
    if (formData.phone.trim().length < 8) {
      setError('Driver primary phone must be at least 8 digits');
      return;
    }

    if (!formData.state?.trim()) {
      setLocationErrors({ state: 'Please select or enter the state' });
      setError('Driver state is required');
      return;
    }

    if (!formData.city?.trim()) {
      setLocationErrors({ city: 'Please select or enter a city or village' });
      setError('Driver city or village is required');
      return;
    }

    // Validate that city does not contradict a known different state
    if (!isValidCity(formData.city.trim(), formData.state.trim())) {
      setLocationErrors({ city: `"${formData.city}" does not match the selected state (${formData.state})` });
      setError(`Invalid location: "${formData.city}" does not belong to ${formData.state}`);
      return;
    }

    try {
      setLoading(true);

      // Clean payload: send validated data without requiring birth date or password
      const cleanPayload: CreateDriverPayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        employeeId: generatedEmpId || formData.employeeId || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
      };

      if (formData.alternatePhone?.trim()) cleanPayload.alternatePhone = formData.alternatePhone.trim();
      if (formData.email?.trim()) cleanPayload.email = formData.email.trim();
      if (formData.licenseNumber?.trim()) cleanPayload.licenseNumber = formData.licenseNumber.trim();
      if (formData.licenseExpiry?.trim()) cleanPayload.licenseExpiry = formData.licenseExpiry.trim();
      if (formData.licenseClass?.trim()) cleanPayload.licenseClass = formData.licenseClass.trim();
      if (formData.joiningDate?.trim()) cleanPayload.joiningDate = formData.joiningDate.trim();
      if (formData.address?.trim()) cleanPayload.address = formData.address.trim();
      if (formData.pincode?.trim()) cleanPayload.pincode = formData.pincode.trim();
      if (formData.gender?.trim()) cleanPayload.gender = formData.gender.trim();
      if (formData.employmentStatus?.trim()) cleanPayload.employmentStatus = formData.employmentStatus.trim();
      if (formData.emergencyContactName?.trim()) cleanPayload.emergencyContactName = formData.emergencyContactName.trim();
      if (formData.emergencyContactPhone?.trim()) cleanPayload.emergencyContactPhone = formData.emergencyContactPhone.trim();
      if (formData.emergencyContactRelation?.trim()) cleanPayload.emergencyContactRelation = formData.emergencyContactRelation.trim();
      if (formData.emergencyContact?.trim()) {
        cleanPayload.emergencyContact = formData.emergencyContact.trim();
      } else if (cleanPayload.emergencyContactPhone) {
        cleanPayload.emergencyContact = `${cleanPayload.emergencyContactName || ''} (${cleanPayload.emergencyContactPhone})`.trim();
      }
      if (formData.notes?.trim()) cleanPayload.notes = formData.notes.trim();

      const created = await api.deliveries.createDriver(cleanPayload);
      setCreatedDriver(created);
      onSuccess(created);
    } catch (err: any) {
      setError(err.message || 'Failed to onboard driver. Please review the details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = () => {
    if (createdDriver) {
      handleResetAndClose();
      navigate(`/admin/drivers/${createdDriver.id}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleResetAndClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
        {/* Header with Auto-Generated Employee ID in Top-Left */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                color: 'var(--color-primary, #16805D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
                  Add Driver
                </h3>
                {/* Auto-Generated Employee ID displayed in Top-Left, Read-Only */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 8px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: 'var(--color-primary, #16805D)',
                    letterSpacing: '0.02em',
                    userSelect: 'none',
                  }}
                  title="Auto-generated unique Driver Employee ID (read-only)"
                >
                  <Lock size={11} color="#64748B" />
                  <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    ID:
                  </span>
                  <span>{isGeneratingId ? 'Generating...' : generatedEmpId || formData.employeeId || 'EMP-AUTO'}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Screen after Onboarding */}
        {createdDriver ? (
          <div style={{ padding: '28px 24px', overflowY: 'auto' }}>
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--color-success, #16805D)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                marginBottom: '18px',
              }}
            >
              <CheckCircle2 color="var(--color-success, #16805D)" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ color: '#065F46', fontWeight: 700, fontSize: '15px', margin: 0 }}>
                  {createdDriver.name} added
                </h4>
                <p style={{ color: '#047857', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Driver profile created successfully.
                </p>
              </div>
            </div>

            {/* Official Employee ID / Driver Login Identifier Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Driver Login Identifier (Employee ID)
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#16805D', fontFamily: 'monospace', marginTop: '2px' }}>
                  {createdDriver.employee_id}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  Driver enters this Employee ID to sign in on the Delivshop Driver App.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    backgroundColor: '#E6F4EA',
                    color: '#16805D',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Single-Reveal Temporary Login Password Card */}
            {createdDriver.credentials?.temporaryPassword && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                  <ShieldAlert size={17} />
                  Single-Reveal Temporary Login Password
                </div>
                <p style={{ fontSize: '12px', color: '#7F1D1D', marginBottom: '12px', lineHeight: 1.4 }}>
                  This temporary password was generated and hashed with <strong>Argon2id</strong> following Delivshop authentication standards. For security, it will <strong>never be shown again</strong>. Provide it to the driver securely; they will be prompted to set a new password on first mobile login.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid #FCA5A5',
                      fontFamily: 'monospace',
                      fontSize: '16px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#991B1B',
                      userSelect: 'all',
                    }}
                  >
                    {createdDriver.credentials.temporaryPassword}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#B91C1C',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedPassword ? <Check size={15} /> : <Copy size={15} />}
                    {copiedPassword ? 'Copied!' : 'Copy Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Overview Details */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: '#64748B' }}>Full Name: </span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{createdDriver.name}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Phone: </span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{createdDriver.phone}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Location: </span>
                  <span style={{ fontWeight: 500, color: '#1E293B' }}>
                    {createdDriver.city ? `${createdDriver.city}, ${createdDriver.state || ''}` : createdDriver.state || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Vehicle: </span>
                  <span style={{ fontWeight: 600, color: '#D97706' }}>Unassigned</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={handleResetAndClose}>
                Done
              </Button>
              <Button
                variant="primary"
                onClick={handleOpenDetails}
                icon={<ExternalLink size={15} />}
              >
                View Details
              </Button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 22px', flex: 1 }}>
            {error && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#B91C1C',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Personal Details */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary, #16805D)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={15} /> Personal Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Full Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Phone <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9823411223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Alt Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9823455667"
                    value={formData.alternatePhone || ''}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@delivshop.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender || 'MALE'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 8px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Address */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary, #16805D)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={15} /> Address
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter street address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* State: Searchable & Selectable Dropdown */}
                <div>
                  <AutocompleteInput
                    id="driver-state-autocomplete"
                    label="State"
                    required
                    placeholder="Search or select state..."
                    value={formData.state || ''}
                    onChange={handleStateChange}
                    onSelect={(opt) => handleStateSelect(opt.value)}
                    options={stateOptions}
                    error={locationErrors.state}
                  />
                </div>

                {/* City: Searchable & Selectable Dropdown */}
                <div>
                  <AutocompleteInput
                    id="driver-city-autocomplete"
                    label="City"
                    required
                    disabled={!formData.state || !formData.state.trim()}
                    placeholder={
                      !formData.state || !formData.state.trim()
                        ? 'Select state first...'
                        : 'Search or type city...'
                    }
                    value={formData.city || ''}
                    onChange={(val) => {
                      setLocationErrors((prev) => ({ ...prev, city: undefined }));
                      setFormData((prev) => ({ ...prev, city: val }));
                    }}
                    onSelect={(opt) => {
                      setLocationErrors((prev) => ({ ...prev, city: undefined }));
                      setFormData((prev) => ({ ...prev, city: opt.value }));
                    }}
                    options={cityOptions}
                    error={locationErrors.city}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    PIN Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 411048"
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Employment */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary, #16805D)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shield size={15} /> Employment
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    <span>Employee ID</span>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Lock size={11} /> Read-only
                    </span>
                  </label>
                  <div
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F1F5F9',
                      color: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      userSelect: 'none',
                      cursor: 'not-allowed',
                    }}
                  >
                    <span>{generatedEmpId || formData.employeeId || 'EMP-AUTO'}</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#16805D', backgroundColor: '#E6F4EA', padding: '2px 6px', borderRadius: '4px' }}>
                      AUTO
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={formData.employmentStatus || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 8px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PROBATION">Probation</option>
                    <option value="ON_LEAVE">On Leave</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: License & KYC */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary, #16805D)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={15} /> License & KYC
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    License Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-2022-004512"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    License Expiry
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    License Class
                  </label>
                  <select
                    value={formData.licenseClass || 'LMV-TR'}
                    onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 8px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="LMV">LMV</option>
                    <option value="LMV-TR">LMV-TR</option>
                    <option value="HMV">HMV</option>
                    <option value="MCWG">MCWG</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div style={{ marginBottom: '16px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary, #16805D)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Phone size={15} /> Emergency Contact
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Kumar"
                    value={formData.emergencyContactName || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9822200000"
                    value={formData.emergencyContactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Relation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse"
                    value={formData.emergencyContactRelation || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #A7AE9F',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        {!createdDriver && (
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid #D6D3C8',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#FAFAF7',
            }}
          >
            <Button variant="secondary" onClick={handleResetAndClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading} icon={<CheckCircle2 size={16} />}>
              {loading ? 'Adding Driver...' : 'Add Driver'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
