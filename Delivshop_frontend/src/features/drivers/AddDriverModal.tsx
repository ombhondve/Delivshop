import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser, CreateDriverPayload } from '../../types';
import { useNavigation } from '../../context/NavigationContext';

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
    employeeId: '', // Blank will trigger monotonic auto-generation on server
    password: 'Driver@12345',
    licenseNumber: '',
    licenseExpiry: '',
    licenseClass: 'LMV-TR',
    joiningDate: new Date().toISOString().split('T')[0],
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '',
    dateOfBirth: '',
    gender: 'MALE',
    emergencyContact: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    employmentStatus: 'ACTIVE',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdDriver, setCreatedDriver] = useState<DriverUser | null>(null);

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setCreatedDriver(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Driver full name is required');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Driver primary phone number is required');
      return;
    }
    if (formData.phone.trim().length < 8) {
      setError('Driver primary phone must be at least 8 digits');
      return;
    }

    try {
      setLoading(true);
      // Clean payload: Remove blank strings for optional fields and never include vehicle/fleet
      const cleanPayload: CreateDriverPayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        password: formData.password?.trim() || 'Driver@12345',
      };

      if (formData.alternatePhone?.trim()) cleanPayload.alternatePhone = formData.alternatePhone.trim();
      if (formData.email?.trim()) cleanPayload.email = formData.email.trim();
      if (formData.employeeId?.trim()) cleanPayload.employeeId = formData.employeeId.trim();
      if (formData.licenseNumber?.trim()) cleanPayload.licenseNumber = formData.licenseNumber.trim();
      if (formData.licenseExpiry?.trim()) cleanPayload.licenseExpiry = formData.licenseExpiry.trim();
      if (formData.licenseClass?.trim()) cleanPayload.licenseClass = formData.licenseClass.trim();
      if (formData.joiningDate?.trim()) cleanPayload.joiningDate = formData.joiningDate.trim();
      if (formData.address?.trim()) cleanPayload.address = formData.address.trim();
      if (formData.city?.trim()) cleanPayload.city = formData.city.trim();
      if (formData.state?.trim()) cleanPayload.state = formData.state.trim();
      if (formData.pincode?.trim()) cleanPayload.pincode = formData.pincode.trim();
      if (formData.dateOfBirth?.trim()) cleanPayload.dateOfBirth = formData.dateOfBirth.trim();
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
        backgroundColor: 'rgba(18, 61, 50, 0.45)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#DCFCE7',
                  color: '#16805D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={18} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Onboard New Driver Personnel
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 40px' }}>
              Register driver identity, mobile credentials, and contact details without vehicle assignment.
            </p>
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
          <div style={{ padding: '36px 28px', textAlign: 'center', overflowY: 'auto' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16805D',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#123D32', margin: '0 0 8px 0' }}>
              Driver Successfully Onboarded!
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '480px', margin: '0 auto 24px auto' }}>
              Driver record for <strong>{createdDriver.name}</strong> has been registered into the roster without vehicle allocation. Login access credentials have been provisioned.
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '20px',
                maxWidth: '440px',
                margin: '0 auto 28px auto',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Assigned Employee ID:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    color: '#16805D',
                    backgroundColor: '#DCFCE7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {createdDriver.employee_id}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Full Name:</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{createdDriver.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Primary Phone:</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{createdDriver.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Login Username:</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B' }}>{createdDriver.email || createdDriver.employee_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Vehicle & Route Allocation:</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#D97706' }}>Unassigned (Separate Module)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Button variant="secondary" onClick={handleResetAndClose}>
                Done / Back to Roster
              </Button>
              <Button
                variant="primary"
                onClick={handleOpenDetails}
                icon={<ExternalLink size={16} />}
              >
                Open Full Driver Profile
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

            {/* Note separating driver onboarding from vehicles/assignments */}
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={16} color="#3B82F6" />
              <span>
                <strong>Independent Onboarding:</strong> Vehicle allocations and route dispatches are managed separately under the <strong>Assignments</strong> section. Drivers can be onboarded without vehicle or fleet requirements.
              </span>
            </div>

            {/* Section 1: Personal & Contact Information */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#16805D',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <User size={15} /> 1. Personal & Contact Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Driver Full Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Primary Phone Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98234 11223"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Alternate / WhatsApp Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98234 55667"
                    value={formData.alternatePhone || ''}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh.kumar@delivshop.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
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
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender || 'MALE'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 8px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
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

            {/* Section 2: Residential Address */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#16805D',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <MapPin size={15} /> 2. Residential Address
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ gridColumn: 'span 4' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Street Address & Flat / House No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 302, Green Meadows, Katraj-Kondhwa Road"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 411048"
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Employment Identity */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#16805D',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shield size={15} /> 3. Employment Identity & Status
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={formData.employeeId || ''}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                    Leave blank for automatic sequential ID (e.g. EMP-DRV-1006)
                  </span>
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
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 8px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="ACTIVE">Active (Full-Time)</option>
                    <option value="PROBATION">Probationary</option>
                    <option value="ON_LEAVE">On Leave</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Driving License & Compliance */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#16805D',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={15} /> 4. Driving License & KYC Verification
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Commercial Driving License No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-2022-004512"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    License Validity Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    License Authorization Class
                  </label>
                  <select
                    value={formData.licenseClass || 'LMV-TR'}
                    onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 8px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="LMV-TR">LMV-TR (Commercial Transport)</option>
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="MCWG">MCWG (Motor Cycle with Gear)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div style={{ marginBottom: '20px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#16805D',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Phone size={15} /> 5. Emergency Contact (Next of Kin)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Kumar"
                    value={formData.emergencyContactName || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98222 00000"
                    value={formData.emergencyContactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Relationship
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spouse / Brother / Father"
                    value={formData.emergencyContactRelation || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Mobile App Credentials */}
            <div style={{ marginBottom: '16px', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#20342C',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={15} color="#16805D" /> 6. Driver Mobile App Credentials
              </h4>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                The driver will sign in using their <strong>Employee ID</strong> (or Email) and this initial access password.
              </p>
              <div style={{ maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Initial Access Password (Min 8 characters)
                </label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 10px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        {!createdDriver && (
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
            <Button variant="secondary" onClick={handleResetAndClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading} icon={<CheckCircle2 size={16} />}>
              {loading ? 'Registering Driver...' : 'Save & Onboard Driver'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
