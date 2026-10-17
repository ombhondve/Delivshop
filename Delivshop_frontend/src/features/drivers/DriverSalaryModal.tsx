import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, AlertCircle, CheckCircle2, Shield, CreditCard } from 'lucide-react';
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
  const [salaryType, setSalaryType] = useState('MONTHLY');
  const [baseSalary, setBaseSalary] = useState('18000');
  const [dailyAllowance, setDailyAllowance] = useState('150');
  const [perDeliveryIncentive, setPerDeliveryIncentive] = useState('25');
  const [hraAllowance, setHraAllowance] = useState('2000');
  const [fuelAllowance, setFuelAllowance] = useState('1500');
  const [pfDeduction, setPfDeduction] = useState('1200');
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
  const [payDeductions, setPayDeductions] = useState('1200');
  const [payAdvances, setPayAdvances] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState(`PAY-REF-${Date.now().toString().slice(-6)}`);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingSalary) {
      if (existingSalary.salary_type || existingSalary.salaryType) {
        setSalaryType(existingSalary.salary_type || existingSalary.salaryType);
      }
      if (existingSalary.base_monthly_salary != null || existingSalary.baseSalary != null) {
        setBaseSalary(String(existingSalary.base_monthly_salary ?? existingSalary.baseSalary));
      }
      if (existingSalary.daily_allowance != null) {
        setDailyAllowance(String(existingSalary.daily_allowance));
      }
      if (existingSalary.per_delivery_incentive != null) {
        setPerDeliveryIncentive(String(existingSalary.per_delivery_incentive));
      }
      if (existingSalary.hra_allowance != null) {
        setHraAllowance(String(existingSalary.hra_allowance));
      } else if (existingSalary.allowances?.hra != null) {
        setHraAllowance(String(existingSalary.allowances.hra));
      }
      if (existingSalary.fuel_allowance != null) {
        setFuelAllowance(String(existingSalary.fuel_allowance));
      } else if (existingSalary.allowances?.fuel != null) {
        setFuelAllowance(String(existingSalary.allowances.fuel));
      }
      if (existingSalary.pf_deduction != null) {
        setPfDeduction(String(existingSalary.pf_deduction));
      } else if (existingSalary.deductions?.pf != null) {
        setPfDeduction(String(existingSalary.deductions.pf));
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
        salaryType,
        paymentCycle: salaryType,
        dailyAllowance: parseFloat(dailyAllowance) || 0,
        perDeliveryIncentive: parseFloat(perDeliveryIncentive) || 0,
        hraAllowance: parseFloat(hraAllowance) || 0,
        fuelAllowance: parseFloat(fuelAllowance) || 0,
        pfDeduction: parseFloat(pfDeduction) || 0,
        effectiveFrom: effectiveDate,
        effectiveFromDate: effectiveDate,
        notes: notes.trim() || undefined,
        status: 'ACTIVE',
        allowances: {
          hra: parseFloat(hraAllowance) || 0,
          fuel: parseFloat(fuelAllowance) || 0,
        },
        deductions: {
          pf: parseFloat(pfDeduction) || 0,
        },
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
      const net =
        (parseFloat(payBase) || 0) +
        (parseFloat(payAllowances) || 0) -
        (parseFloat(payDeductions) || 0) -
        (parseFloat(payAdvances) || 0);

      await api.deliveries.addPayrollRecord(driverId, {
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        baseSalary: parseFloat(payBase),
        totalAllowances: parseFloat(payAllowances) || 0,
        totalDeductions: parseFloat(payDeductions) || 0,
        advancesDeducted: parseFloat(payAdvances) || 0,
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

  const netPayPreview =
    (parseFloat(payBase) || 0) +
    (parseFloat(payAllowances) || 0) -
    (parseFloat(payDeductions) || 0) -
    (parseFloat(payAdvances) || 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '560px',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#DCFCE7',
                color: '#16805D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#123D32', margin: 0 }}>
                Driver Compensation & Remuneration
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                {driverName} • Authorized Fleet Payroll
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: '0 24px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('CONFIG')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'CONFIG' ? '2px solid #16805D' : '2px solid transparent',
              color: activeTab === 'CONFIG' ? '#16805D' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Salary Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYMENT')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'PAYMENT' ? '2px solid #16805D' : '2px solid transparent',
              color: activeTab === 'PAYMENT' ? '#16805D' : '#64748B',
              cursor: 'pointer',
            }}
          >
            Record Payment Voucher
          </button>
        </div>

        {error && (
          <div
            style={{
              margin: '16px 24px 0 24px',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: '#B91C1C',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        {activeTab === 'CONFIG' ? (
          <form onSubmit={handleSaveConfig} style={{ padding: '20px 24px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Salary Model Type *
                </label>
                <select
                  value={salaryType}
                  onChange={(e) => setSalaryType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="MONTHLY">Monthly Fixed Salary</option>
                  <option value="DAILY">Daily Wage / Shift Rate</option>
                  <option value="WEEKLY">Weekly Disbursement</option>
                  <option value="PER_DELIVERY">Per Delivery Commission Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Base Salary / Wage (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  HRA Allowance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={hraAllowance}
                  onChange={(e) => setHraAllowance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Fuel / Transit Allowance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fuelAllowance}
                  onChange={(e) => setFuelAllowance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Daily Food Allowance (₹/day)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyAllowance}
                  onChange={(e) => setDailyAllowance(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Per Delivery Incentive (₹/drop)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={perDeliveryIncentive}
                  onChange={(e) => setPerDeliveryIncentive(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  PF / Statutory Deductions (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pfDeduction}
                  onChange={(e) => setPfDeduction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Compensation Notes & Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved by HR for standard city logistics run"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#16805D',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Saving Structure...' : 'Save Salary Configuration'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecordPayment} style={{ padding: '20px 24px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Period Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Period End Date *
                </label>
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Base Pay (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={payBase}
                  onChange={(e) => setPayBase(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Allowances & Incentives (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAllowances}
                  onChange={(e) => setPayAllowances(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Statutory Deductions (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payDeductions}
                  onChange={(e) => setPayDeductions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Advance Deductions (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAdvances}
                  onChange={(e) => setPayAdvances(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  gridColumn: 'span 2',
                  padding: '12px 16px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#16805D' }}>
                  Net Disbursed Amount:
                </span>
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#123D32' }}>
                  ₹{netPayPreview.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="BANK_TRANSFER">Direct Bank NEFT / IMPS</option>
                  <option value="UPI">Corporate UPI Transfer</option>
                  <option value="CHEQUE">Company Account Cheque</option>
                  <option value="CASH">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  UTR / Reference Voucher No. *
                </label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#16805D',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Recording Voucher...' : 'Record Paid Voucher'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
