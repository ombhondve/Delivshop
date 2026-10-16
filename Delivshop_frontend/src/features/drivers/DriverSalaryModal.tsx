import React, { useState } from 'react';
import { X, DollarSign, Calendar, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
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
  existingSalary
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PAYMENT'>('CONFIG');

  // Config fields
  const [baseSalary, setBaseSalary] = useState(existingSalary?.baseSalary?.toString() || '18000');
  const [paymentCycle, setPaymentCycle] = useState(existingSalary?.paymentCycle || 'MONTHLY');
  const [hraAllowance, setHraAllowance] = useState(existingSalary?.allowances?.hra?.toString() || '2000');
  const [fuelAllowance, setFuelAllowance] = useState(existingSalary?.allowances?.fuel?.toString() || '1500');
  const [pfDeduction, setPfDeduction] = useState(existingSalary?.deductions?.pf?.toString() || '1200');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.deliveries.upsertSalaryConfig(driverId, {
        baseSalary: parseFloat(baseSalary),
        paymentCycle,
        allowances: {
          hra: parseFloat(hraAllowance) || 0,
          fuel: parseFloat(fuelAllowance) || 0
        },
        deductions: {
          pf: parseFloat(pfDeduction) || 0
        },
        effectiveFromDate: effectiveDate
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
      const net = (parseFloat(payBase) || 0) + (parseFloat(payAllowances) || 0) - (parseFloat(payDeductions) || 0) - (parseFloat(payAdvances) || 0);
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
        paidAt: new Date().toISOString()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to record payroll payment');
    } finally {
      setLoading(false);
    }
  };

  const netPayPreview = (parseFloat(payBase) || 0) + (parseFloat(payAllowances) || 0) - (parseFloat(payDeductions) || 0) - (parseFloat(payAdvances) || 0);

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Driver Payroll & Salary</h2>
              <p className="text-xs text-slate-500 mt-0.5">{driverName} • Secure Compensation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'CONFIG'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Salary Configuration
          </button>
          <button
            onClick={() => setActiveTab('PAYMENT')}
            className={`ml-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'PAYMENT'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Record Payment Voucher
          </button>
        </div>

        {error && (
          <div className="p-4 mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        {activeTab === 'CONFIG' ? (
          <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Monthly Salary (₹) *</label>
                <input
                  type="number"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Cycle</label>
                <select
                  value={paymentCycle}
                  onChange={(e) => setPaymentCycle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HRA Allowance (₹)</label>
                <input
                  type="number"
                  value={hraAllowance}
                  onChange={(e) => setHraAllowance(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel / Transit Allowance (₹)</label>
                <input
                  type="number"
                  value={fuelAllowance}
                  onChange={(e) => setFuelAllowance(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PF / Tax Deductions (₹)</label>
                <input
                  type="number"
                  value={pfDeduction}
                  onChange={(e) => setPfDeduction(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date *</label>
                <input
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Update Salary Config'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period Start</label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period End</label>
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Pay (₹)</label>
                <input
                  type="number"
                  value={payBase}
                  onChange={(e) => setPayBase(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Allowances (₹)</label>
                <input
                  type="number"
                  value={payAllowances}
                  onChange={(e) => setPayAllowances(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deductions (₹)</label>
                <input
                  type="number"
                  value={payDeductions}
                  onChange={(e) => setPayDeductions(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Deductions (₹)</label>
                <input
                  type="number"
                  value={payAdvances}
                  onChange={(e) => setPayAdvances(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900">Net Disbursed Amount:</span>
              <span className="font-mono text-base font-bold text-emerald-700">₹{netPayPreview.toLocaleString('en-IN')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="BANK_TRANSFER">Direct Bank NEFT/IMPS</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Company Cheque</option>
                  <option value="CASH">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UTR / Reference No.</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {loading ? 'Recording...' : 'Record Paid Voucher'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
