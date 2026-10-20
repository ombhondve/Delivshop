import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldAlert,
  Thermometer,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
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
        vehicleType: vehicle.vehicle_type || 'Refrigerated Van (1.5 Ton)',
        capacityKg: vehicle.capacity_kg || 1000,
        fuelType: (vehicle.fuel_type as any) || 'DIESEL',
        isRefrigerated: Boolean(vehicle.is_refrigerated),
        temperatureMinC:
          vehicle.temperature_min_c !== undefined && vehicle.temperature_min_c !== null
            ? Number(vehicle.temperature_min_c)
            : -18.0,
        temperatureMaxC:
          vehicle.temperature_max_c !== undefined && vehicle.temperature_max_c !== null
            ? Number(vehicle.temperature_max_c)
            : 4.0,
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
        vehicleType: formData.vehicleType,
        capacityKg: Number(formData.capacityKg),
        fuelType: formData.fuelType,
        isRefrigerated: formData.isRefrigerated,
        temperatureMinC: formData.isRefrigerated ? Number(formData.temperatureMinC) : undefined,
        temperatureMaxC: formData.isRefrigerated ? Number(formData.temperatureMaxC) : undefined,
        depot: formData.depot,
        status: formData.status,
        currentOdometerKm: Number(formData.currentOdometerKm),
        notes: formData.notes.trim() || undefined,
      });

      const updated = res.data || res;
      onVehicleUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update vehicle asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Vehicle"
      icon={<Truck size={20} />}
      size="lg"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={loading}
            icon={<Save size={16} />}
          >
            Save
          </Button>
        </div>
      }
    >
      {error && (
        <div className="form-error-banner" style={{ marginBottom: '18px' }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Vehicle Information */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-icon">
              <Truck size={13} />
            </span>
            <span>Vehicle Information</span>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label required">Registration</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. MH-12-DV-4421"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Make & Model</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Tata Ace Gold"
                value={formData.makeModel}
                onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Classification</label>
              <select
                className="input-field"
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
          </div>
        </div>

        {/* Section 2: Capacity & Specifications */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-icon">
              <Thermometer size={13} />
            </span>
            <span>Capacity & Specifications</span>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label required">Payload (KG)</label>
              <input
                type="number"
                className="input-field"
                min={100}
                max={15000}
                step={50}
                value={formData.capacityKg}
                onChange={(e) => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Fuel Type</label>
              <select
                className="input-field"
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

          {/* Refrigeration Toggle & Temperature Range */}
          <div className={`form-toggle-card ${formData.isRefrigerated ? 'is-active' : ''}`} style={{ marginTop: '4px' }}>
            <label className="form-toggle-label">
              <input
                type="checkbox"
                className="form-toggle-checkbox"
                checked={formData.isRefrigerated}
                onChange={(e) => setFormData({ ...formData, isRefrigerated: e.target.checked })}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  Refrigerated Chiller Installed
                </span>
              </div>
            </label>

            {formData.isRefrigerated && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #A7F3D0',
                }}
              >
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-primary)' }}>
                    Min Temp (°C)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    step={0.5}
                    value={formData.temperatureMinC}
                    onChange={(e) => setFormData({ ...formData, temperatureMinC: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-primary)' }}>
                    Max Temp (°C)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    step={0.5}
                    value={formData.temperatureMaxC}
                    onChange={(e) => setFormData({ ...formData, temperatureMaxC: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Location & Operations */}
        <div className="form-section">
          <div className="form-section-header">
            <span className="form-section-icon">
              <ShieldCheck size={13} />
            </span>
            <span>Location & Operations</span>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Home Location</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter location"
                value={formData.depot}
                onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Odometer (KM)</label>
              <input
                type="number"
                className="input-field"
                min={0}
                value={formData.currentOdometerKm}
                onChange={(e) => setFormData({ ...formData, currentOdometerKm: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Status</label>
              <select
                className="input-field"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '4px' }}>
            <label className="form-label">Notes</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Enter notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
