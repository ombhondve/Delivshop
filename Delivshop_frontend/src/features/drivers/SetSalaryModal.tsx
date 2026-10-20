import React, { useState } from 'react';
import { X, DollarSign, Calendar, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser, SalarySummaryData } from '../../types';

interface SetSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: DriverUser;
  currentSalarySummary?: SalarySummaryData | null;
  onSuccess: (updatedSummary: any) => void;
}

export const SetSalaryModal: React.FC<SetSalaryModalProps> = ({
  isOpen,
  onClose,
  driver,
  currentSalarySummary,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [monthlySalary, setMonthlySalary] = useState<string>(
    currentSalarySummary?.currentMonthlySalary
      ? String(currentSalarySummary.currentMonthlySalary)
      : ''
  );
  const [effectiveFrom, setEffectiveFrom] = useState<string>(todayStr);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(monthlySalary);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive monthly salary amount in Indian Rupees (₹).');
      return;
    }

    if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      setError('Please select a valid effective from date (YYYY-MM-DD).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.deliveries.setMonthlySalary(driver.id, {
        monthlySalary: amount,
        effectiveFrom,
        salaryType: 'Fixed Monthly Salary',
        notes: notes.trim() || undefined,
      });

      onSuccess(res.summary || res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update salary configuration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRevision = Boolean(currentSalarySummary?.isConfigured && currentSalarySummary.currentMonthlySalary);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                color: 'var(--color-primary, #16805D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {isRevision ? 'Revise Salary' : 'Set Salary'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Field 1: Employee (Read-only) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Employee (Current Profile)
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{driver.name}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--color-primary, #16805D)',
                    backgroundColor: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  {driver.employee_id || 'ID N/A'}
                </span>
              </div>
            </div>

            {/* Field 2: Monthly Salary (₹) */}
            <div>
              <label
                htmlFor="monthlySalary"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  marginBottom: '6px',
                }}
              >
                Monthly Salary (₹) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: '#64748B',
                    fontSize: '14px',
                  }}
                >
                  ₹
                </span>
                <input
                  id="monthlySalary"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 25000"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px 10px 30px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0F172A',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #16805D)')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            </div>

            {/* Field 3: Effective Date */}
            <div>
              <label
                htmlFor="effectiveFrom"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  marginBottom: '6px',
                }}
              >
                Effective Date <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="effectiveFrom"
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #16805D)')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            </div>

            {/* Field 4: Salary Type (Read-only) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Salary Type
              </label>
              <input
                type="text"
                readOnly
                value="Fixed Monthly Salary"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                }}
              />
            </div>

            {/* Field 5: Notes */}
            <div>
              <label
                htmlFor="salaryNotes"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Notes
              </label>
              <textarea
                id="salaryNotes"
                rows={2}
                placeholder="Enter notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  resize: 'vertical',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary, #16805D)')}
                onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
