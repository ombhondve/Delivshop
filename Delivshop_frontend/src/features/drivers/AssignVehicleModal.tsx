import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser } from '../../types';

interface AssignVehicleModalProps {
  isOpen: boolean;
  driver: DriverUser | null;
  onClose: () => void;
  onSuccess: (updated: DriverUser) => void;
}

export const AssignVehicleModal: React.FC<AssignVehicleModalProps> = ({
  isOpen,
  driver,
  onClose,
  onSuccess,
}) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Refrigerated 1.5T Van');
  const [assignedRoute, setAssignedRoute] = useState('');
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && driver) {
      setVehicleNumber(driver.vehicle_number || '');
      setVehicleType(driver.vehicle_type || 'Refrigerated 1.5T Van');
      setAssignedRoute(driver.assigned_route || '');
      setError(null);
      loadFleetVehicles();
    }
  }, [isOpen, driver]);

  const loadFleetVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const res = await api.vehicles.list({ limit: 100 });
      setAvailableVehicles(res.data || []);
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingVehicles(false);
    }
  };

  if (!isOpen || !driver) return null;

  const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setVehicleNumber('');
      return;
    }
    const found = availableVehicles.find((v) => v.registration_number === val || v.registrationNumber === val);
    if (found) {
      setVehicleNumber(found.registration_number || found.registrationNumber || val);
      setVehicleType(found.vehicle_type || found.vehicleType || 'Refrigerated Van');
    } else {
      setVehicleNumber(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setError('Vehicle registration number is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const updated = await api.deliveries.assignVehicle(driver.id, {
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType: vehicleType.trim() || undefined,
        assignedRoute: assignedRoute.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to allocate vehicle to driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const updated = await api.deliveries.assignVehicle(driver.id, {
        vehicleNumber: '',
        vehicleType: '',
        assignedRoute: '',
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to release vehicle');
    } finally {
      setSubmitting(false);
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
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #D6D3C8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
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
              <Truck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Assign Fleet Vehicle
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                {driver.name} ({driver.employee_id || 'Driver'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#B91C1C',
                fontSize: '12.5px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Select from Available Fleet */}
          {availableVehicles.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Choose from Registered Fleet
              </label>
              <select
                onChange={handleVehicleSelect}
                value={vehicleNumber}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #A7AE9F',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="">-- Select fleet vehicle or enter below --</option>
                {availableVehicles.map((v) => {
                  const reg = v.registration_number || v.registrationNumber;
                  const type = v.vehicle_type || v.vehicleType || 'Vehicle';
                  return (
                    <option key={v.id} value={reg}>
                      {reg} ({type})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Vehicle Registration Number */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Vehicle Registration Number <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MH-12-AB-1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #A7AE9F',
                outline: 'none',
              }}
            />
          </div>

          {/* Vehicle Type / Specification */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Vehicle Model / Specification
            </label>
            <input
              type="text"
              placeholder="e.g. Tata Ace Cold-Chain (1.5T)"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
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

          {/* Primary Assigned Route (Optional) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Assigned Route Corridor (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Hadapsar-Kondhwa Route 04"
              value={assignedRoute}
              onChange={(e) => setAssignedRoute(e.target.value)}
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

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {driver.vehicle_number ? (
              <button
                type="button"
                onClick={handleUnassign}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                Release / Unassign Vehicle
              </button>
            ) : <span />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={submitting} icon={<CheckCircle2 size={15} />}>
                {submitting ? 'Assigning...' : 'Assign Vehicle'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
