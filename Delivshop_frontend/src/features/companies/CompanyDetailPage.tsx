import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  FileText,
  Package,
  Pencil,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Search,
  Download,
  CreditCard,
  Plus,
  Clock,
  Eye,
  CheckSquare,
  AlertCircle,
  Truck,
  TrendingUp,
  Receipt,
  DollarSign,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import {
  Company,
  Product,
  PaginatedResult,
  PickupRecord,
  SupplierBill,
  SupplierPayment,
  SupplierFinancialSummary,
  PickupStatus,
  BillStatus,
  BillPaymentStatus,
  PaymentMethod,
} from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EditCompanyModal } from './EditCompanyModal';
import { CompanyStatusDialog } from './CompanyStatusDialog';

interface CompanyDetailPageProps {
  companyId: string;
}

export const CompanyDetailPage: React.FC<CompanyDetailPageProps> = ({ companyId }) => {
  const { navigate } = useNavigation();

  // Core Data States
  const [company, setCompany] = useState<Company | null>(null);
  const [summary, setSummary] = useState<SupplierFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section 2: Assigned Products State
  const [productsData, setProductsData] = useState<PaginatedResult<Product>>({
    items: [],
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 1,
  });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Section 3: Pickups State
  const [pickups, setPickups] = useState<PickupRecord[]>([]);
  const [pickupsLoading, setPickupsLoading] = useState(false);
  const [pickupStatusFilter, setPickupStatusFilter] = useState<string>('');
  const [pickupDateStart, setPickupDateStart] = useState<string>('');
  const [pickupDateEnd, setPickupDateEnd] = useState<string>('');

  // Section 4: Supplier Bills State
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billStatusFilter, setBillStatusFilter] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');

  // Section 5: All Payments State (extracted from bills)
  const allPayments = useMemo(() => {
    const list: SupplierPayment[] = [];
    for (const b of bills) {
      if (b.payments && b.payments.length > 0) {
        for (const p of b.payments) {
          list.push({ ...p, billNumber: b.billNumber });
        }
      }
    }
    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [bills]);

  // Modal Dialogs
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedPickupForVerify, setSelectedPickupForVerify] = useState<PickupRecord | null>(null);
  const [isGenerateBillOpen, setIsGenerateBillOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<SupplierBill | null>(null);
  const [selectedBillForView, setSelectedBillForView] = useState<SupplierBill | null>(null);
  const [isSchedulePickupOpen, setIsSchedulePickupOpen] = useState(false);

  // Action / PDF Loading States
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 1. Fetch Company & Financial Summary
  const fetchCompanyDetails = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [compRes, sumRes] = await Promise.all([
        api.companies.get(companyId),
        api.companies.getFinancialSummary(companyId).catch(() => null),
      ]);
      setCompany(compRes);
      if (sumRes) setSummary(sumRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // 2. Fetch Assigned Products
  const fetchAssignedProducts = useCallback(async () => {
    if (!companyId) return;
    setProductsLoading(true);
    try {
      const res = await api.products.list({
        companyId,
        limit: 100,
        search: productSearch.trim() || undefined,
      });
      setProductsData(res);
    } catch (err: any) {
      console.warn('Failed to fetch assigned products:', err.message);
    } finally {
      setProductsLoading(false);
    }
  }, [companyId, productSearch]);

  // 3. Fetch Pickup Records
  const fetchPickups = useCallback(async () => {
    if (!companyId) return;
    setPickupsLoading(true);
    try {
      const res = await api.companies.listPickups(companyId, {
        limit: 50,
        status: pickupStatusFilter || undefined,
        startDate: pickupDateStart || undefined,
        endDate: pickupDateEnd || undefined,
      });
      setPickups(res.items || []);
    } catch (err: any) {
      console.warn('Failed to fetch pickups:', err.message);
    } finally {
      setPickupsLoading(false);
    }
  }, [companyId, pickupStatusFilter, pickupDateStart, pickupDateEnd]);

  // 4. Fetch Supplier Bills
  const fetchBills = useCallback(async () => {
    if (!companyId) return;
    setBillsLoading(true);
    try {
      const res = await api.companies.listBills(companyId, {
        limit: 50,
        status: billStatusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
      });
      setBills(res.items || []);
    } catch (err: any) {
      console.warn('Failed to fetch bills:', err.message);
    } finally {
      setBillsLoading(false);
    }
  }, [companyId, billStatusFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  useEffect(() => {
    fetchAssignedProducts();
  }, [fetchAssignedProducts]);

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Download PDF 1 — Pickup Summary (Quantity Only)
  const handleDownloadPickupPdf = async (pickup: PickupRecord) => {
    try {
      setPdfDownloadingId(pickup.id);
      await api.companies.downloadPickupSummaryPdf(company!.id, pickup.id, pickup.pickupReference);
    } catch (err: any) {
      alert(`Error downloading Pickup Summary PDF: ${err.message}`);
    } finally {
      setPdfDownloadingId(null);
    }
  };

  // Download PDF 2 — Detailed Supplier Payment Bill
  const handleDownloadBillPdf = async (bill: SupplierBill) => {
    try {
      setPdfDownloadingId(bill.id);
      await api.companies.downloadSupplierBillPdf(company!.id, bill.id, bill.billNumber);
    } catch (err: any) {
      alert(`Error downloading Supplier Bill PDF: ${err.message}`);
    } finally {
      setPdfDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px auto', color: '#047857' }} />
        <h3 style={{ fontSize: '16px', color: '#1E293B', fontWeight: 600 }}>Loading Supplier Facility & Ledger...</h3>
        <p style={{ fontSize: '13px', color: '#64748B' }}>Connecting to company records, pickups, and billing services</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="page-container" style={{ padding: '32px 24px' }}>
        <button
          type="button"
          onClick={() => navigate('/admin/companies')}
          className="btn btn-secondary"
          style={{ marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </button>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <AlertTriangle size={42} color="#DC2626" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
              Company Record Not Found
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '440px', margin: '0 auto 24px auto' }}>
              {error || `The supplier company with ID "${companyId}" could not be located in the database.`}
            </p>
            <Button variant="primary" onClick={() => navigate('/admin/companies')}>
              Return to Companies Overview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isActive = company.status === 'ACTIVE';
  const hasCoordinates = company.latitude != null && company.longitude != null;

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/companies')}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Companies</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
            <span>Supplier Management</span>
            <span>/</span>
            <span>Companies</span>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 700 }}>{company.name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Pencil size={15} />
            <span>Edit Company</span>
          </button>
          <button
            type="button"
            onClick={() => setIsStatusOpen(true)}
            className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Power size={15} />
            <span>{isActive ? 'Deactivate' : 'Activate'}</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Primary Summary Cards (Exactly 4 meaningful metrics) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Pickups */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Pickup Records
            </span>
            <Truck size={18} color="#047857" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            {summary ? summary.totalPickupsCount : pickups.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '2px', fontWeight: 500 }}>
            {summary?.verifiedPickupsCount ?? 0} verified • {summary?.unbilledPickupsCount ?? 0} unbilled
          </div>
        </div>

        {/* Card 2: Total Finalized Payable */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Total Finalized Payable
            </span>
            <Receipt size={18} color="#0284C7" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            {formatCurrency(summary?.totalFinalizedPayable ?? 0)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
            All-time across {summary?.totalBillsCount ?? bills.length} bills
          </div>
        </div>

        {/* Card 3: Amount Paid */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Amount Paid to Date
            </span>
            <CheckCircle2 size={18} color="#16A34A" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534' }}>
            {formatCurrency(summary?.totalPaidAmount ?? 0)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '2px' }}>
            Disbursed and reconciled
          </div>
        </div>

        {/* Card 4: Outstanding Balance */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            boxShadow: '0 1px 3px rgba(220,38,38,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
              Outstanding Balance
            </span>
            <DollarSign size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626' }}>
            {formatCurrency(summary?.outstandingBalance ?? 0)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '2px', fontWeight: 600 }}>
            {summary?.unpaidBillsCount ?? 0} bills pending payment
          </div>
        </div>
      </div>

      {/* SECTION 1: Company Profile Information */}
      <Card style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#166534',
              }}
            >
              <Building2 size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {company.name}
                </h1>
                <Badge variant={isActive ? 'success' : 'danger'}>{company.status}</Badge>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                  {company.companyType}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Supplier Code: <strong style={{ color: '#0F172A' }}>{company.companyCode}</strong> • Registered: {formatDate(company.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Profile Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '13px' }}>
          {/* Column A: Contact Info */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
              Primary Contact & Communications
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#047857" />
                <span style={{ fontWeight: 600, color: '#1E293B' }}>{company.contactPerson}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={15} color="#047857" />
                <span>{company.phone}</span>
                <button type="button" onClick={() => handleCopy(company.phone, 'phone')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  {copiedField === 'phone' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={15} color="#047857" />
                <span>{company.email}</span>
                <button type="button" onClick={() => handleCopy(company.email, 'email')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  {copiedField === 'email' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>

          {/* Column B: Loading Location & GPS */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
              Pickup Address & Facility GPS
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
              <MapPin size={15} color="#047857" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#1E293B' }}>{company.addressLine1}</div>
                <div style={{ color: '#475569', fontSize: '12px' }}>
                  {company.city}, {company.state} - {company.postalCode}
                </div>
              </div>
            </div>
            {hasCoordinates ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#047857', fontWeight: 600 }}>
                <span>GPS: {Number(company.latitude).toFixed(6)}, {Number(company.longitude).toFixed(6)}</span>
                <a
                  href={`https://www.google.com/maps?q=${company.latitude},${company.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0284C7' }}
                >
                  <ExternalLink size={11} /> Maps
                </a>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>⚠️ GPS Missing (Required for Driver 300m verification)</div>
            )}
          </div>

          {/* Column C: Settlement & Terms */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '10px' }}>
              Payment Terms & Settlement Config
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>Payment Terms: <strong style={{ color: '#0F172A' }}>{company.paymentTerms || 'NET_15 (15-Day Cycle)'}</strong></div>
              <div>GSTIN: <code style={{ backgroundColor: '#F8FAFC', padding: '1px 5px', borderRadius: '4px' }}>{company.gstin || 'Not Provided'}</code></div>
              <div>PAN: <code style={{ backgroundColor: '#F8FAFC', padding: '1px 5px', borderRadius: '4px' }}>{company.pan || 'Not Provided'}</code></div>
              <div>Bank: <strong style={{ color: '#334155' }}>{company.bankName || 'HDFC Bank'}</strong> ({company.bankAccountNumber || '••••4092'})</div>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 2: Assigned Products */}
      <Card
        title={`Assigned Products Supplied by ${company.name}`}
        subtitle={`Products linked to this company. Displays agreed supplier purchase price (purchase_cost), NOT shop selling price.`}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search assigned products by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => fetchAssignedProducts()} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <RefreshCw size={13} className={productsLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button type="button" onClick={() => navigate('/admin/products')} className="btn btn-primary" style={{ fontSize: '12px' }}>
              <span>Assign More in Catalog →</span>
            </button>
          </div>
        </div>

        {productsLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#047857' }} />
            <div>Loading assigned catalog...</div>
          </div>
        ) : productsData.items.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <Package size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              No products assigned to this company.
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Assign products to {company.name} in the Product Catalog to link supplier purchase prices and automatic pickup scheduling.
            </p>
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Pack Size & Unit</th>
                  <th style={{ textAlign: 'right' }}>Agreed Supplier Price (₹)</th>
                  <th style={{ textAlign: 'center' }}>Tax Rate</th>
                  <th style={{ textAlign: 'center' }}>Fulfillment Model</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {productsData.items.map((prod) => {
                  const isProdActive = prod.isActive ?? prod.is_active ?? true;
                  const purchasePrice = Number(prod.purchaseCost ?? (prod as any).purchase_cost ?? 0);
                  const tax = Number(prod.taxRate ?? (prod as any).tax_rate ?? 0);

                  return (
                    <tr key={prod.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{prod.name}</div>
                        {prod.brand && <div style={{ fontSize: '11px', color: '#64748B' }}>{prod.brand}</div>}
                      </td>
                      <td>
                        <code style={{ fontSize: '11.5px', color: '#047857', backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {prod.sku}
                        </code>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#475569' }}>{prod.category || 'Dairy'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#334155' }}>
                          {prod.packSize || (prod as any).pack_size || '1 unit'} • {prod.baseUnit || (prod as any).base_unit || 'Unit'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#047857' }}>
                          ₹{purchasePrice.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{tax}% GST</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#059669',
                            backgroundColor: '#DCFCE7',
                            padding: '2px 8px',
                            borderRadius: '10px',
                          }}
                        >
                          Direct Supply
                        </span>
                      </td>
                      <td>
                        <Badge variant={isProdActive ? 'success' : 'neutral'}>
                          {isProdActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION 3: Pickup Schedules and Pickup Records */}
      <Card
        title="Pickup Schedules & Supplier Collection Verification Records"
        subtitle="Operational collection records from delivery runs and direct supplier pickups. Tracks Required vs Collected vs Accepted quantities."
        style={{ marginBottom: '24px' }}
      >
        {/* Filters Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={pickupStatusFilter}
              onChange={(e) => setPickupStatusFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="">All Pickup Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COLLECTED">Collected</option>
              <option value="PARTIALLY_COLLECTED">Partially Collected</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="VERIFIED">Verified (Billable)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <input
              type="date"
              value={pickupDateStart}
              onChange={(e) => setPickupDateStart(e.target.value)}
              placeholder="From Date"
              style={{ height: '32px', padding: '0 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            />
            <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
            <input
              type="date"
              value={pickupDateEnd}
              onChange={(e) => setPickupDateEnd(e.target.value)}
              placeholder="To Date"
              style={{ height: '32px', padding: '0 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            />

            {(pickupStatusFilter || pickupDateStart || pickupDateEnd) && (
              <button
                type="button"
                onClick={() => {
                  setPickupStatusFilter('');
                  setPickupDateStart('');
                  setPickupDateEnd('');
                }}
                className="btn btn-secondary"
                style={{ height: '32px', fontSize: '11.5px', padding: '0 8px' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => fetchPickups()} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <RefreshCw size={13} className={pickupsLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Pickups Table */}
        {pickupsLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#047857' }} />
            <div>Loading pickup records...</div>
          </div>
        ) : pickups.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <Truck size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              No pickup records match the selected filters.
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B' }}>
              When delivery runs dispatch or pickups are completed by drivers, records will appear here.
            </p>
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th>Pickup Ref / Date</th>
                  <th>Route / Driver</th>
                  <th>Products Breakdown</th>
                  <th style={{ textAlign: 'right' }}>Req Qty</th>
                  <th style={{ textAlign: 'right' }}>Collected</th>
                  <th style={{ textAlign: 'right' }}>Accepted (Billable)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Billed Ref</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pickups.map((p) => {
                  const isVerified = p.status === 'VERIFIED';
                  const isBilled = p.isBilled;

                  return (
                    <tr key={p.id}>
                      {/* Ref & Date */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                          {p.pickupReference}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {p.scheduledDate ? formatDate(p.scheduledDate) : 'Awaiting Schedule'} • {p.scheduledTimeWindow || 'Morning Run'}
                        </div>
                      </td>

                      {/* Route & Driver */}
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                          {p.routeName || p.runCode || 'Direct Facility Intake'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Driver: {p.driverName || '—'} {p.driverPhone ? `(${p.driverPhone})` : ''}
                        </div>
                      </td>

                      {/* Products Breakdown preview */}
                      <td>
                        <div style={{ maxWidth: '240px' }}>
                          {p.items.slice(0, 2).map((it) => (
                            <div key={it.id} style={{ fontSize: '11.5px', color: '#334155' }}>
                              • {it.productName}: <strong>{it.acceptedQuantity > 0 ? it.acceptedQuantity : it.collectedQuantity} {it.unit}</strong>
                            </div>
                          ))}
                          {p.items.length > 2 && (
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontStyle: 'italic' }}>
                              +{p.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quantities */}
                      <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#475569' }}>
                        {p.totalRequiredUnits}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>
                        {p.totalCollectedUnits}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 800, color: '#047857' }}>
                        {p.totalAcceptedUnits > 0 ? p.totalAcceptedUnits : p.totalCollectedUnits}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor:
                              p.status === 'VERIFIED' ? '#DCFCE7' :
                              p.status === 'COLLECTED' ? '#EFF6FF' :
                              p.status === 'PARTIALLY_COLLECTED' ? '#FEF3C7' : '#F1F5F9',
                            color:
                              p.status === 'VERIFIED' ? '#166534' :
                              p.status === 'COLLECTED' ? '#1E40AF' :
                              p.status === 'PARTIALLY_COLLECTED' ? '#92400E' : '#475569',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Billed */}
                      <td>
                        {isBilled ? (
                          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700, backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.billNumber || 'Billed'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Unbilled</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {!isBilled && (
                            <button
                              type="button"
                              onClick={() => setSelectedPickupForVerify(p)}
                              className="btn btn-secondary btn-table-action"
                              style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#F0FDF4', color: '#047857', borderColor: '#BBF7D0' }}
                              title="Verify accepted and rejected quantities"
                            >
                              <CheckSquare size={12} />
                              <span>Verify</span>
                            </button>
                          )}

                          {/* PDF 1 Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPickupPdf(p)}
                            disabled={pdfDownloadingId === p.id}
                            className="btn btn-secondary btn-table-action"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            title="Download Quantity-Only Pickup Summary PDF"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION 4: Detailed Supplier Bills */}
      <Card
        title="Supplier Bills & Financial Settlements"
        subtitle="Auditable records of amounts owed to this supplier. Calculated from accepted verified quantities × agreed supplier purchase price."
        style={{ marginBottom: '24px' }}
      >
        {/* Billing Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={billStatusFilter}
              onChange={(e) => setBillStatusFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="">All Bill Statuses</option>
              <option value="FINALIZED">Finalized</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="">All Payment Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
            </select>

            {(billStatusFilter || paymentStatusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setBillStatusFilter('');
                  setPaymentStatusFilter('');
                }}
                className="btn btn-secondary"
                style={{ height: '32px', fontSize: '11.5px', padding: '0 8px' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsGenerateBillOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Generate Supplier Bill</span>
            </button>
            <button type="button" onClick={() => fetchBills()} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <RefreshCw size={13} className={billsLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Bills Table */}
        {billsLoading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#047857' }} />
            <div>Loading supplier bills...</div>
          </div>
        ) : bills.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <Receipt size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              No supplier bills created yet.
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '0 auto 16px auto' }}>
              Click "Generate Supplier Bill" to aggregate eligible verified pickup quantities into a finalized payment statement.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsGenerateBillOpen(true)}>
              Generate First Bill
            </Button>
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th>Bill Number / Date</th>
                  <th>Billing Period</th>
                  <th>Linked Pickups</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ textAlign: 'right' }}>Paid (₹)</th>
                  <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                  <th style={{ textAlign: 'center' }}>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const isPaid = b.paymentStatus === 'PAID';
                  const isPartiallyPaid = b.paymentStatus === 'PARTIALLY_PAID';

                  return (
                    <tr key={b.id}>
                      {/* Bill # */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                          {b.billNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Created: {formatDate(b.billDate)}
                        </div>
                      </td>

                      {/* Period */}
                      <td style={{ fontSize: '12px', color: '#334155' }}>
                        {formatDate(b.billingPeriodStart)} to {formatDate(b.billingPeriodEnd)}
                      </td>

                      {/* Pickups Ref */}
                      <td>
                        <div style={{ maxWidth: '180px', fontSize: '11px', color: '#047857', fontWeight: 600 }}>
                          {b.pickupReferences.length > 0 ? b.pickupReferences.join(', ') : 'Direct Intakes'}
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#475569' }}>
                        {formatCurrency(b.subtotalAmount)}
                      </td>

                      {/* Total */}
                      <td style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                        {formatCurrency(b.totalAmount)}
                      </td>

                      {/* Paid */}
                      <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#166534' }}>
                        {formatCurrency(b.paidAmount)}
                      </td>

                      {/* Balance */}
                      <td style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: 800, color: b.outstandingBalance > 0 ? '#DC2626' : '#059669' }}>
                        {formatCurrency(b.outstandingBalance)}
                      </td>

                      {/* Due Date */}
                      <td style={{ textAlign: 'center', fontSize: '11.5px', color: '#475569' }}>
                        {formatDate(b.dueDate)}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            backgroundColor: isPaid ? '#DCFCE7' : isPartiallyPaid ? '#FEF3C7' : '#FEE2E2',
                            color: isPaid ? '#166534' : isPartiallyPaid ? '#92400E' : '#B91C1C',
                          }}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedBillForView(b)}
                            className="btn btn-secondary btn-table-action"
                            style={{ fontSize: '11px', padding: '3px 7px' }}
                            title="View Breakdown Details"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>

                          {/* PDF 2 Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadBillPdf(b)}
                            disabled={pdfDownloadingId === b.id}
                            className="btn btn-secondary btn-table-action"
                            style={{ fontSize: '11px', padding: '3px 7px', backgroundColor: '#F0FDF4', color: '#047857', borderColor: '#BBF7D0' }}
                            title="Download Detailed Supplier Payment Bill PDF"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </button>

                          {b.outstandingBalance > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedBillForPayment(b)}
                              className="btn btn-primary btn-table-action"
                              style={{ fontSize: '11px', padding: '3px 7px' }}
                              title="Record Disbursement Payment"
                            >
                              <CreditCard size={12} />
                              <span>Pay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION 5: Payment History Ledger */}
      <Card
        title="Supplier Payment History & Disbursement Ledger"
        subtitle="Permanent auditable ledger of all payments recorded against this supplier's bills."
        style={{ marginBottom: '24px' }}
      >
        {allPayments.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
            <CreditCard size={32} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>No payment records yet</div>
            <div style={{ fontSize: '12px' }}>When payments are recorded against bills, transaction history will appear here.</div>
          </div>
        ) : (
          <div className="business-table-container">
            <table className="business-table">
              <thead>
                <tr>
                  <th>Payment Number</th>
                  <th>Bill Number</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Transaction Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid (₹)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {allPayments.map((pay) => (
                  <tr key={pay.id}>
                    <td>
                      <code style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px' }}>
                        {pay.paymentNumber}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>{pay.billNumber}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>
                      {formatDate(pay.paymentDate)}
                    </td>
                    <td>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>{pay.paymentMethod}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace' }}>
                        {pay.transactionReference || 'Internal Disbursal'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                      {formatCurrency(pay.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#166534' }}>
                        {pay.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {pay.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: VERIFY PICKUP QUANTITIES */}
      {selectedPickupForVerify && (
        <VerifyPickupModal
          pickup={selectedPickupForVerify}
          onClose={() => setSelectedPickupForVerify(null)}
          onVerified={() => {
            fetchPickups();
            fetchCompanyDetails();
            setSelectedPickupForVerify(null);
          }}
        />
      )}

      {/* MODAL 2: GENERATE SUPPLIER BILL */}
      {isGenerateBillOpen && (
        <GenerateBillModal
          companyId={company.id}
          companyName={company.name}
          onClose={() => setIsGenerateBillOpen(false)}
          onGenerated={() => {
            fetchBills();
            fetchPickups();
            fetchCompanyDetails();
            setIsGenerateBillOpen(false);
          }}
        />
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {selectedBillForPayment && (
        <RecordPaymentModal
          bill={selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          onPaid={() => {
            fetchBills();
            fetchCompanyDetails();
            setSelectedBillForPayment(null);
          }}
        />
      )}

      {/* MODAL 4: VIEW BILL BREAKDOWN */}
      {selectedBillForView && (
        <ViewBillModal
          bill={selectedBillForView}
          onClose={() => setSelectedBillForView(null)}
          onDownloadPdf={() => handleDownloadBillPdf(selectedBillForView)}
        />
      )}

      {/* Edit Company Modal */}
      {isEditOpen && (
        <EditCompanyModal
          company={company}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onCompanyUpdated={() => {
            fetchCompanyDetails();
            setIsEditOpen(false);
          }}
        />
      )}

      {/* Status Toggle Dialog */}
      {isStatusOpen && (
        <CompanyStatusDialog
          company={company}
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          onStatusChanged={() => {
            fetchCompanyDetails();
            setIsStatusOpen(false);
          }}
        />
      )}
    </div>
  );
};

/**
 * MODAL: Verify Pickup Quantities Dialog
 */
const VerifyPickupModal: React.FC<{
  pickup: PickupRecord;
  onClose: () => void;
  onVerified: () => void;
}> = ({ pickup, onClose, onVerified }) => {
  const [items, setItems] = useState(
    pickup.items.map((it) => ({
      itemId: it.id,
      productName: it.productName,
      unit: it.unit,
      requiredQuantity: it.requiredQuantity,
      collectedQuantity: it.collectedQuantity,
      acceptedQuantity: it.acceptedQuantity > 0 ? it.acceptedQuantity : it.collectedQuantity,
      rejectedQuantity: it.rejectedQuantity,
      verificationRemarks: it.verificationRemarks || '',
    }))
  );
  const [verificationNotes, setVerificationNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.companies.verifyPickup(pickup.companyId, pickup.id, {
        items: items.map((it) => ({
          itemId: it.itemId,
          acceptedQuantity: Number(it.acceptedQuantity || 0),
          rejectedQuantity: Number(it.rejectedQuantity || 0),
          verificationRemarks: it.verificationRemarks || undefined,
        })),
        verificationNotes: verificationNotes || undefined,
        status: 'VERIFIED',
      });
      onVerified();
    } catch (err: any) {
      setError(err?.message || 'Failed to save verification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '680px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Verify Pickup Quantities ({pickup.pickupReference})
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Record accepted and rejected quantities for billing eligibility.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '8px' }}>Product</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Req</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Collected</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Accepted*</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Rejected</th>
                  <th style={{ padding: '8px' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.itemId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B' }}>
                      {it.productName}
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>({it.unit})</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#64748B' }}>{it.requiredQuantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>{it.collectedQuantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.acceptedQuantity}
                        onChange={(e) => handleItemChange(idx, 'acceptedQuantity', e.target.value)}
                        style={{ width: '70px', padding: '4px 6px', textAlign: 'right', borderRadius: '4px', border: '1px solid #059669', fontWeight: 700, color: '#047857' }}
                      />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.rejectedQuantity}
                        onChange={(e) => handleItemChange(idx, 'rejectedQuantity', e.target.value)}
                        style={{ width: '60px', padding: '4px 6px', textAlign: 'right', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="Discrepancy note..."
                        value={it.verificationRemarks}
                        onChange={(e) => handleItemChange(idx, 'verificationRemarks', e.target.value)}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Overall Verification Notes:
            </label>
            <textarea
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="e.g., Clean packaging inspected, temperature 3°C verified, 2 units damaged during transit."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Verification & Make Billable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * MODAL: Generate Supplier Bill Dialog
 */
const GenerateBillModal: React.FC<{
  companyId: string;
  companyName: string;
  onClose: () => void;
  onGenerated: () => void;
}> = ({ companyId, companyName, onClose, onGenerated }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState('');
  const [adjustmentsAmount, setAdjustmentsAmount] = useState<number | string>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.companies.generateBill(companyId, {
        billingPeriodStart: startDate,
        billingPeriodEnd: endDate,
        dueDate: dueDate || undefined,
        adjustmentsAmount: adjustmentsAmount ? Number(adjustmentsAmount) : 0,
        adjustmentReason: adjustmentReason || undefined,
        notes: notes || undefined,
      });
      onGenerated();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate bill. Please check that verified unbilled pickups exist.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '520px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Generate Finalized Supplier Bill
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Supplier: <strong>{companyName}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Period Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Period End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Custom Due Date (Leave empty for configured payment terms):
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Adjustments (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={adjustmentsAmount}
                onChange={(e) => setAdjustmentsAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Adjustment Reason / Remarks
              </label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Cold storage rebate or logistics discount"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Notes:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal billing or audit notes..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Generating Bill...' : 'Finalize & Issue Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * MODAL: Record Payment Dialog
 */
const RecordPaymentModal: React.FC<{
  bill: SupplierBill;
  onClose: () => void;
  onPaid: () => void;
}> = ({ bill, onClose, onPaid }) => {
  const [amount, setAmount] = useState<number | string>(bill.outstandingBalance);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.companies.recordPayment(bill.companyId, bill.id, {
        amount: Number(amount),
        paymentMethod,
        transactionReference: transactionRef || undefined,
        notes: notes || undefined,
      });
      onPaid();
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Record Supplier Payment
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Bill No: <strong>{bill.billNumber}</strong> • Balance: <strong style={{ color: '#DC2626' }}>₹{bill.outstandingBalance.toFixed(2)}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '6px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Payment Amount (INR / ₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={bill.outstandingBalance}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 700 }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other Settlement</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Transaction Reference / UTR Number
            </label>
            <input
              type="text"
              placeholder="e.g., UTR7832948274 or Cheque #102938"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Payment Notes:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Batch payment through HDFC corporate portal"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment & Reconcile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * MODAL: View Bill Details Dialog
 */
const ViewBillModal: React.FC<{
  bill: SupplierBill;
  onClose: () => void;
  onDownloadPdf: () => void;
}> = ({ bill, onClose, onDownloadPdf }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '780px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Bill Breakdown — {bill.billNumber}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Period: {bill.billingPeriodStart} to {bill.billingPeriodEnd} • Due: {bill.dueDate}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '8px' }}>Product</th>
                <th style={{ padding: '8px' }}>Unit</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Accepted Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Agreed Price (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Tax %</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Line Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((it) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#1E293B' }}>
                    {it.productName}
                    <div style={{ fontSize: '10.5px', color: '#64748B' }}>SKU: {it.productSku}</div>
                  </td>
                  <td style={{ padding: '8px', color: '#475569' }}>{it.unit}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                    {it.acceptedQuantity}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>₹{it.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#64748B' }}>{it.taxRate}%</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#334155' }}>₹{it.subtotal.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                    ₹{it.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ width: '280px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
              <span>Subtotal:</span>
              <span>₹{bill.subtotalAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
              <span>Taxes (GST):</span>
              <span>₹{bill.taxAmount.toFixed(2)}</span>
            </div>
            {bill.adjustmentsAmount !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Adjustments:</span>
                <span>₹{bill.adjustmentsAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', color: '#0F172A', borderTop: '1px solid #CBD5E1', paddingTop: '6px' }}>
              <span>Total Bill Amount:</span>
              <span>₹{bill.totalAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 600 }}>
              <span>Amount Paid:</span>
              <span>₹{bill.paidAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', fontWeight: 800, fontSize: '13px' }}>
              <span>Outstanding Balance:</span>
              <span>₹{bill.outstandingBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button type="button" onClick={onDownloadPdf} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} />
            <span>Download Detailed Bill PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
