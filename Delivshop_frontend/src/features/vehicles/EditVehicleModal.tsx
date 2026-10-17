import React, { useState, useEffect } from 'react';
import { X, Truck, ShieldAlert, CheckCircle2, Thermometer, ShieldCheck } from 'lucide-react';
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
    nickname: '',
    manufacturingYear: new Date().getFullYear(),
    vehicleType: 'Refrigerated Van (1.5 Ton)',
    capacityKg: 1000,
    capacityCrates: 60,
    fuelType: 'DIESEL' as 'DIESEL' | 'ELECTRIC' | 'CNG' | 'PETROL',
    isRefrigerated: false,
    temperatureMinC: -18.0,
    temperatureMaxC: 4.0,
    depot: 'Pune Central Cold Depot',
    currentOdometerKm: 0,
    status: 'AVAILABLE' as 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'INACTIVE',
    notes: '',
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        registrationNumber: vehicle.registration_number || '',
        makeModel: vehicle.make_model || '',
        nickname: vehicle.nickname || '',
        manufacturingYear: vehicle.manufacturing_year || new Date().getFullYear(),
        vehicleType: vehicle.vehicle_type || 'Refrigerated Van (1.5 Ton)',
        capacityKg: vehicle.capacity_kg || 1000,
        capacityCrates: vehicle.capacity_crates || 60,
        fuelType: (vehicle.fuel_type as any) || 'DIESEL',
        isRefrigerated: Boolean(vehicle.is_refrigerated),
        temperatureMinC: vehicle.temperature_min_c !== undefined && vehicle.temperature_min_c !== null ? Number(vehicle.temperature_min_c) : -18.0,
        temperatureMaxC: vehicle.temperature_max_c !== undefined && vehicle.temperature_max_c !== null ? Number(vehicle.temperature_max_c) : 4.0,
        depot: vehicle.depot || 'Pune Central Cold Depot',
        currentOdometerKm: vehicle.current_odometer_km || 0,
        status:
          vehicle.status === 'UNDER_MAINTENANCE' || (vehicle.status as string) === 'MAINTENANCE'
            ? 'UNDER_MAINTENANCE'
            : vehicle.status === 'ASSIGNED'
            ? 'ASSIGNED'
            : vehicle.status === 'INACTIVE'
            ? 'INACTIVE'
            : 'AVAILABLE',
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
        nickname: formData.nickname.trim() || undefined,
        manufacturingYear: formData.manufacturingYear ? Number(formData.manufacturingYear) : undefined,
        vehicleType: formData.vehicleType,
        capacityKg: Number(formData.capacityKg),
        capacityCrates: Number(formData.capacityCrates),
        fuelType: formData.fuelType,
        isRefrigerated: formData.isRefrigerated,
        temperatureMinC: formData.isRefrigerated ? Number(formData.temperatureMinC) : undefined,
        temperatureMaxC: formData.isRefrigerated ? Number(formData.temperatureMaxC) : undefined,
        depot: formData.depot,
        status: formData.status,
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
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Edit Vehicle Asset: {vehicle.registration_number}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Asset Code: <code style={{ fontWeight: 600, color: '#0369A1' }}>{vehicle.vehicle_code}</code> (System-Controlled)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              margin: '14px 20px 0 20px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '18px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Section 1: Basic Information */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} style={{ color: '#0284C7' }} /> Basic Asset Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Registration Number <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Make & Model <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.makeModel}
                    onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Callsign / Nickname
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Manufacturing Year
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min={1995}
                    max={2030}
                    value={formData.manufacturingYear}
                    onChange={(e) => setFormData({ ...formData, manufacturingYear: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Classification <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  >
                    <option value="Refrigerated Van (1.5 Ton)">Refrigerated Van (1.5 Ton)</option>
                    <option value="Insulated Delivery Van">Insulated Delivery Van</option>
                    <option value="Electric Cargo Van">Electric Cargo Van</option>
                    <option value="Refrigerated Milk Tanker">Refrigerated Milk Tanker</option>
                    <option value="Heavy Commercial Chiller (3 Ton)">Heavy Commercial Chiller (3 Ton)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Fuel / Propulsion Type <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="ELECTRIC">Electric (EV)</option>
                    <option value="CNG">Compressed Natural Gas (CNG)</option>
                    <option value="PETROL">Petrol</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Capacity & Cold-Chain */}
            <div style={{ paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Thermometer size={14} style={{ color: '#0284C7' }} /> Capacity & Cold-Chain Specifications
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Payload Limit (KG) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min={100}
                    max={15000}
                    value={formData.capacityKg}
                    onChange={(e) => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Milk Crate Capacity <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={600}
                    value={formData.capacityCrates}
                    onChange={(e) => setFormData({ ...formData, capacityCrates: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {/* Refrigeration Toggle & Temperature Range */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: formData.isRefrigerated ? '#F0F9FF' : '#F8FAFC',
                  border: `1px solid ${formData.isRefrigerated ? '#BAE6FD' : '#D6D3C8'}`,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={formData.isRefrigerated}
                    onChange={(e) => setFormData({ ...formData, isRefrigerated: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Cold-Chain Chiller Unit Active
                    </span>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                      Required for cold dairy cargo assignment dispatch
                    </p>
                  </div>
                </label>

                {formData.isRefrigerated && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #BAE6FD' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#0369A1', marginBottom: '2px' }}>
                        Min Target Temp (°C)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        step={0.5}
                        value={formData.temperatureMinC}
                        onChange={(e) => setFormData({ ...formData, temperatureMinC: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#0369A1', marginBottom: '2px' }}>
                        Max Target Temp (°C)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        step={0.5}
                        value={formData.temperatureMaxC}
                        onChange={(e) => setFormData({ ...formData, temperatureMaxC: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Depot, Odometer, Status */}
            <div style={{ paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} style={{ color: '#0284C7' }} /> Deployment & Operations
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Home Base Depot <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.depot}
                    onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
                  >
                    <option value="Pune Central Cold Depot">Pune Central Cold Depot</option>
                    <option value="Kothrud Regional Distribution Point">Kothrud Regional Point</option>
                    <option value="Hadapsar Bulk Wholesale Facility">Hadapsar Wholesale Facility</option>
                    <option value="Viman Nagar Hub">Viman Nagar Hub</option>
                    <option value="Aundh Regional Center">Aundh Regional Center</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Current Odometer (KM)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={formData.currentOdometerKm}
                    onChange={(e) => setFormData({ ...formData, currentOdometerKm: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Operational Status <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="AVAILABLE">Available for Dispatch</option>
                    <option value="ASSIGNED">Assigned to Run</option>
                    <option value="UNDER_MAINTENANCE">Under Inspection / Repairs</option>
                    <option value="INACTIVE">Inactive / Decommissioned</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Operational Notes & Remarks
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #D6D3C8',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
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
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {loading ? 'Saving Changes...' : 'Save Vehicle Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

