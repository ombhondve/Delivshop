import React, { useState } from 'react';
import {
  Wrench,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  DollarSign,
  PlusCircle,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  vehicleId: string;
  registrationNumber: string;
  currentOdometerKm: number;
  onClose: () => void;
  onMaintenanceAdded: () => void;
}

const COMMON_SERVICE_TYPES = [
  'Periodic Scheduled Maintenance (10K / 20K KM)',
  'Cold-Chain Chiller Freon & Compressor Servicing',
  'Brake System & Hydraulics Inspection / Replacement',
  'Engine Oil, Lubricants & Filter Replacement',
  'Tire Rotation, Balancing & Wheel Alignment',
  'Battery & Electrical Wiring Servicing',
  'Suspension & Shock Absorber Overhaul',
  'Emergency Roadside Repair / Breakdown Recovery',
  'Other Preventive Maintenance',
];

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
    serviceType: COMMON_SERVICE_TYPES[0],
    customServiceType: '',
    odometerKm: currentOdometerKm || 0,
    cost: 3500,
    serviceCenter: '',
    description: '',
    nextServiceDate: '',
  });

  if (!isOpen) return null;

  const handleQuickNextServiceDate = (daysAhead: number) => {
    const baseDate = formData.serviceDate ? new Date(formData.serviceDate) : new Date();
    baseDate.setDate(baseDate.getDate() + daysAhead);
    setFormData((prev) => ({
      ...prev,
      nextServiceDate: baseDate.toISOString().split('T')[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalServiceType =
      formData.serviceType === 'Other Preventive Maintenance' && formData.customServiceType.trim()
        ? formData.customServiceType.trim()
        : formData.serviceType;

    if (!finalServiceType.trim()) {
      setError('Service type is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.vehicles.addMaintenance(vehicleId, {
        serviceDate: formData.serviceDate,
        serviceType: finalServiceType,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Fleet Maintenance"
      subtitle={`Service log entry for ${registrationNumber} (Current Odo: ${Number(currentOdometerKm || 0).toLocaleString('en-IN')} KM)`}
      icon={<Wrench size={20} />}
      size="md"
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
            icon={<PlusCircle size={16} />}
          >
            Record Maintenance Log
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label required">Service Date</label>
            <input
              type="date"
              className="input-field"
              required
              value={formData.serviceDate}
              onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label required">Odometer at Service (KM)</label>
            <input
              type="number"
              min="0"
              className="input-field"
              required
              value={formData.odometerKm}
              onChange={(e) => setFormData({ ...formData, odometerKm: Number(e.target.value) })}
            />
            <span className="form-text-hint">Vehicle mileage reading</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label required">Service Category & Work Nature</label>
          <select
            className="input-field"
            value={formData.serviceType}
            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
          >
            {COMMON_SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {formData.serviceType === 'Other Preventive Maintenance' && (
          <div className="form-group">
            <label className="form-label required">Specify Custom Service Description</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Tailgate latch repair, AC blower motor servicing"
              required
              value={formData.customServiceType}
              onChange={(e) => setFormData({ ...formData, customServiceType: e.target.value })}
            />
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label required">Service Cost (₹ INR)</label>
            <input
              type="number"
              min="0"
              step="50"
              className="input-field"
              required
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
            />
            <span className="form-text-hint">Invoice amount inclusive of tax</span>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label">Next Service Due Date</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickNextServiceDate(30)}
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-hover)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                  title="30 days from service date"
                >
                  +1M
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickNextServiceDate(90)}
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-hover)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                  title="90 days from service date"
                >
                  +3M
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickNextServiceDate(180)}
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-hover)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                  title="180 days from service date"
                >
                  +6M
                </button>
              </div>
            </div>
            <input
              type="date"
              className="input-field"
              value={formData.nextServiceDate}
              onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Authorized Service Center / Workshop</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Tata Motors Commercial Workshop, Swargate or Pune Cold-Tech Garage"
            value={formData.serviceCenter}
            onChange={(e) => setFormData({ ...formData, serviceCenter: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Replaced Parts, Fluid Grades & Technical Remarks</label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="e.g. Replaced 15W-40 synthetic engine oil, oil filter cartridge, checked refrigerant pressure (R134a at 32 PSI)..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
};
