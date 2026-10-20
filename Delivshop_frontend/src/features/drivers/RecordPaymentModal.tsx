import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser, SalarySummaryData } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: DriverUser;
  defaultMonth?: string;
  onSuccess: (updatedData: any) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  driver,
  defaultMonth,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = defaultMonth || new Date().toISOString().slice(0, 7);

  const [salaryMonth, setSalaryMonth] = useState<string>(currentMonthStr);
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'UPI' | 'CASH'>('BANK_TRANSFER');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [monthSummary, setMonthSummary] = useState<SalarySummaryData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch month summary whenever salaryMonth changes to show configured salary and outstanding balance
  useEffect(() => {
    if (!isOpen || !driver?.id || !salaryMonth) return;

    let active = true;
    const fetchMonthDetails = async () => {
      try {
        setLoadingSummary(true);
        const data = await api.deliveries.getSalaryConfig(driver.id, salaryMonth);
        if (active && data?.summary) {
          setMonthSummary(data.summary);
          // If amount is empty, prefill with remaining balance if positive
          if (!amount && data.summary.remainingBalance > 0) {
            setAmount(String(data.summary.remainingBalance));
          }
        }
      } catch {
        // silent fetch
      } finally {
        if (active) setLoadingSummary(false);
      }
    };

    fetchMonthDetails();
    return () => {
      active = false;
    };
  }, [isOpen, driver?.id, salaryMonth]);

  if (!isOpen) return null;

  const handleValidateAndConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const paidNum = parseFloat(amount);
    if (isNaN(paidNum) || paidNum <= 0) {
      setError('Please enter a positive numeric payment amount (₹).');
      return;
    }

    if (!salaryMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(salaryMonth)) {
      setError('Please select a valid salary month (YYYY-MM).');
      return;
    }

    if (!paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      setError('Please select a valid payment date (YYYY-MM-DD).');
      return;
    }

    setShowConfirmation(true);
  };

  const handleFinalSubmit = async () => {
    setError(null);
    try {
      setSubmitting(true);
      const res = await api.deliveries.recordSalaryPayment(driver.id, {
        salaryMonth,
        paymentDate,
        amount: parseFloat(amount),
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record salary payment. Please verify transaction details.');
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatMonthLabel = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

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
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
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
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Record Salary Payment
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Log disbursement transaction against monthly salary obligation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: submitting ? 'not-allowed' : 'pointer',
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

        {/* Scrollable Container */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
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

          {!showConfirmation ? (
            <form id="record-payment-form" onSubmit={handleValidateAndConfirm}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Field 1: Employee (Read-only) */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
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

                {/* Field 2: Salary Month */}
                <div>
                  <label
                    htmlFor="salaryMonth"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      marginBottom: '6px',
                    }}
                  >
                    Salary Month <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    id="salaryMonth"
                    type="month"
                    required
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                    Obligation month: <strong>{formatMonthLabel(salaryMonth)}</strong>
                  </div>
                </div>

                {/* Live Month Obligation & Outstanding Banner */}
                {monthSummary && (
                  <div
                    style={{
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#0369A1', textTransform: 'uppercase' }}>
                        Salary Due
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C4A6E', marginTop: '2px' }}>
                        {formatCurrency(monthSummary.salaryAmountDue)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#0369A1', textTransform: 'uppercase' }}>
                        Total Paid
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginTop: '2px' }}>
                        {formatCurrency(monthSummary.totalPaid)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#0369A1', textTransform: 'uppercase' }}>
                        Remaining Balance
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: monthSummary.remainingBalance > 0 ? '#B45309' : '#166534',
                          marginTop: '2px',
                        }}
                      >
                        {formatCurrency(monthSummary.remainingBalance)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Field 3: Payment Date & Field 4: Salary Amount Paid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label
                      htmlFor="paymentDate"
                      style={{
                        display: 'block',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        marginBottom: '6px',
                      }}
                    >
                      Payment Date <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      id="paymentDate"
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label
                        htmlFor="paymentAmount"
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#0F172A',
                        }}
                      >
                        Amount Paid (₹) <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      {monthSummary && monthSummary.remainingBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setAmount(String(monthSummary.remainingBalance))}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-primary, #16805D)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Fill Balance
                        </button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontWeight: 700,
                          color: '#64748B',
                          fontSize: '13.5px',
                        }}
                      >
                        ₹
                      </span>
                      <input
                        id="paymentAmount"
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        placeholder="e.g. 15000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '10px 12px 10px 28px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#0F172A',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Field 5: Payment Method */}
                <div>
                  <label
                    htmlFor="paymentMethod"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      marginBottom: '6px',
                    }}
                  >
                    Payment Method <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>

                {/* Field 6: Transaction Reference */}
                <div>
                  <label
                    htmlFor="transactionReference"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '6px',
                    }}
                  >
                    Transaction Reference <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="transactionReference"
                    type="text"
                    placeholder="e.g. UTR1984729103, UPI-202610-091"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Duplicate transaction references are prevented to avoid accidental double entries.
                  </p>
                </div>

                {/* Field 7: Notes */}
                <div>
                  <label
                    htmlFor="paymentNotes"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '6px',
                    }}
                  >
                    Notes <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <textarea
                    id="paymentNotes"
                    rows={2}
                    placeholder="e.g. Salary advance part 1, Diwali bonus adjustment..."
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
                  />
                </div>
              </div>
            </form>
          ) : (
            /* Confirmation Review Step */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <ShieldAlert size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#92400E' }}>
                    Confirm Salary Disbursement
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#B45309' }}>
                    Please verify the financial details before recording this transaction. An immutable audit record will be logged.
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Employee:</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                    {driver.name} ({driver.employee_id})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Salary Month:</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    {formatMonthLabel(salaryMonth)} ({salaryMonth})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Payment Date:</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    {formatDate(paymentDate)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Payment Method:</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    {paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : paymentMethod === 'UPI' ? 'UPI' : 'Cash'}
                  </span>
                </div>

                {transactionReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>Transaction Ref:</span>
                    <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: '#0369A1' }}>
                      {transactionReference}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Salary Amount to Record:</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary, #16805D)' }}>
                    {formatCurrency(parseFloat(amount) || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          {!showConfirmation ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" form="record-payment-form" variant="primary">
                Review & Confirm <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setShowConfirmation(false)} disabled={submitting}>
                Back to Edit
              </Button>
              <Button type="button" variant="primary" onClick={handleFinalSubmit} disabled={submitting}>
                {submitting ? 'Recording Payment...' : 'Confirm & Submit Payment'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
