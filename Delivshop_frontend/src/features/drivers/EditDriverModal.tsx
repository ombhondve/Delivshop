import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser, UpdateDriverPayload } from '../../types';

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
        dateOfBirth: driver.date_of_birth ? String(driver.date_of_birth).split('T')[0] : '',
        gender: driver.gender || 'MALE',
        emergencyContact: driver.emergency_contact || '',
        emergencyContactName: driver.emergency_contact_name || '',
        emergencyContactPhone: driver.emergency_contact_phone || '',
        emergencyContactRelation: driver.emergency_contact_relation || '',
        employmentStatus: driver.employment_status || 'ACTIVE',
        notes: driver.notes || '',
      });
      setError(null);
    }
  }, [driver]);

  if (!isOpen || !driver) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name?.trim()) {
      setError('Driver full name cannot be blank');
      return;
    }
    if (!formData.phone?.trim()) {
      setError('Driver phone number cannot be blank');
      return;
    }

    try {
      setLoading(true);
      const updated = await api.deliveries.updateDriver(driver.id, formData);
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
        backgroundColor: 'rgba(18, 61, 50, 0.45)',
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
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFAF7',
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#123D32', margin: 0 }}>
              Edit Driver Profile: {driver.name}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Employee ID: <code style={{ fontWeight: 600, color: '#16805D' }}>{driver.employee_id || 'N/A'}</code>
            </p>
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
              borderRadius: '6px',
            }}
          >
            <X size={20} />
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

          {/* Contact Details */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} /> Personal & Contact Details
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
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
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
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
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
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
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
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Gender
                </label>
                <select
                  value={formData.gender || 'MALE'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} /> Address & Location
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  City
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  State
                </label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Employment & Status */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} /> Employment Status & Identity
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employeeId || ''}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#F8FAFC' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Joining Date
                </label>
                <input
                  type="date"
                  value={formData.joiningDate || ''}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Employment Status
                </label>
                <select
                  value={formData.employmentStatus || 'ACTIVE'}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFFFFF' }}
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

          {/* License & Verification */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> License Details & Compliance
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Commercial License No.
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber || ''}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
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
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  License Class
                </label>
                <select
                  value={formData.licenseClass || 'LMV-TR'}
                  onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="LMV">LMV</option>
                  <option value="LMV-TR">LMV-TR (Commercial)</option>
                  <option value="HMV">HMV (Heavy)</option>
                  <option value="MCWG">MCWG</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} /> Emergency Contact (Next of Kin)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactName || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactRelation || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Operational Notes & Remarks
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
            />
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #E2E8F0',
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
            {loading ? 'Saving Changes...' : 'Save Driver Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
};
