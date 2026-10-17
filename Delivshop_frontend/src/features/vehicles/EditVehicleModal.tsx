import React, { useState, useEffect } from 'react';
import { X, Truck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';

interface EditVehicleModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onVehicleUpdated: (updated: Vehicle) => void;
}

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  isOpen,
  vehicle,
  onClose,
  onVehicleUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    makeModel: '',
    vehicleType: 'Refrigerated Van (1.5 Ton)',
    capacityKg: 1000,
    capacityCrates: 60,
    fuelType: 'DIESEL' as 'DIESEL' | 'ELECTRIC' | 'CNG' | 'PETROL',
    isRefrigerated: false,
    depot: 'Pune Central Cold Depot',
    currentOdometerKm: 0,
    notes: '',
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        registrationNumber: vehicle.registration_number || '',
        makeModel: vehicle.make_model || '',
        vehicleType: vehicle.vehicle_type || 'Refrigerated Van (1.5 Ton)',
        capacityKg: vehicle.capacity_kg || 1000,
        capacityCrates: vehicle.capacity_crates || 60,
        fuelType: (vehicle.fuel_type as any) || 'DIESEL',
        isRefrigerated: Boolean(vehicle.is_refrigerated),
        depot: vehicle.depot || 'Pune Central Cold Depot',
        currentOdometerKm: vehicle.current_odometer_km || 0,
        notes: vehicle.notes || '',
      });
      setError(null);
    }
  }, [vehicle]);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber.trim() || !formData.makeModel.trim()) {
      setError('Registration number and Make/Model are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.vehicles.update(vehicle.id, {
        registrationNumber: formData.registrationNumber.trim().toUpperCase(),
        makeModel: formData.makeModel.trim(),
        vehicleType: formData.vehicleType,
        capacityKg: Number(formData.capacityKg),
        capacityCrates: Number(formData.capacityCrates),
        fuelType: formData.fuelType,
        isRefrigerated: formData.isRefrigerated,
        depot: formData.depot,
        currentOdometerKm: Number(formData.currentOdometerKm),
        notes: formData.notes.trim() || undefined,
      });

      onVehicleUpdated(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update vehicle asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Edit Vehicle: {vehicle.registration_number}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Asset Code: <code style={{ fontWeight: 600, color: '#0369A1' }}>{vehicle.vehicle_code}</code> (Preserved)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              margin: '14px 20px 0 20px',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#DC2626',
              fontSize: '13px',
            }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Vehicle Registration No. *
              </label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
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
                Make & Model *
              </label>
              <input
                type="text"
                required
                value={formData.makeModel}
                onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
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
                Vehicle Classification
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="Refrigerated Van (1.5 Ton)">Refrigerated Van (1.5 Ton)</option>
                <option value="Insulated Delivery Van">Insulated Delivery Van</option>
                <option value="Electric Cargo Van">Electric Cargo Van</option>
                <option value="Refrigerated Milk Tanker">Refrigerated Milk Tanker</option>
                <option value="Cold-Box Three-Wheeler">Cold-Box Three-Wheeler</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Fuel / Propulsion
              </label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 8px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="DIESEL">Diesel</option>
                <option value="ELECTRIC">Electric (EV)</option>
                <option value="CNG">CNG</option>
                <option value="PETROL">Petrol</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Payload Capacity (KG)
              </label>
              <input
                type="number"
                min={1}
                value={formData.capacityKg}
                onChange={(e) => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
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
                Crate Capacity (Standard Crates)
              </label>
              <input
                type="number"
                min={0}
                value={formData.capacityCrates}
                onChange={(e) => setFormData({ ...formData, capacityCrates: Number(e.target.value) })}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={formData.isRefrigerated}
                  onChange={(e) => setFormData({ ...formData, isRefrigerated: e.target.checked })}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                  Active Chiller / Refrigeration Unit Installed
                </span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Home Depot / Logistics Base
              </label>
              <input
                type="text"
                value={formData.depot}
                onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
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
                Current Odometer (KM)
              </label>
              <input
                type="number"
                min={0}
                value={formData.currentOdometerKm}
                onChange={(e) => setFormData({ ...formData, currentOdometerKm: Number(e.target.value) })}
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
                Notes / Compliance Remarks
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </form>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: '#F8FAFC',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={16} />
            {loading ? 'Saving...' : 'Save Vehicle Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
