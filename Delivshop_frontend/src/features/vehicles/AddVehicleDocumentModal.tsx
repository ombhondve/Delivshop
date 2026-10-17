import React, { useState, useRef } from 'react';
import { X, FileText, ShieldAlert, Upload, CheckCircle2, Trash2 } from 'lucide-react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          maxWidth: '540px',
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
                backgroundColor: '#D1FAE5',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Verify Vehicle Compliance Document
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Upload official certificates for <strong style={{ color: '#0F172A' }}>{registrationNumber}</strong>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Document Type */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Document Classification <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className="form-control"
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                required
              >
                <option value="RC">Registration Certificate (RC)</option>
                <option value="INSURANCE">Commercial Motor Insurance Policy</option>
                <option value="PUC">Pollution Under Control (PUC) Certificate</option>
                <option value="FITNESS">RTO Commercial Fitness Certificate</option>
                <option value="PERMIT">State / National Goods Carrier Permit</option>
                <option value="TEMPERATURE_CALIBRATION">Cold-Chain Temperature Calibration Certificate</option>
                <option value="OTHER">Other Compliance Document</option>
              </select>
            </div>

            {/* Document Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Document Reference / Policy Number <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. RC-MH12-2023-88712 or POL-HDFC-991823"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                required
              />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Issue Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Expiry / Renewal Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  Leave empty if permanent
                </span>
              </div>
            </div>

            {/* Verification Status */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Verification & Compliance Status <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                className="form-control"
                value={formData.verificationStatus}
                onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
              >
                <option value="VALID">Valid & Verified (Dispatch Eligible)</option>
                <option value="EXPIRING">Expiring Soon (&lt; 30 Days)</option>
                <option value="EXPIRED">Expired (Blocks Dispatch)</option>
                <option value="PENDING">Pending Administrative Review</option>
                <option value="REJECTED">Rejected by Auditor</option>
              </select>
            </div>

            {/* File Upload Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Attach Document File (PDF, JPG, PNG, WebP up to 5MB)
              </label>

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #A7AE9F',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284C7')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#A7AE9F')}
                >
                  <Upload size={24} style={{ color: '#0284C7', margin: '0 auto 6px auto' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Click to select file or drag document here
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    PDF, JPEG, PNG, or WebP format (Max 5MB)
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>
                        {selectedFile.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#15803D', marginLeft: '6px' }}>
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#DC2626',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove selected file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Compliance & Verification Notes
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Verified via Maharashtra Parivahan Portal; comprehensive cover with chilled dairy rider..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
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
              {loading ? 'Verifying & Saving...' : 'Save Document Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

