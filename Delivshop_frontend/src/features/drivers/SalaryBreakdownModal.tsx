import React, { useState } from 'react';
import { X, Calendar, DollarSign, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api/endpoints';
import { DriverUser, SalaryMonthSummary, SalaryPaymentTransaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SalaryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: DriverUser;
  monthSummary: SalaryMonthSummary | null;
  onPaymentReversed: () => void;
}

export const SalaryBreakdownModal: React.FC<SalaryBreakdownModalProps> = ({
  isOpen,
  onClose,
  driver,
  monthSummary,
  onPaymentReversed,
}) => {
  const [reversingPayment, setReversingPayment] = useState<SalaryPaymentTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !monthSummary) return null;

  const formatMonthTitle = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment) return;

    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      setError('Please provide a descriptive reason for reversing this payment (at least 3 characters).');
      return;
    }

    try {
      setSubmittingReversal(true);
      setError(null);
      await api.deliveries.reverseSalaryPayment(driver.id, reversingPayment.id, reversalReason.trim());
      setReversingPayment(null);
      setReversalReason('');
      onPaymentReversed();
    } catch (err: any) {
      setError(err?.message || 'Failed to reverse payment record.');
    } finally {
      setSubmittingReversal(false);
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
        if (!submittingReversal) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '720px',
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {formatMonthTitle(monthSummary.salaryMonth)} Payments
              </h2>
              <Badge
                variant={
                  monthSummary.paymentStatus === 'PAID'
                    ? 'success'
                    : monthSummary.paymentStatus === 'PARTIALLY_PAID'
                    ? 'info'
                    : 'warning'
                }
              >
                {monthSummary.paymentStatus === 'PAID'
                  ? 'Paid'
                  : monthSummary.paymentStatus === 'PARTIALLY_PAID'
                  ? 'Partially Paid'
                  : 'Unpaid'}
              </Badge>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              {driver.name} ({driver.employee_id})
            </p>
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

        {/* Content */}
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
              <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {/* Month Financial Metrics Overview */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Salary Due
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {formatCurrency(monthSummary.salaryAmountDue)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Total Paid
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                {formatCurrency(monthSummary.totalPaid)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Remaining Balance
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: monthSummary.remainingBalance > 0 ? '#B45309' : '#166534',
                  marginTop: '2px',
                }}
              >
                {formatCurrency(monthSummary.remainingBalance)}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
              Payments ({monthSummary.transactions.length})
            </h3>

            {monthSummary.transactions.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                  No payment transactions recorded for this salary month yet
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Use the "Record Salary Payment" button to record full or partial salary disbursements.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                        textAlign: 'left',
                        fontSize: '11px',
                        color: '#64748B',
                        textTransform: 'uppercase',
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Date</th>
                      <th style={{ padding: '10px 14px' }}>Amount</th>
                      <th style={{ padding: '10px 14px' }}>Method</th>
                      <th style={{ padding: '10px 14px' }}>Reference & Notes</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthSummary.transactions.map((tx) => {
                      const isReversed = tx.status === 'REVERSED';
                      return (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isReversed ? '#FFFBEB' : '#FFFFFF',
                          }}
                        >
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: 500, color: '#0F172A' }}>
                            {formatDate(tx.payment_date)}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              fontWeight: 700,
                              color: isReversed ? '#94A3B8' : '#0F172A',
                              textDecoration: isReversed ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatCurrency(tx.amount)}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#334155' }}>
                            {tx.payment_method === 'BANK_TRANSFER'
                              ? 'Bank Transfer'
                              : tx.payment_method === 'UPI'
                              ? 'UPI'
                              : 'Cash'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {tx.transaction_reference && (
                              <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#0369A1' }}>
                                Ref: {tx.transaction_reference}
                              </div>
                            )}
                            {tx.notes && (
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                {tx.notes}
                              </div>
                            )}
                            {isReversed && tx.reversal_reason && (
                              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px', fontStyle: 'italic' }}>
                                Reversal reason: {tx.reversal_reason}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <Badge variant={isReversed ? 'warning' : 'success'}>
                              {isReversed ? 'Reversed' : 'Completed'}
                            </Badge>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            {!isReversed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReversingPayment(tx);
                                  setReversalReason('');
                                  setError(null);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: '#DC2626',
                                  backgroundColor: '#FEF2F2',
                                  border: '1px solid #FCA5A5',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title="Reverse this payment entry with audit reason"
                              >
                                <RotateCcw size={12} />
                                <span>Reverse</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>Reversed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reversal Confirmation Modal Layer */}
          {reversingPayment && (
            <div
              style={{
                marginTop: '20px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>
                    Reverse Payment ({formatCurrency(reversingPayment.amount)})
                  </h4>

                  <form onSubmit={handleExecuteReversal} style={{ marginTop: '12px' }}>
                    <label
                      htmlFor="reversalReason"
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#991B1B',
                        marginBottom: '4px',
                      }}
                    >
                      Reason <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                      id="reversalReason"
                      required
                      rows={2}
                      placeholder="Enter reason..."
                      value={reversalReason}
                      onChange={(e) => setReversalReason(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #F87171',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setReversingPayment(null)}
                        disabled={submittingReversal}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="danger"
                        disabled={submittingReversal}
                      >
                        {submittingReversal ? 'Reversing...' : 'Reverse'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
