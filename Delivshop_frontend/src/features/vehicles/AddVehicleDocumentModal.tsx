import React, { useState, useRef } from 'react';
import {
  FileText,
  ShieldAlert,
  Upload,
  CheckCircle2,
  Trash2,
  Calendar,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';

interface AddVehicleDocumentModalProps {
  isOpen: boolean;
  vehicleId: string;
  registrationNumber: string;
  initialData?: {
    documentType?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    verificationStatus?: string;
    notes?: string;
  } | null;
  onClose: () => void;
  onDocumentAdded: () => void;
}

export const AddVehicleDocumentModal: React.FC<AddVehicleDocumentModalProps> = ({
  isOpen,
  vehicleId,
  registrationNumber,
  initialData,
  onClose,
  onDocumentAdded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [formData, setFormData] = useState({
    documentType: initialData?.documentType || 'RC',
    documentNumber: initialData?.documentNumber || '',
    issueDate: initialData?.issueDate || '',
    expiryDate: initialData?.expiryDate || '',
    verificationStatus: initialData?.verificationStatus || 'VALID',
    notes: initialData?.notes || '',
  });

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    base64: string;
  } | null>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Selected file exceeds the 5MB size limit. Please upload a smaller document.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Disallowed file type. Only PDF, JPEG, PNG, and WebP files are supported.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        base64: reader.result as string,
      });
    };
    reader.onerror = () => {
      setError('Failed to read file from disk.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.documentNumber.trim()) {
      setError('Document reference / policy number is required.');
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
        fileName: selectedFile?.name,
        fileData: selectedFile?.base64,
        mimeType: selectedFile?.mimeType,
      });

      onDocumentAdded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload and record vehicle compliance document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Vehicle Compliance Document"
      subtitle={`Upload & certify regulatory records for ${registrationNumber}`}
      icon={<FileText size={20} />}
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
            icon={<FileCheck size={16} />}
          >
            Upload & Verify Document
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
        {/* Document Classification */}
        <div className="form-group">
          <label className="form-label required">Document Classification</label>
          <select
            className="input-field"
            value={formData.documentType}
            onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
            required
          >
            <option value="RC">Registration Certificate (RC Book)</option>
            <option value="INSURANCE">Commercial Comprehensive Motor Insurance</option>
            <option value="PUC">Pollution Under Control (PUC) Certificate</option>
            <option value="FITNESS">RTO Commercial Fitness Certificate</option>
            <option value="PERMIT">State / National Goods Carrier Permit</option>
            <option value="TEMPERATURE_CALIBRATION">Cold-Chain Chiller Calibration Certificate</option>
            <option value="OTHER">Other Regulatory Compliance Certificate</option>
          </select>
          <span className="form-text-hint">Official commercial vehicle documentation</span>
        </div>

        {/* Document Number */}
        <div className="form-group">
          <label className="form-label required">Document Reference / Policy Number</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. RC-MH12-2023-88712 or POL-HDFC-991823"
            value={formData.documentNumber}
            onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
            required
          />
          <span className="form-text-hint">Policy, certificate, or RTO registration number</span>
        </div>

        {/* Dates */}
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Issue Date</label>
            <input
              type="date"
              className="input-field"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expiry / Renewal Date</label>
            <input
              type="date"
              className="input-field"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            />
            <span className="form-text-hint">Leave blank if permanent / lifetime</span>
          </div>
        </div>

        {/* Verification Status */}
        <div className="form-group">
          <label className="form-label required">Compliance Status</label>
          <select
            className="input-field"
            value={formData.verificationStatus}
            onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
          >
            <option value="VALID">Valid & Verified (Dispatch Eligible)</option>
            <option value="EXPIRING">Expiring Soon (Under 30 Days)</option>
            <option value="EXPIRED">Expired (Blocks Delivery Run Dispatch)</option>
            <option value="PENDING">Pending Audit Inspection</option>
            <option value="REJECTED">Rejected by Auditor</option>
          </select>
          <span className="form-text-hint">Audited state for dispatch rule enforcement</span>
        </div>

        {/* File Upload Selector */}
        <div className="form-group">
          <label className="form-label">Document Certificate File Attachment</label>

          {!selectedFile ? (
            <div
              className={`file-dropzone ${isDragOver ? 'is-dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="file-dropzone-icon">
                <Upload size={20} />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Click to select certificate or drag file here
                </span>
                <span className="form-text-hint" style={{ marginTop: '2px' }}>
                  Supported formats: PDF, JPEG, PNG, or WebP (Maximum 5MB)
                </span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="file-preview-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.mimeType}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove attached file"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Remarks / Notes */}
        <div className="form-group">
          <label className="form-label">Verification Notes & Auditor Remarks</label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="e.g. Policy verified via Parivahan Vahan portal, zero-depreciation rider included..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
};
