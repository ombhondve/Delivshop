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
  Info,
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
}

interface InfoTooltipProps {
  text: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="info-tooltip-container"
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '5px', position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label={text}
    >
      <Info
        size={13}
        style={{
          color: show ? 'var(--color-primary, #047857)' : '#94A3B8',
          cursor: 'help',
          transition: 'color 0.15s ease',
        }}
      />
      {show && (
        <span
          className="info-tooltip-bubble"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            fontSize: '11.5px',
            lineHeight: 1.35,
            padding: '5px 9px',
            borderRadius: '6px',
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: '240px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            fontWeight: 400,
            textAlign: 'center',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

const INITIAL_FORM_DATA = {
  registrationNumber: '',
  makeModel: '',
  vehicleType: 'Refrigerated Van (1.5 Ton)',
  capacityKg: 1500,
  fuelType: 'DIESEL' as 'DIESEL' | 'ELECTRIC' | 'CNG' | 'PETROL',
  isRefrigerated: true,
  temperatureMinC: -18.0,
  temperatureMaxC: 4.0,
  depot: '',
  status: 'AVAILABLE' as 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'INACTIVE',
  currentOdometerKm: 0,
  notes: '',
};

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onVehicleCreated,
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
        vehicleType: formData.vehicleType,
        capacityKg: Number(formData.capacityKg),
        fuelType: formData.fuelType,
        isRefrigerated: formData.isRefrigerated,
        temperatureMinC: formData.isRefrigerated ? Number(formData.temperatureMinC) : undefined,
        temperatureMaxC: formData.isRefrigerated ? Number(formData.temperatureMaxC) : undefined,
        depot: formData.depot.trim() || undefined,
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
            . Specifications and operational profile are now active in the fleet registry.
          </p>
        </div>
      ) : (
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
                <label className="form-label required" style={{ display: 'flex', alignItems: 'center' }}>
                  <span>Registration Number</span>
                  <InfoTooltip text="Enter the vehicle's official registration number." />
                </label>
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
                <label className="form-label required" style={{ display: 'flex', alignItems: 'center' }}>
                  <span>Vehicle Type</span>
                  <InfoTooltip text="Select the type of vehicle you are registering." />
                </label>
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
            </div>
          </div>

          {/* Section 2: Capacity and Specifications */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-icon">
                <Thermometer size={13} />
              </span>
              <span>Capacity & Specifications</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label required" style={{ display: 'flex', alignItems: 'center' }}>
                  <span>Payload Capacity (KG)</span>
                  <InfoTooltip text="Enter the maximum load the vehicle can safely carry, using the displayed unit." />
                </label>
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
                <label className="form-label required" style={{ display: 'flex', alignItems: 'center' }}>
                  <span>Fuel / Propulsion Type</span>
                  <InfoTooltip text="Select the fuel or propulsion type used by the vehicle." />
                </label>
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
                <span className="form-text-hint">Powertrain fuel or energy type</span>
              </div>
            </div>

            {/* Refrigeration Toggle & Temperature Range */}
            <div className={`form-toggle-card ${formData.isRefrigerated ? 'is-active' : ''}`} style={{ marginTop: '12px' }}>
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

          {/* Section 3: Location and Operations */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="form-section-icon">
                <ShieldCheck size={13} />
              </span>
              <span>Location & Operations</span>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center' }}>
                  <span>Home Location</span>
                  <InfoTooltip text="Enter the depot name, town, area, or address where the vehicle is normally based." />
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter depot name, town, or address"
                  value={formData.depot}
                  onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
                />
                <span className="form-text-hint">Depot, facility, or operating area</span>
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

            <div className="form-group" style={{ marginTop: '8px' }}>
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
