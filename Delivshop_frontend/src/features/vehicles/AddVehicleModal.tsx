import React, { useState } from 'react';
import { X, Truck, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api/endpoints';
import { Vehicle } from '../../types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    vehicleCode: '',
    makeModel: '',
    vehicleType: 'Refrigerated Van (1.5 Ton)',
    capacityKg: 1500,
    capacityCrates: 75,
    fuelType: 'DIESEL' as 'DIESEL' | 'ELECTRIC' | 'CNG' | 'PETROL',
    isRefrigerated: true,
    city: 'Pune',
    state: 'Maharashtra',
    depot: 'Pune Central Cold Depot',
    currentOdometerKm: 0,
    notes: '',
  });

  if (!isOpen) return null;

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
        vehicleCode: formData.vehicleCode.trim() || undefined,
        makeModel: formData.makeModel.trim(),
        vehicleType: formData.vehicleType,
        capacityKg: Number(formData.capacityKg),
        capacityCrates: Number(formData.capacityCrates),
        fuelType: formData.fuelType,
        isRefrigerated: formData.isRefrigerated,
        city: formData.city,
        state: formData.state,
        depot: formData.depot,
        currentOdometerKm: Number(formData.currentOdometerKm),
        notes: formData.notes.trim() || undefined,
      });

      onVehicleCreated(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to register vehicle asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Truck size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="modal-title">Register Vehicle Asset</h3>
              <p className="modal-subtitle">Add a commercial distribution vehicle to the active fleet</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="form-error-banner" style={{ margin: '16px 24px 0 24px' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">Vehicle Registration No.</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MH-12-DV-4421"
                  required
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                />
                <span className="form-hint">Official RTO commercial registration number</span>
              </div>

              <div className="form-group">
                <label className="form-label">Internal Vehicle ID / Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. VEH-1006 (Auto if blank)"
                  value={formData.vehicleCode}
                  onChange={(e) => setFormData({ ...formData, vehicleCode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Make & Model</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Tata Ace EV / Mahindra Bolero"
                  required
                  value={formData.makeModel}
                  onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Vehicle Type</label>
                <select
                  className="form-control"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                >
                  <option value="Refrigerated Van (1.5 Ton)">Refrigerated Van (1.5 Ton)</option>
                  <option value="Insulated Delivery Van">Insulated Delivery Van</option>
                  <option value="Electric Cargo Van">Electric Cargo Van</option>
                  <option value="Refrigerated Milk Tanker">Refrigerated Milk Tanker</option>
                  <option value="Heavy Multi-Axle Carrier">Heavy Multi-Axle Carrier</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Payload Capacity (KG)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  className="form-control"
                  value={formData.capacityKg}
                  onChange={(e) => setFormData({ ...formData, capacityKg: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Capacity (Standard Milk Crates)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={formData.capacityCrates}
                  onChange={(e) => setFormData({ ...formData, capacityCrates: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fuel / Propulsion Type</label>
                <select
                  className="form-control"
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                >
                  <option value="DIESEL">Diesel</option>
                  <option value="ELECTRIC">Electric (EV)</option>
                  <option value="CNG">CNG</option>
                  <option value="PETROL">Petrol</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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

              <div className="form-group">
                <label className="form-label">Operational City</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Home Depot / Logistics Base</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.depot}
                  onChange={(e) => setFormData({ ...formData, depot: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Odometer (KM)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={formData.currentOdometerKm}
                  onChange={(e) => setFormData({ ...formData, currentOdometerKm: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Operational Notes / Special Equipment</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Equipped with digital temperature logger, dual side loading doors..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
