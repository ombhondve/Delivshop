import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Truck,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
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
        email: driver.email || '',
        employeeId: driver.employee_id || '',
        vehicleNumber: driver.vehicle_number || '',
        vehicleType: driver.vehicle_type || 'Refrigerated Van (1.5 Ton)',
        assignedRoute: driver.assigned_route || '',
        licenseNumber: driver.license_number || '',
        licenseExpiry: driver.license_expiry ? String(driver.license_expiry).split('T')[0] : '',
        joiningDate: driver.joining_date ? String(driver.joining_date).split('T')[0] : '',
        emergencyContact: driver.emergency_contact || '',
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
          maxWidth: '680px',
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
              Employee ID: <code style={{ fontWeight: 600 }}>{driver.employee_id || 'N/A'}</code>
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
                  Driver Full Name
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
                  Mobile Phone Number
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
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact || ''}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Vehicle & Route */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={14} /> Assigned Vehicle & Route
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Vehicle Reg No.
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Vehicle Class
                </label>
                <select
                  value={formData.vehicleType || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 8px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                >
                  <option value="Refrigerated Van (1.5 Ton)">Refrigerated Van (1.5 Ton)</option>
                  <option value="Insulated Delivery Van">Insulated Delivery Van</option>
                  <option value="Refrigerated Milk Tanker">Refrigerated Milk Tanker</option>
                  <option value="Electric Cargo Van">Electric Cargo Van</option>
                  <option value="Cold-Box Three-Wheeler">Cold-Box Three-Wheeler</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Assigned Route
                </label>
                <input
                  type="text"
                  value={formData.assignedRoute || ''}
                  onChange={(e) => setFormData({ ...formData, assignedRoute: e.target.value })}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* License & Verification */}
          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#16805D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> License Details & Compliance
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
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
