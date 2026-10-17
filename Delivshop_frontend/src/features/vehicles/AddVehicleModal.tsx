import React, { useState } from 'react';
import {
  Truck,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Thermometer,
  ShieldCheck,
  PlusCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';
import { useNavigation } from '../../context/NavigationContext';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleCreated: (vehicle: Vehicle) => void;
  onUploadDocumentForVehicle?: (vehicle: Vehicle) => void;
}

const INITIAL_FORM_DATA = {
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
};

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onVehicleCreated,
  onUploadDocumentForVehicle,
}) => {
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdVehicle, setCreatedVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const handleResetAndClose = () => {
    setCreatedVehicle(null);
    setError(null);
    setLoading(false);
    setFormData(INITIAL_FORM_DATA);
    onClose();
  };

  const handleRegisterAnother = () => {
    setCreatedVehicle(null);
    setError(null);
    setLoading(false);
    setFormData(INITIAL_FORM_DATA);
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

      const vehicle = res.data || res;
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
      const vId = createdVehicle.id;
      handleResetAndClose();
      navigate(`/admin/vehicles/${vId}`);
    }
  };

  const handleUploadDoc = () => {
    if (createdVehicle) {
      const v = createdVehicle;
      handleResetAndClose();
      if (onUploadDocumentForVehicle) {
        onUploadDocumentForVehicle(v);
      } else {
        navigate(`/admin/vehicles/${v.id}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Register Fleet Vehicle Asset"
      subtitle="Add commercial distribution vehicle with specifications and refrigeration controls"
      icon={<Truck size={20} />}
      size="lg"
      footer={
        createdVehicle ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={handleRegisterAnother}
              icon={<RotateCcw size={15} />}
            >
              Register Another Vehicle
            </Button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetAndClose}
              >
                Close & Return
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleOpenDetails}
                icon={<ExternalLink size={15} />}
              >
                Open Vehicle Record
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleResetAndClose}
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
              icon={<PlusCircle size={16} />}
            >
              Register Fleet Asset
            </Button>
          </div>
        )
      }
    >
      {error && (
        <div className="form-error-banner" style={{ marginBottom: '18px' }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {createdVehicle ? (
        <div style={{ padding: '24px 12px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: '2px solid #A7F3D0',
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            Vehicle Successfully Registered!
          </h4>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            Vehicle <strong style={{ color: 'var(--text-primary)' }}>{createdVehicle.registration_number}</strong> has been allocated fleet asset code{' '}
            <code
              style={{
                fontFamily: 'monospace',
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-subtle)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                border: '1px solid #A7F3D0',
              }}
            >
              {createdVehicle.vehicle_code}
            </code>
            . You may now attach RC book, fitness certificates, and insurance policies.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 18px',
              backgroundColor: 'var(--bg-hover)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '8px',
            }}
          >
            <FileText size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
              Next step: Upload vehicle compliance documents for dispatch clearance.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadDoc}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Upload Documents
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Basic Information */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-icon">
                <Truck size={13} />
              </span>
              <span>Basic Asset Information</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Registration Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. MH-12-DV-4421"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  required
                />
                <span className="form-text-hint">RTO registration code (auto-uppercased)</span>
              </div>

              <div className="form-group">
                <label className="form-label required">Make & Model</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Tata Ace Gold EV or Bolero Maxi"
                  value={formData.makeModel}
                  onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                  required
                />
                <span className="form-text-hint">Manufacturer & chassis variant</span>
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Callsign / Nickname</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Cold Runner 1 or Chilled Alpha"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
                <span className="form-text-hint">Radio handle or depot callsign (optional)</span>
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturing Year</label>
                <input
                  type="number"
                  className="input-field"
                  min={1995}
                  max={2030}
                  value={formData.manufacturingYear}
                  onChange={(e) => setFormData({ ...formData, manufacturingYear: Number(e.target.value) })}
                />
                <span className="form-text-hint">Year of commercial production</span>
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
                <span className="form-text-hint">Fleet route categorization</span>
              </div>

              <div className="form-group">
                <label className="form-label required">Fuel / Propulsion Type</label>
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
                <span className="form-text-hint">Propulsion powertrain</span>
              </div>
            </div>
          </div>

          {/* Section 2: Capacity & Cold-Chain Controls */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-icon">
                <Thermometer size={13} />
              </span>
              <span>Capacity & Cold-Chain Controls</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required">Payload Limit (KG)</label>
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
                <span className="form-text-hint">Maximum gross cargo weight</span>
              </div>

              <div className="form-group">
                <label className="form-label required">Standard Milk Crate Capacity</label>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={600}
                  value={formData.capacityCrates}
                  onChange={(e) => setFormData({ ...formData, capacityCrates: Number(e.target.value) })}
                  required
                />
                <span className="form-text-hint">Standard 12-pouch dairy crate slots</span>
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
                    Cold-Chain Chiller Unit Installed
                  </span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Enables dispatch eligibility for temperature-sensitive dairy deliveries (milk pouches, curd, paneer, and butter)
                  </p>
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
                      Min Target Temp (°C)
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      step={0.5}
                      value={formData.temperatureMinC}
                      onChange={(e) => setFormData({ ...formData, temperatureMinC: Number(e.target.value) })}
                    />
                    <span className="form-text-hint">Freezer floor limit (e.g. -18°C)</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--color-primary)' }}>
                      Max Target Temp (°C)
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      step={0.5}
                      value={formData.temperatureMaxC}
                      onChange={(e) => setFormData({ ...formData, temperatureMaxC: Number(e.target.value) })}
                    />
                    <span className="form-text-hint">Chiller ceiling limit (e.g. 4°C)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Depot, Odometer & Status */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-icon">
                <ShieldCheck size={13} />
              </span>
              <span>Deployment & Operations</span>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label required">Home Base Depot</label>
                <select
                  className="input-field"
                  value={formData.depot}
                  onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
                >
                  <option value="Pune Central Cold Depot">Pune Central Cold Depot</option>
                  <option value="Shivajinagar Hub">Shivajinagar Hub</option>
                  <option value="Hadapsar Distribution Center">Hadapsar Distribution Center</option>
                  <option value="Kothrud Quick-Hub">Kothrud Quick-Hub</option>
                  <option value="Pimpri Industrial Hub">Pimpri Industrial Hub</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Odometer (KM)</label>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  value={formData.currentOdometerKm}
                  onChange={(e) => setFormData({ ...formData, currentOdometerKm: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Initial Status</label>
                <select
                  className="input-field"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="AVAILABLE">Available for Run</option>
                  <option value="UNDER_MAINTENANCE">Under Workshop Inspection</option>
                  <option value="INACTIVE">Decommissioned / Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '4px' }}>
              <label className="form-label">Operational Notes & Remarks</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Optional vehicle history, warranty agreements, refrigeration telemetry device ID..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
