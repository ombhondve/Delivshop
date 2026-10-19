import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { AutocompleteInput, AutocompleteOption } from '../../components/common/AutocompleteInput';
import { api } from '../../services/api/endpoints';
import { DriverUser, UpdateDriverPayload } from '../../types';
import {
  searchStates,
  searchCities,
  getCitiesForState,
  isValidCity,
} from '../../utils/indianLocations';

interface EditDriverModalProps {
  isOpen: boolean;
  driver: DriverUser | null;
  onClose: () => void;
  onSuccess: (updated: DriverUser) => void;
}

export const EditDriverModal: React.FC<EditDriverModalProps> = ({
  isOpen,
  driver,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<UpdateDriverPayload>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationErrors, setLocationErrors] = useState<{ state?: string; city?: string }>({});

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name || '',
        phone: driver.phone || '',
        alternatePhone: driver.alternate_phone || '',
        email: driver.email || '',
        employeeId: driver.employee_id || '',
        licenseNumber: driver.license_number || '',
        licenseExpiry: driver.license_expiry ? String(driver.license_expiry).split('T')[0] : '',
        licenseClass: driver.license_class || 'LMV-TR',
        joiningDate: driver.joining_date ? String(driver.joining_date).split('T')[0] : '',
        address: driver.address || '',
        city: driver.city || '',
        state: driver.state || '',
        pincode: driver.pincode || '',
        gender: driver.gender || 'MALE',
        emergencyContact: driver.emergency_contact || '',
        emergencyContactName: driver.emergency_contact_name || '',
        emergencyContactPhone: driver.emergency_contact_phone || '',
        emergencyContactRelation: driver.emergency_contact_relation || '',
        employmentStatus: driver.employment_status || 'ACTIVE',
        notes: driver.notes || '',
      });
      setError(null);
      setLocationErrors({});
    }
  }, [driver]);

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

  if (!isOpen || !driver) return null;

  const handleStateChange = (newState: string) => {
    setLocationErrors((prev) => ({ ...prev, state: undefined }));
    setFormData((prev) => {
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
      setError('Driver full name cannot be blank');
      return;
    }
    if (!formData.phone?.trim()) {
      setError('Driver phone number cannot be blank');
      return;
    }

    if (formData.state?.trim() && formData.city?.trim()) {
      if (!isValidCity(formData.city.trim(), formData.state.trim())) {
        setLocationErrors({ city: `"${formData.city}" does not match ${formData.state}` });
        setError(`Invalid location: "${formData.city}" does not belong to ${formData.state}`);
        return;
      }
    }

    try {
      setLoading(true);
      // Clean payload: send validated data without birth date
      const payload: UpdateDriverPayload = {
        name: formData.name?.trim(),
        phone: formData.phone?.trim(),
        alternatePhone: formData.alternatePhone?.trim() || null,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        pincode: formData.pincode?.trim() || null,
        gender: formData.gender || null,
        licenseNumber: formData.licenseNumber?.trim() || null,
        licenseExpiry: formData.licenseExpiry || null,
        licenseClass: formData.licenseClass || null,
        joiningDate: formData.joiningDate || null,
        emergencyContactName: formData.emergencyContactName?.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: formData.emergencyContactRelation?.trim() || null,
        emergencyContact: formData.emergencyContactPhone?.trim()
          ? `${formData.emergencyContactName?.trim() || ''} (${formData.emergencyContactPhone.trim()})`.trim()
          : null,
        employmentStatus: formData.employmentStatus,
        notes: formData.notes?.trim() || null,
      };

      const updated = await api.deliveries.updateDriver(driver.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update driver details.');
    } finally {
      setLoading(false);
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
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #D6D3C8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFAF7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                color: 'var(--color-primary, #16805D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Edit Driver Profile: {driver.name}
                </h3>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {driver.employee_id || 'N/A'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Update driver contact, residential location, and KYC credentials.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
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

          {/* Section 1: Contact Details */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary, #16805D)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} /> 1. Personal & Contact Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Driver Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mobile Phone Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone || ''}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Gender
                </label>
                <select
                  value={formData.gender || 'MALE'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', backgroundColor: '#FFFFFF', outline: 'none' }}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Residential Address & Dependent City/Village */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary, #16805D)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> 2. Residential Address & Location
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              {/* State Autocomplete */}
              <div>
                <AutocompleteInput
                  id="edit-driver-state"
                  label="State"
                  placeholder="Select or type state..."
                  value={formData.state || ''}
                  onChange={handleStateChange}
                  onSelect={(opt) => handleStateSelect(opt.value)}
                  options={stateOptions}
                  error={locationErrors.state}
                  hint="Select state first"
                />
              </div>

              {/* City / Village Autocomplete */}
              <div>
                <AutocompleteInput
                  id="edit-driver-city"
                  label="City / Village"
                  disabled={!formData.state || !formData.state.trim()}
                  placeholder={
                    !formData.state || !formData.state.trim()
                      ? 'Select state first...'
                      : 'Search or type city/village...'
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
                  hint={
                    !formData.state || !formData.state.trim()
                      ? 'Requires state selection'
                      : `${cityOptions.length} suggested locations`
                  }
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Driving License & Employment */}
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary, #16805D)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} /> 3. Driving License & Employment Status
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber || ''}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  License Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.licenseExpiry || ''}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Employment Status
                </label>
                <select
                  value={formData.employmentStatus || 'ACTIVE'}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', backgroundColor: '#FFFFFF', outline: 'none' }}
                >
                  <option value="ACTIVE">Active (Full-Time)</option>
                  <option value="PROBATION">Probationary</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
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
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading} icon={<CheckCircle2 size={16} />}>
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};
