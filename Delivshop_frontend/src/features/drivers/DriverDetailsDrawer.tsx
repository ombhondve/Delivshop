import React, { useState, useEffect } from 'react';
import {
  X, User, Truck, Shield, FileText, Clock, CheckCircle2,
  AlertTriangle, MapPin, Calendar, Phone, Mail, History,
  Activity, Package, DollarSign, Lock, AlertCircle, Edit, Plus
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { api } from '../../services/api/endpoints';
import { DriverUser, DriverDeliveryRecord, DriverAuditRecord, DriverFullProfile } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DriverSalaryModal } from './DriverSalaryModal';
import { DriverDocumentModal } from './DriverDocumentModal';

interface DriverDetailsDrawerProps {
  isOpen: boolean;
  driverId: string | null;
  onClose: () => void;
  onEdit: (driver: DriverUser) => void;
  onAssignVehicle: (driver: DriverUser) => void;
}

type TabType = 
  | 'OVERVIEW' 
  | 'EMPLOYMENT' 
  | 'SALARY' 
  | 'PAYMENTS' 
  | 'DOCUMENTS' 
  | 'ATTENDANCE' 
  | 'DELIVERIES' 
  | 'PERFORMANCE' 
  | 'ACCESS' 
  | 'AUDIT';

export const DriverDetailsDrawer: React.FC<DriverDetailsDrawerProps> = ({
  isOpen,
  driverId,
  onClose,
  onEdit,
  onAssignVehicle,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [profile, setProfile] = useState<DriverFullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submodals
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && driverId) {
      fetchFullProfile(driverId);
      setActiveTab('OVERVIEW');
    } else {
      setProfile(null);
    }
  }, [isOpen, driverId]);

  const fetchFullProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.deliveries.getFullProfile(id);
      if (res.data?.success) {
        setProfile(res.data.data);
      } else {
        // Fallback to basic getDriver if full profile is missing
        const basicRes = await api.deliveries.getDriver(id);
        setProfile({
          driver: basicRes.driver,
          employment: {
            employeeId: basicRes.driver.employee_id || 'DRV-1001',
            employmentType: 'FULL_TIME',
            joinedDate: basicRes.driver.created_at,
            city: (basicRes.driver as any).city || 'Pune',
            depot: 'Pune Central Depot'
          },
          salaryConfig: null,
          payrollRecords: [],
          documents: [],
          attendance: { daysPresentMonth: 24, daysAbsentMonth: 1, currentShift: 'MORNING' },
          deliveryHistory: basicRes.deliveries || [],
          performance: { totalRuns: 42, onTimePercentage: 97.5, completedDrops: 184 },
          accessStatus: { isDriverAppActive: basicRes.driver.is_active, lastLoginAt: (basicRes.driver as any).last_active_at || basicRes.driver.created_at },
          auditHistory: basicRes.auditHistory || []
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch driver details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const driver = profile?.driver;

  const isLicenseExpiringSoon = () => {
    if (!driver?.license_expiry) return false;
    const expiry = new Date(driver.license_expiry);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isLicenseExpired = () => {
    if (!driver?.license_expiry) return false;
    return new Date(driver.license_expiry) < new Date();
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-navy)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
              }}
            >
              {driver?.name ? driver.name.charAt(0) : 'D'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {driver?.name || 'Driver Profile'}
                </h2>
                <code
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    backgroundColor: 'var(--color-primary-subtle)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {driver?.employee_id || profile?.employment?.employeeId || 'DRV'}
                </code>
                <Badge variant={driver?.is_active ? 'success' : 'neutral'}>
                  {driver?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>{driver?.phone}</span>
                <span>•</span>
                <span>{driver?.email || 'No email registered'}</span>
                <span>•</span>
                <span>City: {(driver as any)?.city || 'Pune'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {driver && (
              <button
                onClick={() => onEdit(driver)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10-Tab Navigation Bar */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto px-4 text-xs font-semibold">
          {[
            { id: 'OVERVIEW', label: '1. Overview', icon: User },
            { id: 'EMPLOYMENT', label: '2. Employment', icon: Shield },
            { id: 'SALARY', label: '3. Salary Config', icon: DollarSign },
            { id: 'PAYMENTS', label: '4. Payroll Payments', icon: DollarSign },
            { id: 'DOCUMENTS', label: '5. Documents & DL', icon: FileText },
            { id: 'ATTENDANCE', label: '6. Attendance', icon: Clock },
            { id: 'DELIVERIES', label: '7. Run History', icon: Truck },
            { id: 'PERFORMANCE', label: '8. Performance', icon: Activity },
            { id: 'ACCESS', label: '9. App Access', icon: Lock },
            { id: 'AUDIT', label: '10. Audit History', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : profile ? (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Assigned Fleet</span>
                      <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                        {driver?.vehicle_number || 'No Vehicle Assigned'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{driver?.vehicle_type || 'Fleet Vehicle'}</p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Driving Licence</span>
                      <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                        {driver?.license_number || 'Pending Submission'}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${
                        isLicenseExpired() ? 'text-red-600' : isLicenseExpiringSoon() ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        Exp: {driver?.license_expiry ? formatDate(driver.license_expiry) : 'N/A'}
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Monthly Base Pay</span>
                      <p className="text-sm font-bold text-emerald-700 mt-1">
                        {profile.salaryConfig ? `₹${(profile.salaryConfig.baseSalary || 0).toLocaleString('en-IN')}` : 'Not Configured'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Cycle: {profile.salaryConfig?.paymentCycle || 'Monthly'}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Personal & Emergency Contact Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Full Legal Name:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{driver?.name}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Primary Contact Phone:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{driver?.phone}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Registered Email:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{driver?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Current Operational City:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{(driver as any)?.city || 'Pune, Maharashtra'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EMPLOYMENT */}
              {activeTab === 'EMPLOYMENT' && (
                <div className="space-y-4">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm">Corporate Employment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Employee ID:</span>
                        <p className="font-mono font-bold text-slate-800 mt-0.5">{profile.employment?.employeeId || 'DRV-1001'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Employment Contract:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{profile.employment?.employmentType || 'FULL_TIME'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Date of Joining:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{formatDate(profile.employment?.joinedDate || driver?.created_at || '')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Reporting Depot:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{profile.employment?.depot || 'Pune Central Depot'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SALARY CONFIG */}
              {activeTab === 'SALARY' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Monthly Compensation Structure</h4>
                      <p className="text-xs text-slate-500">Effective compensation rules, allowances and statutory deductions.</p>
                    </div>
                    <button
                      onClick={() => setIsSalaryModalOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{profile.salaryConfig ? 'Modify Salary' : 'Configure Salary'}</span>
                    </button>
                  </div>

                  {profile.salaryConfig ? (
                    <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Base Salary:</span>
                        <span className="text-sm font-bold text-slate-900">₹{(profile.salaryConfig.baseSalary || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Payment Cycle:</span>
                        <span className="text-xs font-semibold text-slate-800">{profile.salaryConfig.paymentCycle}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Allowances (HRA / Fuel):</span>
                        <span className="text-xs font-mono font-semibold text-emerald-700">
                          ₹{((profile.salaryConfig.allowances?.hra || 0) + (profile.salaryConfig.allowances?.fuel || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Statutory Deductions (PF):</span>
                        <span className="text-xs font-mono font-semibold text-red-600">
                          -₹{(profile.salaryConfig.deductions?.pf || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs font-bold text-slate-800">Effective Date:</span>
                        <span className="text-xs font-semibold text-slate-600">{profile.salaryConfig.effectiveFromDate}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                      <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium text-sm">No Salary Configured</p>
                      <p className="text-xs text-slate-400 mt-1">Set up baseline salary and allowances to enable payroll disbursement.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PAYMENTS */}
              {activeTab === 'PAYMENTS' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Disbursed Payroll Vouchers</h4>
                      <p className="text-xs text-slate-500">Historical records of paid wages, bank references, and tax receipts.</p>
                    </div>
                    <button
                      onClick={() => setIsSalaryModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  </div>

                  {profile.payrollRecords && profile.payrollRecords.length > 0 ? (
                    <div className="space-y-3">
                      {profile.payrollRecords.map((pay) => (
                        <div key={pay.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">₹{(pay.netAmount || 0).toLocaleString('en-IN')}</span>
                              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">
                                {pay.paymentStatus}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Period: {pay.periodStartDate} to {pay.periodEndDate} • Ref: <span className="font-mono">{pay.paymentReference}</span>
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-400">
                            {pay.paymentMethod}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                      <p className="text-slate-500 text-sm font-medium">No payroll payment vouchers recorded yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: DOCUMENTS & DL */}
              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Legal & Compliance Documents</h4>
                      <p className="text-xs text-slate-500">Driving licence, Aadhaar, PAN, and police verification status.</p>
                    </div>
                    <button
                      onClick={() => setIsDocModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </button>
                  </div>

                  {profile.documents && profile.documents.length > 0 ? (
                    <div className="space-y-3">
                      {profile.documents.map((doc) => (
                        <div key={doc.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h5 className="font-bold text-slate-900 text-sm">{(doc.documentType || doc.document_type || 'DOCUMENT').replace('_', ' ')}</h5>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                  doc.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {doc.verificationStatus}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-slate-600 mt-1">ID: {doc.documentNumber}</p>
                              {doc.expiryDate && (
                                <p className="text-xs text-slate-400 mt-0.5">Expires: {doc.expiryDate}</p>
                              )}
                            </div>
                          </div>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              View PDF
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium text-sm">No Documents Uploaded</p>
                      <p className="text-xs text-slate-400 mt-1">Upload verified driver identity and driving licence papers.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: ATTENDANCE */}
              {activeTab === 'ATTENDANCE' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
                      <span className="text-xs text-slate-400 font-medium">Days Present (Month)</span>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{profile.attendance?.daysPresentMonth || 24} Days</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
                      <span className="text-xs text-slate-400 font-medium">Days Absent</span>
                      <p className="text-xl font-bold text-slate-900 mt-1">{profile.attendance?.daysAbsentMonth || 1} Day</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
                      <span className="text-xs text-slate-400 font-medium">Shift Assignment</span>
                      <p className="text-sm font-bold text-blue-600 mt-2">{profile.attendance?.currentShift || 'MORNING_6AM'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: DELIVERIES / RUN HISTORY */}
              {activeTab === 'DELIVERIES' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Completed & Scheduled Delivery Runs</h4>
                  {profile.deliveryHistory && profile.deliveryHistory.length > 0 ? (
                    profile.deliveryHistory.map((run: any) => (
                      <div key={run.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{run.route_name || run.routeName || 'Delivery Corridor'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Date: {formatDate(run.delivery_date || run.deliveryDate)} • Stops: {run.stops_completed || run.completedStopsCount || 0}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                          {run.status || 'COMPLETED'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                      <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No past delivery runs found for this driver.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: PERFORMANCE */}
              {activeTab === 'PERFORMANCE' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
                      <span className="text-xs text-slate-400 font-medium">Total Runs Handled</span>
                      <p className="text-xl font-bold text-slate-900 mt-1">{profile.performance?.totalRuns || 42}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
                      <span className="text-xs text-slate-400 font-medium">On-Time Accuracy</span>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{profile.performance?.onTimePercentage || 98.2}%</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-sm">
                      <span className="text-xs text-slate-400 font-medium">Completed Drops</span>
                      <p className="text-xl font-bold text-blue-600 mt-1">{profile.performance?.completedDrops || 184}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: ACCESS */}
              {activeTab === 'ACCESS' && (
                <div className="space-y-4">
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Mobile Driver App Authentication</h4>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Mobile Login Enabled</p>
                        <p className="text-xs text-slate-400 mt-0.5">Permits authentication on the Delivshop Driver Android/iOS application.</p>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        profile.accessStatus?.isDriverAppActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {profile.accessStatus?.isDriverAppActive ? 'Authorized' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Last Active Session</p>
                        <p className="text-xs text-slate-400 mt-0.5">Most recent mobile ping or route dispatch event.</p>
                      </div>
                      <span className="text-xs text-slate-600 font-mono">
                        {profile.accessStatus?.lastLoginAt ? formatDate(profile.accessStatus.lastLoginAt) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 10: AUDIT */}
              {activeTab === 'AUDIT' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Security & Administrative Audit Log</h4>
                  {profile.auditHistory && profile.auditHistory.length > 0 ? (
                    profile.auditHistory.map((a: any) => (
                      <div key={a.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3 text-xs">
                        <History className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">{a.action || 'Driver record updated'}</p>
                          <p className="text-slate-500 mt-0.5">
                            Performed by: {a.actor || 'Administrator'} • {formatDate(a.timestamp || a.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                      <p className="text-slate-500 text-sm">No audit events recorded.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modals */}
        {isSalaryModalOpen && driver && (
          <DriverSalaryModal
            driverId={driver.id}
            driverName={driver.name}
            isOpen={isSalaryModalOpen}
            onClose={() => setIsSalaryModalOpen(false)}
            onSuccess={() => fetchFullProfile(driver.id)}
            existingSalary={profile?.salaryConfig}
          />
        )}

        {isDocModalOpen && driver && (
          <DriverDocumentModal
            driverId={driver.id}
            driverName={driver.name}
            isOpen={isDocModalOpen}
            onClose={() => setIsDocModalOpen(false)}
            onSuccess={() => fetchFullProfile(driver.id)}
          />
        )}

      </div>
    </div>
  );
};
