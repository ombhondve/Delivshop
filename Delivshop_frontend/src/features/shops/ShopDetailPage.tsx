import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Pencil,
  Power,
  MapPin,
  ExternalLink,
  Shield,
  Key,
  Truck,
  CreditCard,
  ShoppingBag,
  Building2,
  RefreshCw,
  Check,
  Copy,
  AlertTriangle,
  ChevronRight,
  Eye,
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api/endpoints';
import {
  Shop,
  ShopAccountStatus,
  Order,
  Invoice,
  Payment,
  Delivery,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../context/NavigationContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EditShopModal } from './EditShopModal';
import { AssignDriverModal } from './AssignDriverModal';

interface ShopDetailPageProps {
  shopId: string;
}

export const ShopDetailPage: React.FC<ShopDetailPageProps> = ({ shopId }) => {
  const { user } = useAuth();
  const { navigate, goBack } = useNavigation();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'invoices' | 'deliveries' | 'security'>('overview');
  const [shop, setShop] = useState<Shop | null>(null);
  const [accountStatus, setAccountStatus] = useState<ShopAccountStatus | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Status toggle confirmation
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);

  // Credentials reissue state
  const [isReissuing, setIsReissuing] = useState(false);
  const [reissuedPassword, setReissuedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Individual Order Details modal/viewer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderForDriver, setSelectedOrderForDriver] = useState<Order | null>(null);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);

  const fetchShopData = async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.shops.get(shopId);
      setShop(res.shop);
      setAccountStatus(res.accountStatus);

      // Concurrently fetch business records (orders, invoices, payments, deliveries)
      const [ordList, invList, payList, delList] = await Promise.allSettled([
        api.shops.getOrders(shopId),
        api.shops.getInvoices(shopId),
        api.shops.getPayments(shopId),
        api.shops.getDeliveries(shopId),
      ]);

      if (ordList.status === 'fulfilled') setOrders(ordList.value || []);
      if (invList.status === 'fulfilled') setInvoices(invList.value || []);
      if (payList.status === 'fulfilled') setPayments(payList.value || []);
      if (delList.status === 'fulfilled') setDeliveries(delList.value || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve shop information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

  const handleToggleStatus = async () => {
    if (!shop) return;
    setStatusToggling(true);
    const newStatus = shop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.shops.updateStatus(shop.id, newStatus);
      setIsConfirmingDeactivate(false);
      await fetchShopData();
    } catch (err: any) {
      alert(err.message || 'Failed to update shop status');
    } finally {
      setStatusToggling(false);
    }
  };

  const handleReissueCredentials = async () => {
    if (!shop) return;
    setIsReissuing(true);
    try {
      const res = await api.shops.reissueCredentials(shop.id);
      setReissuedPassword(res.temporaryPassword);
      await fetchShopData();
    } catch (err: any) {
      alert(err.message || 'Failed to reissue credentials');
    } finally {
      setIsReissuing(false);
    }
  };

  const handleCopyPassword = () => {
    if (reissuedPassword) {
      navigator.clipboard.writeText(reissuedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2500);
    }
  };

  const isAuthorizedForSecurity = user?.role === 'ADMIN' || user?.role === 'SUPPLIER';

  // 1. Loading State
  if (loading) {
    return (
      <div className="page-container">
        <div className="shop-details-loading">
          <RefreshCw size={28} className="spin-icon text-emerald" />
          <h3 className="loading-title">Loading Shop Records...</h3>
          <p className="loading-desc">Fetching store profile, routing coordinates, and financial ledger.</p>
        </div>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (error || !shop) {
    return (
      <div className="page-container">
        <div className="shop-not-found-card">
          <div className="not-found-icon-wrap">
            <Building2 size={36} className="text-muted" />
          </div>
          <h3 className="not-found-title">Shop Not Found</h3>
          <p className="not-found-desc">
            {error || `The requested shop with identifier "${shopId}" could not be located in the database.`}
          </p>
          <div className="not-found-actions">
            <Button
              variant="secondary"
              onClick={() => fetchShopData()}
              icon={<RefreshCw size={15} />}
            >
              Retry
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/shops')}
              icon={<ArrowLeft size={16} />}
            >
              Back to Shops Directory
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container shop-details-container">
      {/* 1. Breadcrumbs */}
      <nav className="shop-detail-breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => navigate('/shops')}
          className="breadcrumb-link"
        >
          Shops
        </button>
        <ChevronRight size={14} className="breadcrumb-chevron" />
        <span className="breadcrumb-current">Shop Details</span>
      </nav>

      {/* 2. Top Summary & Actions Header */}
      <div className="shop-detail-header-card">
        <div className="shop-detail-header-main">
          <div className="shop-detail-title-row">
            <h2 className="shop-detail-name">{shop.name}</h2>
            <code className="shop-id-code">{shop.shop_id || shop.id}</code>
            <Badge variant={shop.status === 'ACTIVE' ? 'success' : 'danger'}>
              {shop.status}
            </Badge>
            <span
              className={`badge ${shop.is_location_verified ? 'badge-info' : 'badge-neutral'}`}
              style={{ fontSize: '11px' }}
            >
              {shop.is_location_verified ? 'GPS Verified' : 'Location Unverified'}
            </span>
          </div>

          <div className="shop-detail-submeta">
            <span><strong>Type:</strong> {shop.shop_type || 'Retail Shop'}</span>
            <span className="meta-separator">•</span>
            <span><strong>Owner:</strong> {shop.owner_name}</span>
            <span className="meta-separator">•</span>
            <span><strong>Contact:</strong> {shop.phone}</span>
            <span className="meta-separator">•</span>
            <span><strong>City:</strong> {shop.city}, {shop.state}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shop-detail-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={goBack}
            icon={<ArrowLeft size={16} />}
            title="Return to Shops List"
          >
            Back to Shops
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsEditModalOpen(true)}
            icon={<Pencil size={15} />}
          >
            Edit Shop
          </Button>

          {isAuthorizedForSecurity && (
            <button
              type="button"
              onClick={() => {
                if (shop.status === 'ACTIVE') {
                  setIsConfirmingDeactivate(true);
                } else {
                  handleToggleStatus();
                }
              }}
              disabled={statusToggling}
              className={`btn btn-sm ${
                shop.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
              }`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 14px' }}
              title={shop.status === 'ACTIVE' ? 'Deactivate Shop' : 'Activate Shop'}
            >
              <Power size={14} />
              <span>{shop.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Deactivation Confirmation Banner */}
      {isConfirmingDeactivate && (
        <div className="shop-deactivate-banner" role="alert">
          <div className="deactivate-banner-text">
            <AlertTriangle size={18} className="text-danger" />
            <span>
              <strong>Confirm Shop Deactivation:</strong> This will suspend merchant login access and prevent new order dispatches.
            </span>
          </div>
          <div className="deactivate-banner-actions">
            <button
              type="button"
              onClick={() => setIsConfirmingDeactivate(false)}
              className="btn btn-secondary btn-sm"
              disabled={statusToggling}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              className="btn btn-danger btn-sm"
              disabled={statusToggling}
            >
              {statusToggling ? 'Deactivating...' : 'Confirm Deactivate'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="shop-detail-tabs-bar" role="tablist">
        {[
          { key: 'overview', label: 'Overview & Profile', icon: <MapPin size={16} /> },
          { key: 'orders', label: `Orders (${orders.length})`, icon: <ShoppingBag size={16} /> },
          { key: 'invoices', label: `Invoices & Ledger (${invoices.length})`, icon: <CreditCard size={16} /> },
          { key: 'deliveries', label: `Deliveries (${deliveries.length})`, icon: <Truck size={16} /> },
          ...(isAuthorizedForSecurity
            ? [{ key: 'security', label: 'Security & Access', icon: <Shield size={16} /> }]
            : []),
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`shop-detail-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 4. Tab Content Area */}
      <div className="shop-detail-content-area">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="overview-tab-stack">
            {/* Financial Summary KPI Cards */}
            <div className="metrics-grid" style={{ marginBottom: '20px' }}>
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">Payment Terms</span>
                  <div className="metric-icon-box">
                    <CreditCard size={17} />
                  </div>
                </div>
                <div className="metric-value-row">
                  <span className="metric-value" style={{ fontSize: '18px' }}>
                    {shop.payment_terms || 'Advance Payment'}
                  </span>
                </div>
                <div className="metric-subtitle">Governs credit eligibility and dispatch terms</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">Credit Limit</span>
                  <div className="metric-icon-box">
                    <Shield size={17} />
                  </div>
                </div>
                <div className="metric-value-row">
                  <span className="metric-value text-emerald">
                    ₹{Number(shop.credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="metric-subtitle">Maximum approved post-paid balance</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-title">Outstanding Balance</span>
                  <div className="metric-icon-box">
                    <CreditCard size={17} />
                  </div>
                </div>
                <div className="metric-value-row">
                  <span
                    className="metric-value"
                    style={{
                      color: Number(shop.outstanding_balance) > 0 ? '#B91C1C' : '#16805D',
                    }}
                  >
                    ₹{Number(shop.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="metric-subtitle">
                  {Number(shop.outstanding_balance) > 0 ? 'Payment collection required' : 'Account current and in good standing'}
                </div>
              </div>
            </div>

            {/* Profile & Location 2-Column Grid */}
            <div className="shop-detail-grid-two">
              {/* Store Information Card */}
              <Card title="Store & Contact Profile" subtitle="Official registration and business details">
                <div className="details-key-val-list">
                  <div className="key-val-row">
                    <span className="key-label">Store Legal Name</span>
                    <span className="val-text font-semibold text-primary">{shop.name}</span>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">Shop Identifier</span>
                    <code className="shop-id-code">{shop.shop_id}</code>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">Shop Category</span>
                    <span className="val-text">{shop.shop_type || 'Retail Shop'}</span>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">Primary Owner</span>
                    <span className="val-text">{shop.owner_name}</span>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">Phone Number</span>
                    <span className="val-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} className="text-secondary" />
                      {shop.phone}
                    </span>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">Email Address</span>
                    <span className="val-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} className="text-secondary" />
                      {shop.email}
                    </span>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">GSTIN / Tax ID</span>
                    <span className="val-text">{shop.gstin || 'Not registered / exempt'}</span>
                  </div>
                  <div className="key-val-row">
                    <span className="key-label">Registered On</span>
                    <span className="val-text">
                      {shop.created_at ? new Date(shop.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Delivery Destination & GPS Card */}
              <Card
                title="Delivery Address & GPS Coordinates"
                subtitle="Driver drop-off point and map destination"
                action={
                  shop.latitude && shop.longitude ? (
                    <a
                      href={`https://maps.google.com/?q=${shop.latitude},${shop.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '6px' }}
                    >
                      <ExternalLink size={13} />
                      <span>Open in Maps</span>
                    </a>
                  ) : undefined
                }
              >
                <div className="delivery-address-block">
                  <div className="address-box">
                    <p className="address-line font-medium text-primary">{shop.address}</p>
                    <p className="address-line text-secondary">
                      {shop.area}
                      {shop.landmark ? `, Near ${shop.landmark}` : ''}
                    </p>
                    <p className="address-line text-secondary">
                      {shop.city}, {shop.state} - {shop.pincode}
                    </p>
                  </div>

                  {/* GPS Pin Status Block */}
                  <div className="gps-coordinates-card">
                    <div className="gps-header">
                      <span className="gps-label">Target GPS Coordinates</span>
                      <Badge variant={shop.is_location_verified ? 'success' : 'neutral'} size="sm">
                        {shop.is_location_verified ? 'Verified Destination' : 'Unverified'}
                      </Badge>
                    </div>

                    {shop.latitude && shop.longitude ? (
                      <div>
                        <div className="gps-coords-display">
                          {Number(shop.latitude).toFixed(6)}, {Number(shop.longitude).toFixed(6)}
                        </div>
                        <div className="gps-verified-note">
                          <CheckCircle2 size={13} className="text-emerald" />
                          <span>Coordinates enabled for driver mobile navigation routing</span>
                        </div>
                      </div>
                    ) : (
                      <div className="gps-unverified-note">
                        <AlertCircle size={14} className="text-warning" />
                        <span>Coordinates not yet recorded. Edit this shop to pin exact delivery location.</span>
                      </div>
                    )}
                  </div>

                  {/* Instructions & Time Window */}
                  <div className="delivery-instructions-grid">
                    <div className="instructions-col">
                      <span className="instructions-label">Preferred Delivery Window</span>
                      <p className="instructions-text">
                        {shop.delivery_window || 'Standard Morning Dispatch (05:00 - 08:00 AM)'}
                      </p>
                    </div>
                    <div className="instructions-col">
                      <span className="instructions-label">Delivery Instructions</span>
                      <p className="instructions-text">
                        {shop.delivery_instructions || 'Deliver to front counter or milk refrigeration crates'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ORDERS ================= */}
        {activeTab === 'orders' && (
          <Card
            title={`Orders from ${shop.name}`}
            subtitle="Full order fulfillment history and crate dispatches"
            noPadding
          >
            {orders.length === 0 ? (
              <div className="table-empty-container">
                <ShoppingBag size={38} className="empty-state-icon" />
                <h4 className="empty-state-title">No orders recorded yet</h4>
                <p className="empty-state-desc">
                  This merchant shop has not placed any dairy delivery orders yet. Orders created via the mobile app or dispatch desk will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="business-table-container">
                <table className="business-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Order Date</th>
                      <th>Assigned Driver</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <code className="shop-id-code">
                            {ord.order_number || ord.orderNumber || ord.id.slice(0, 8)}
                          </code>
                        </td>
                        <td>
                          <div className="font-medium text-primary">
                            {ord.created_at || ord.createdAt
                              ? new Date(ord.created_at || ord.createdAt!).toLocaleDateString('en-IN', {
                                  dateStyle: 'medium',
                                })
                              : 'Recent'}
                          </div>
                          <div className="text-secondary text-xs">
                            {ord.created_at || ord.createdAt
                              ? new Date(ord.created_at || ord.createdAt!).toLocaleTimeString('en-IN', {
                                  timeStyle: 'short',
                                })
                              : ''}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-primary">
                            {ord.driver_name || ord.driverName || 'Unassigned'}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-primary">
                            ₹{Number(ord.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td>
                          <Badge
                            variant={
                              ord.status === 'DELIVERED'
                                ? 'success'
                                : ord.status === 'CANCELLED'
                                ? 'danger'
                                : 'info'
                            }
                          >
                            {ord.status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions-group" style={{ justifyContent: 'flex-end' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Eye size={13} />}
                              onClick={() => setSelectedOrder(ord)}
                            >
                              View Details
                            </Button>
                            {ord.status !== 'DELIVERED' && ord.status !== 'CANCELLED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Truck size={13} />}
                                onClick={() => {
                                  setSelectedOrderForDriver(ord);
                                  setIsAssignDriverOpen(true);
                                }}
                              >
                                Assign Driver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ================= TAB 3: INVOICES & PAYMENTS ================= */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Invoices Table */}
            <Card
              title="Issued Billing Invoices"
              subtitle={`Total invoices: ${invoices.length}`}
              noPadding
            >
              {invoices.length === 0 ? (
                <div className="table-empty-container">
                  <CreditCard size={38} className="empty-state-icon" />
                  <h4 className="empty-state-title">No invoices issued yet</h4>
                  <p className="empty-state-desc">
                    Invoices are automatically generated upon order dispatch according to approved payment terms.
                  </p>
                </div>
              ) : (
                <div className="business-table-container">
                  <table className="business-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>
                            <code className="shop-id-code">{inv.invoice_number}</code>
                          </td>
                          <td>
                            <div className="font-semibold text-primary">
                              ₹{Number(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td>
                            <div className="text-secondary text-xs">
                              {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : 'On Dispatch'}
                            </div>
                          </td>
                          <td>
                            <Badge
                              variant={
                                inv.status === 'PAID'
                                  ? 'success'
                                  : inv.status === 'OVERDUE'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="text-secondary text-xs">
                              {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : 'Recent'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Payments Ledger Table */}
            <Card
              title="Recorded Payments & Receipts"
              subtitle={`Total payment records: ${payments.length}`}
              noPadding
            >
              {payments.length === 0 ? (
                <div className="table-empty-container">
                  <CreditCard size={38} className="empty-state-icon" />
                  <h4 className="empty-state-title">No payments recorded yet</h4>
                  <p className="empty-state-desc">
                    Collections made by drivers or bank transfers recorded by finance will appear in this ledger.
                  </p>
                </div>
              ) : (
                <div className="business-table-container">
                  <table className="business-table">
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Reference #</th>
                        <th>Status</th>
                        <th>Receipt Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <code className="shop-id-code">{p.payment_number}</code>
                          </td>
                          <td>
                            <div className="font-semibold text-emerald">
                              ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-neutral">{p.payment_method}</span>
                          </td>
                          <td>
                            <span className="text-secondary text-xs">{p.transaction_ref || 'Cash Handover'}</span>
                          </td>
                          <td>
                            <Badge variant={p.status === 'COMPLETED' ? 'success' : 'neutral'}>
                              {p.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="text-secondary text-xs">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : 'Recent'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================= TAB 4: DELIVERIES ================= */}
        {activeTab === 'deliveries' && (
          <Card
            title={`Delivery Tracking for ${shop.name}`}
            subtitle="Driver dispatch runs and destination deliveries"
            noPadding
          >
            {deliveries.length === 0 ? (
              <div className="table-empty-container">
                <Truck size={38} className="empty-state-icon" />
                <h4 className="empty-state-title">No deliveries recorded</h4>
                <p className="empty-state-desc">
                  Dispatched delivery runs from the central dairy facility will be tracked here in real time.
                </p>
              </div>
            ) : (
              <div className="business-table-container">
                <table className="business-table">
                  <thead>
                    <tr>
                      <th>Delivery / Order #</th>
                      <th>Driver Assigned</th>
                      <th>Status</th>
                      <th>Dispatched Date</th>
                      <th>Notes / GPS Pin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((del) => (
                      <tr key={del.id}>
                        <td>
                          <code className="shop-id-code">
                            {del.order_number || del.orderId || del.id.slice(0, 8)}
                          </code>
                        </td>
                        <td>
                          <div className="font-medium text-primary">{del.driver_name || 'Driver'}</div>
                        </td>
                        <td>
                          <Badge
                            variant={
                              del.status === 'DELIVERED'
                                ? 'success'
                                : del.status === 'FAILED'
                                ? 'danger'
                                : 'info'
                            }
                          >
                            {del.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="text-secondary text-xs">
                            {del.created_at ? new Date(del.created_at).toLocaleString('en-IN') : 'Recent'}
                          </div>
                        </td>
                        <td>
                          <span className="text-secondary text-xs">{del.notes || 'Routine crate delivery'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ================= TAB 5: SECURITY CREDENTIALS ================= */}
        {activeTab === 'security' && isAuthorizedForSecurity && (
          <div className="security-tab-stack">
            <Card
              title="Account Provisioning & Security Credentials"
              subtitle="Manage mobile app merchant credentials and session security"
            >
              <div className="security-kpi-grid">
                <div className="security-kpi-item">
                  <span className="security-kpi-label">Official Shop ID</span>
                  <div className="security-kpi-val text-primary font-mono font-bold">
                    {accountStatus?.shopId || shop.shop_id}
                  </div>
                  <span className="security-kpi-desc">Used by merchant to authenticate at mobile login</span>
                </div>

                <div className="security-kpi-item">
                  <span className="security-kpi-label">Password Setup Status</span>
                  <div style={{ marginTop: '4px' }}>
                    <Badge variant={accountStatus?.mustChangePassword ? 'warning' : 'success'}>
                      {accountStatus?.mustChangePassword
                        ? 'Mandatory Setup Pending'
                        : 'Password Initialized'}
                    </Badge>
                  </div>
                  <span className="security-kpi-desc">
                    {accountStatus?.mustChangePassword
                      ? 'Owner must change temporary password on next login'
                      : 'Owner has verified secure private password'}
                  </span>
                </div>

                <div className="security-kpi-item">
                  <span className="security-kpi-label">Account Lockout Protection</span>
                  <div style={{ marginTop: '4px' }}>
                    <Badge variant={accountStatus?.isLocked ? 'danger' : 'neutral'}>
                      {accountStatus?.isLocked ? 'Locked (Brute Force)' : 'Normal Status'}
                    </Badge>
                  </div>
                  <span className="security-kpi-desc">
                    Failed login attempts: {accountStatus?.failedAttempts || 0}
                  </span>
                </div>
              </div>

              {/* Reissue Temporary Password Action */}
              <div className="security-action-row">
                <div className="action-row-text">
                  <h4 className="action-row-heading">Reissue Temporary Access Password</h4>
                  <p className="action-row-desc">
                    Generates a new secure Argon2id temporary password and forces mandatory password reset upon next mobile login. Stored passwords are never displayed.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleReissueCredentials}
                  disabled={isReissuing}
                  icon={<Key size={15} />}
                >
                  {isReissuing ? 'Generating...' : 'Reissue Access'}
                </Button>
              </div>

              {/* Single-Reveal Temporary Password Notice */}
              {reissuedPassword && (
                <div className="temporary-password-reveal-box">
                  <div className="reveal-box-header">
                    <Shield size={16} className="text-emerald" />
                    <strong>New Temporary Password Provisioned</strong>
                  </div>
                  <div className="reveal-box-code-row">
                    <code className="reveal-code">{reissuedPassword}</code>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCopyPassword}
                      icon={copiedPassword ? <Check size={14} /> : <Copy size={14} />}
                    >
                      {copiedPassword ? 'Copied to Clipboard' : 'Copy Password'}
                    </Button>
                  </div>
                  <p className="reveal-box-warning">
                    This temporary password is encrypted with Argon2id and will not be displayed again. Share it securely with the verified store owner.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Edit Shop Modal */}
      <EditShopModal
        shop={shop}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={fetchShopData}
      />

      {/* 2. Assign Driver Modal */}
      <AssignDriverModal
        order={selectedOrderForDriver}
        isOpen={isAssignDriverOpen}
        onClose={() => {
          setIsAssignDriverOpen(false);
          setSelectedOrderForDriver(null);
        }}
        onAssigned={fetchShopData}
      />

      {/* 3. Individual Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '640px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Order Details</span>
                  <code className="shop-id-code">
                    {selectedOrder.order_number || selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}
                  </code>
                  <Badge variant={selectedOrder.status === 'DELIVERED' ? 'success' : 'info'}>
                    {selectedOrder.status}
                  </Badge>
                </h3>
                <p className="modal-desc">
                  Store: {shop.name} ({shop.shop_id})
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  backgroundColor: '#FFFFFF',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Assigned Driver
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#20342C' }}>
                    {selectedOrder.driver_name || selectedOrder.driverName || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Order Date
                  </span>
                  <div style={{ fontSize: '13.5px', color: '#20342C' }}>
                    {selectedOrder.created_at || selectedOrder.createdAt
                      ? new Date(selectedOrder.created_at || selectedOrder.createdAt!).toLocaleString('en-IN')
                      : 'Recent'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Order Value
                  </span>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#16805D' }}>
                    ₹{Number(selectedOrder.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Delivery Destination Address */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F8F8F2',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                }}
              >
                <span style={{ fontWeight: 600, color: '#20342C' }}>Destination Address: </span>
                <span style={{ color: '#64748B' }}>
                  {typeof selectedOrder.delivery_address === 'string'
                    ? selectedOrder.delivery_address
                    : selectedOrder.deliveryAddress
                    ? `${selectedOrder.deliveryAddress.street}, ${selectedOrder.deliveryAddress.city} - ${selectedOrder.deliveryAddress.postalCode}`
                    : shop.address}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShopDetailPage;
