import React, { useState } from 'react';
import { X, Truck, ShieldAlert, CheckCircle2, ExternalLink, Thermometer, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { useNavigation } from '../../context/NavigationContext';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleCreated: (vehicle: Vehicle) => void;
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onVehicleCreated,
}) => {
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdVehicle, setCreatedVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    makeModel: '',
    nickname: '',
    manufacturingYear: new Date().getFullYear(),
    vehicleType: 'Refrigerated Van (1.5 Ton)',
    capacityKg: 1500,
    capacityCrates: 75,
    fuelType: 'DIESEL' as 'DIESEL' | 'ELECTRIC' | 'CNG' | 'PETROL',
    isRefrigerated: true,
    temperatureMinC: -18.0,
    temperatureMaxC: 4.0,
    depot: 'Pune Central Cold Depot',
    status: 'AVAILABLE' as 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'INACTIVE',
    currentOdometerKm: 0,
    notes: '',
  });

  if (!isOpen) return null;

  const handleResetAndClose = () => {
    setCreatedVehicle(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber.trim() || !formData.makeModel.trim()) {
      setError('Registration number and Make/Model are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.vehicles.create({
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
        currentOdometerKm: Number(formData.currentOdometerKm) || 0,
        notes: formData.notes.trim() || undefined,
      });

      const vehicle = res.data;
      setCreatedVehicle(vehicle);
      onVehicleCreated(vehicle);
    } catch (err: any) {
      setError(err?.message || 'Failed to register vehicle asset to fleet');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = () => {
    if (createdVehicle) {
      handleResetAndClose();
      navigate(`/admin/vehicles/${createdVehicle.id}`);
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
        if (e.target === e.currentTarget && !loading) handleResetAndClose();
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
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Register Fleet Vehicle Asset
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Add commercial distribution vehicle with specifications and refrigeration controls
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={handleResetAndClose}
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

        {createdVehicle ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Vehicle Successfully Registered!
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', margin: '0 auto 20px auto' }}>
              Vehicle <strong style={{ color: '#0F172A' }}>{createdVehicle.registration_number}</strong> has been allocated internal ID{' '}
              <code
                style={{
                  fontFamily: 'monospace',
                  color: '#0369A1',
                  backgroundColor: '#E0F2FE',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                {createdVehicle.vehicle_code}
              </code>
              . You may now upload RC book, insurance policy, and fitness documents.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetAndClose}
              >
                Close & Return to Fleet
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenDetails}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={15} /> Open Vehicle Record
              </button>
            </div>
          </div>
        ) : (
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
                      placeholder="e.g. MH-12-DV-4421"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      required
                    />
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                      RTO registration code (auto-uppercased)
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Make & Model <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Tata Ace Gold EV or Bolero Maxi"
                      value={formData.makeModel}
                      onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Vehicle Callsign / Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Chilled Alpha 1"
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

              {/* Section 2: Capacity & Temperature Controls */}
              <div style={{ paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Thermometer size={14} style={{ color: '#0284C7' }} /> Capacity & Cold-Chain Controls
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
                      step={50}
                      value={formData.capacityKg}
                      onChange={(e) => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Standard Milk Crate Capacity <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
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
                    border: `1px solid ${formData.isRefrigerated ? '#BAE6FD' : '#E2E8F0'}`,
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
                        Cold-Chain Chiller Unit Installed
                      </span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                        Enables dispatch eligibility for temperature-sensitive dairy deliveries (milk, paneer, butter)
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

              {/* Section 3: Depot, Odometer & Status */}
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
                      Initial Odometer (KM)
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
                      Initial Status <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="AVAILABLE">Available for Dispatch</option>
                      <option value="UNDER_MAINTENANCE">Under Inspection</option>
                      <option value="INACTIVE">Inactive / Standby</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Notes & Technical Remarks
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. Equipped with Bluetooth temperature data-logger; RTO fitness inspection completed..."
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
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetAndClose}
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
                {loading ? 'Registering Vehicle...' : 'Register Vehicle Asset'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
