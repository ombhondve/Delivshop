import React, { useState } from 'react';
import { X, FileText, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api/endpoints';

interface AddVehicleDocumentModalProps {
  isOpen: boolean;
  vehicleId: string;
  registrationNumber: string;
  onClose: () => void;
  onDocumentAdded: () => void;
}

export const AddVehicleDocumentModal: React.FC<AddVehicleDocumentModalProps> = ({
  isOpen,
  vehicleId,
  registrationNumber,
  onClose,
  onDocumentAdded,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    documentType: 'RC' as 'RC' | 'INSURANCE' | 'PUC' | 'FITNESS' | 'PERMIT',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    verificationStatus: 'VALID' as 'VALID' | 'EXPIRING' | 'EXPIRED' | 'PENDING',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.documentNumber.trim()) {
      setError('Document reference number is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.vehicles.addDocument(vehicleId, {
        documentType: formData.documentType,
        documentNumber: formData.documentNumber.trim(),
        issueDate: formData.issueDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        verificationStatus: formData.verificationStatus,
        notes: formData.notes.trim() || undefined,
      });

      onDocumentAdded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record document');
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
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="modal-title">Verify Vehicle Document</h3>
              <p className="modal-subtitle">Upload or update official credentials for {registrationNumber}</p>
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
            <div className="form-group">
              <label className="form-label required">Document Type</label>
              <select
                className="form-control"
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value as any })}
              >
                <option value="RC">Registration Certificate (RC)</option>
                <option value="INSURANCE">Commercial Motor Insurance</option>
                <option value="PUC">Pollution Under Control (PUC)</option>
                <option value="FITNESS">RTO Commercial Fitness Certificate</option>
                <option value="PERMIT">State / National Goods Carrier Permit</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label required">Document Reference / Policy Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. RC-MH12-2023-88712"
                required
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label required">Verification Status</label>
              <select
                className="form-control"
                value={formData.verificationStatus}
                onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value as any })}
              >
                <option value="VALID">Valid & Verified</option>
                <option value="EXPIRING">Expiring Soon (&lt; 30 Days)</option>
                <option value="EXPIRED">Expired</option>
                <option value="PENDING">Pending Administrative Review</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Verification Notes</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Verified via Parivahan RTO Portal..."
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
              {loading ? 'Saving...' : 'Save Document Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
