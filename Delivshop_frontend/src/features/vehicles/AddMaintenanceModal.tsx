import React, { useState } from 'react';
import { X, Wrench, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api/endpoints';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  vehicleId: string;
  registrationNumber: string;
  currentOdometerKm: number;
  onClose: () => void;
  onMaintenanceAdded: () => void;
}

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  isOpen,
  vehicleId,
  registrationNumber,
  currentOdometerKm,
  onClose,
  onMaintenanceAdded,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: 'Periodic Scheduled Service',
    odometerKm: currentOdometerKm || 0,
    cost: 3500,
    serviceCenter: '',
    description: '',
    nextServiceDate: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceType.trim()) {
      setError('Service type is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.vehicles.addMaintenance(vehicleId, {
        serviceDate: formData.serviceDate,
        serviceType: formData.serviceType.trim(),
        odometerKm: Number(formData.odometerKm),
        cost: Number(formData.cost),
        serviceCenter: formData.serviceCenter.trim() || undefined,
        description: formData.description.trim() || undefined,
        nextServiceDate: formData.nextServiceDate || undefined,
      });

      onMaintenanceAdded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record maintenance service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Wrench size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="modal-title">Record Fleet Maintenance</h3>
              <p className="modal-subtitle">Service entry for {registrationNumber}</p>
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
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label required">Service Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={formData.serviceDate}
                  onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Odometer (KM)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  required
                  value={formData.odometerKm}
                  onChange={(e) => setFormData({ ...formData, odometerKm: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label required">Service Type / Work Done</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 10K KM Inspection / Chiller Overhaul"
                required
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label required">Service Cost (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  className="form-control"
                  required
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Next Service Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.nextServiceDate}
                  onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Authorized Service Center / Workshop</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Tata Motors Commercial Center, Swargate"
                value={formData.serviceCenter}
                onChange={(e) => setFormData({ ...formData, serviceCenter: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Work Description / Replaced Parts</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Details of oil replacement, filters, brake pads, calibration..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Recording...' : 'Record Maintenance Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
