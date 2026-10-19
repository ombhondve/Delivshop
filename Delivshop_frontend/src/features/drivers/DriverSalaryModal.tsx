import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';

interface DriverSalaryModalProps {
  driverId: string;
  driverName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingSalary?: any;
}

export const DriverSalaryModal: React.FC<DriverSalaryModalProps> = ({
  driverId,
  driverName,
  isOpen,
  onClose,
  onSuccess,
  existingSalary,
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PAYMENT'>('CONFIG');

  // Config fields
  const [baseSalary, setBaseSalary] = useState('18000');
  const [dailyAllowance, setDailyAllowance] = useState('150');
  const [perDeliveryIncentive, setPerDeliveryIncentive] = useState('25');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Payment Record fields
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [payBase, setPayBase] = useState('18000');
  const [payAllowances, setPayAllowances] = useState('3500');
  const [payDeductions, setPayDeductions] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState(`PAY-REF-${Date.now().toString().slice(-6)}`);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingSalary) {
      if (existingSalary.base_monthly_salary != null || existingSalary.baseSalary != null) {
        setBaseSalary(String(existingSalary.base_monthly_salary ?? existingSalary.baseSalary));
        setPayBase(String(existingSalary.base_monthly_salary ?? existingSalary.baseSalary));
      }
      if (existingSalary.daily_allowance != null) {
        setDailyAllowance(String(existingSalary.daily_allowance));
      }
      if (existingSalary.per_delivery_incentive != null) {
        setPerDeliveryIncentive(String(existingSalary.per_delivery_incentive));
      }
      if (existingSalary.effective_from) {
        setEffectiveDate(new Date(existingSalary.effective_from).toISOString().split('T')[0]);
      }
      if (existingSalary.notes) {
        setNotes(existingSalary.notes);
      }
    }
  }, [existingSalary]);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const parsedBase = parseFloat(baseSalary) || 0;
      if (parsedBase < 0) {
        setError('Base salary cannot be negative.');
        setLoading(false);
        return;
      }

      await api.deliveries.upsertSalaryConfig(driverId, {
        baseSalary: parsedBase,
        baseMonthlySalary: parsedBase,
        salaryType: 'MONTHLY',
        paymentCycle: 'MONTHLY',
        dailyAllowance: parseFloat(dailyAllowance) || 0,
        perDeliveryIncentive: parseFloat(perDeliveryIncentive) || 0,
        effectiveFrom: effectiveDate,
        effectiveFromDate: effectiveDate,
        notes: notes.trim() || undefined,
        status: 'ACTIVE',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save salary configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const net = (parseFloat(payBase) || 0) + (parseFloat(payAllowances) || 0) - (parseFloat(payDeductions) || 0);

      await api.deliveries.addPayrollRecord(driverId, {
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        baseSalary: parseFloat(payBase),
        totalAllowances: parseFloat(payAllowances) || 0,
        totalDeductions: parseFloat(payDeductions) || 0,
        advancesDeducted: 0,
        netAmount: net,
        paymentStatus: 'PAID',
        paymentMethod,
        paymentReference: paymentRef,
        paidAt: new Date().toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to record payroll payment');
    } finally {
      setLoading(false);
    }
  };

  const netPay = (parseFloat(payBase) || 0) + (parseFloat(payAllowances) || 0) - (parseFloat(payDeductions) || 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.55)',
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
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
            backgroundColor: '#FAFAF7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-subtle, #E6F4EA)',
                color: 'var(--color-primary, #16805D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Driver Compensation & Payroll
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                {driverName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 20px', backgroundColor: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('CONFIG'); setError(null); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'CONFIG' ? '2px solid var(--color-primary, #16805D)' : '2px solid transparent',
              color: activeTab === 'CONFIG' ? 'var(--color-primary, #16805D)' : '#64748B',
              fontWeight: activeTab === 'CONFIG' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Salary Structure
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('PAYMENT'); setError(null); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'PAYMENT' ? '2px solid var(--color-primary, #16805D)' : '2px solid transparent',
              color: activeTab === 'PAYMENT' ? 'var(--color-primary, #16805D)' : '#64748B',
              fontWeight: activeTab === 'PAYMENT' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Record Payment
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#B91C1C',
                fontSize: '12.5px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'CONFIG' ? (
            <form onSubmit={handleSaveConfig}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Base Monthly Salary (₹) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Daily Food/Field Allowance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dailyAllowance}
                    onChange={(e) => setDailyAllowance(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Per Delivery Incentive (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={perDeliveryIncentive}
                    onChange={(e) => setPerDeliveryIncentive(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Structure Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior logistics grade tier"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveConfig} disabled={loading} icon={<CheckCircle2 size={15} />}>
                  {loading ? 'Saving...' : 'Save Salary Structure'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRecordPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Base Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={payBase}
                    onChange={(e) => setPayBase(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Allowances (₹)
                  </label>
                  <input
                    type="number"
                    value={payAllowances}
                    onChange={(e) => setPayAllowances(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #A7AE9F', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Net Amount Payable
                  </label>
                  <div
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 700,
                      color: 'var(--color-primary, #16805D)',
                      backgroundColor: '#F1F5F9',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    ₹{netPay.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleRecordPayment} disabled={loading} icon={<CheckCircle2 size={15} />}>
                  {loading ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
