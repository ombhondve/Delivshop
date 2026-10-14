import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  ExternalLink,
  Shield,
  Key,
  Truck,
  CreditCard,
  ShoppingBag,
  Power,
  Edit2,
  Check,
  Copy,
  Clock,
  AlertTriangle,
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
import { AssignDriverModal } from './AssignDriverModal';
import { EditShopModal } from './EditShopModal';

interface ShopDetailModalProps {
  shopId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged: () => void;
}

export const ShopDetailModal: React.FC<ShopDetailModalProps> = ({
  shopId,
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'invoices' | 'deliveries' | 'security'>('overview');
  const [shop, setShop] = useState<Shop | null>(null);
  const [accountStatus, setAccountStatus] = useState<ShopAccountStatus | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-modals
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [selectedOrderForDriver, setSelectedOrderForDriver] = useState<Order | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Credentials reissue state
  const [isReissuing, setIsReissuing] = useState(false);
  const [reissuedPassword, setReissuedPassword] = useState<string | null>(null);
  const [copiedReissued, setCopiedReissued] = useState(false);

  // Deactivation confirmation
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);

  const fetchShopData = async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.shops.get(shopId);
      setShop(data.shop);
      setAccountStatus(data.accountStatus);

      // Concurrently fetch business records
      const [ordList, invList, payList, delList] = await Promise.allSettled([
        api.shops.getOrders(shopId),
        api.shops.getInvoices(shopId),
        api.shops.getPayments(shopId),
        api.shops.getDeliveries(shopId),
      ]);

      if (ordList.status === 'fulfilled') setOrders(ordList.value);
      if (invList.status === 'fulfilled') setInvoices(invList.value);
      if (payList.status === 'fulfilled') setPayments(payList.value);
      if (delList.status === 'fulfilled') setDeliveries(delList.value);
    } catch (err: any) {
      setError(err.message || 'Failed to load shop details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && shopId) {
      setActiveTab('overview');
      setReissuedPassword(null);
      setIsConfirmingDeactivate(false);
      fetchShopData();
    }
  }, [isOpen, shopId]);

  if (!isOpen || !shopId) return null;

  const handleToggleStatus = async () => {
    if (!shop) return;
    const newStatus = shop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.shops.updateStatus(shop.id, newStatus);
      setIsConfirmingDeactivate(false);
      fetchShopData();
      onStatusChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to update shop status');
    }
  };

  const handleReissueCredentials = async () => {
    if (!shop) return;
    setIsReissuing(true);
    try {
      const res = await api.shops.reissueCredentials(shop.id);
      setReissuedPassword(res.temporaryPassword);
      fetchShopData();
    } catch (err: any) {
      alert(err.message || 'Failed to reissue credentials');
    } finally {
      setIsReissuing(false);
    }
  };

  const handleCopyReissued = () => {
    if (reissuedPassword) {
      navigator.clipboard.writeText(reissuedPassword);
      setCopiedReissued(true);
      setTimeout(() => setCopiedReissued(false), 2500);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Top Summary Banner */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {shop?.name || 'Shop Details'}
              </h3>
              <span className={`badge ${shop?.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                {shop?.status || 'ACTIVE'}
              </span>
              <span className={`badge ${shop?.is_location_verified ? 'badge-info' : 'badge-default'}`}>
                {shop?.is_location_verified ? 'GPS Verified' : 'Location Unverified'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Shop ID: <code style={{ color: '#60A5FA', fontWeight: 600 }}>{shop?.shop_id}</code></span>
              <span>• Type: {shop?.shop_type}</span>
              <span>• Owner: {shop?.owner_name} ({shop?.phone})</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsEditOpen(true)}
              className="btn btn-outline btn-sm"
              style={{ gap: '6px' }}
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              onClick={() => {
                if (shop?.status === 'ACTIVE') {
                  setIsConfirmingDeactivate(true);
                } else {
                  handleToggleStatus();
                }
              }}
              className={`btn btn-sm ${shop?.status === 'ACTIVE' ? 'btn-outline' : 'btn-primary'}`}
              style={{ gap: '6px' }}
            >
              <Power size={14} />
              {shop?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '6px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Deactivation Confirmation Warning */}
        {isConfirmingDeactivate && (
          <div
            style={{
              padding: '14px 24px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', fontSize: '13px' }}>
              <AlertTriangle size={18} />
              <span>
                <strong>Confirm Deactivation:</strong> This will suspend store login access and revoke active sessions.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsConfirmingDeactivate(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="btn btn-sm"
                style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
              >
                Confirm Deactivate
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            padding: '0 24px',
          }}
        >
          {[
            { key: 'overview', label: 'Overview & Location', icon: <MapPin size={15} /> },
            { key: 'orders', label: `Orders (${orders.length})`, icon: <ShoppingBag size={15} /> },
            { key: 'invoices', label: `Invoices & Payments (${invoices.length})`, icon: <CreditCard size={15} /> },
            { key: 'deliveries', label: `Deliveries (${deliveries.length})`, icon: <Truck size={15} /> },
            { key: 'security', label: 'Login & Security', icon: <Shield size={15} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading shop details from backend...
            </div>
          ) : error ? (
            <div className="alert-error">{error}</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & LOCATION */}
              {activeTab === 'overview' && shop && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Financial Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payment Terms</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                        {shop.payment_terms}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Credit Limit</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#38BDF8', marginTop: '4px' }}>
                        ₹{Number(shop.credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Outstanding Balance</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: Number(shop.outstanding_balance) > 0 ? '#F87171' : '#34D399', marginTop: '4px' }}>
                        ₹{Number(shop.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Address & GPS Location Card */}
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Delivery Address & Saved GPS Location
                      </h4>
                      {shop.latitude && shop.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${shop.latitude},${shop.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ gap: '6px', fontSize: '12px' }}
                        >
                          <ExternalLink size={13} /> Open Google Maps
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      <div>
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {shop.address}<br />
                          {shop.area}{shop.landmark ? `, Near ${shop.landmark}` : ''}<br />
                          {shop.city}, {shop.state} - {shop.pincode}
                        </p>
                        <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <strong>GSTIN:</strong> {shop.gstin || 'Not registered'}
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Verified Destination Coordinates
                        </div>
                        {shop.latitude && shop.longitude ? (
                          <>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#60A5FA', fontFamily: 'monospace' }}>
                              {Number(shop.latitude).toFixed(6)}, {Number(shop.longitude).toFixed(6)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#34D399', marginTop: '4px' }}>
                              ✓ GPS Destination configured for driver mobile navigation
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '13px', color: '#FBBF24' }}>
                            Coordinates not yet captured. Edit shop to pin delivery location.
                          </div>
                        )}
                        {shop.delivery_window && (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <strong>Preferred Window:</strong> {shop.delivery_window}
                          </div>
                        )}
                        {shop.delivery_instructions && (
                          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <strong>Instructions:</strong> {shop.delivery_instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ORDERS HISTORY & DRIVER ASSIGNMENT */}
              {activeTab === 'orders' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Orders from {shop?.name}</h4>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Assign available drivers through the delivery workflow
                    </span>
                  </div>

                  {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                      No orders recorded for this shop yet.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Created At</th>
                          <th>Total Amount</th>
                          <th>Assigned Driver</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((ord) => (
                          <tr key={ord.id}>
                            <td><code>{ord.order_number || ord.orderNumber || ord.id.slice(0, 8)}</code></td>
                            <td>{ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Today'}</td>
                            <td className="font-semibold">₹{Number(ord.total || 0).toFixed(2)}</td>
                            <td>{ord.driver_name || ord.driverName || 'Unassigned'}</td>
                            <td>
                              <span className="badge badge-info">{ord.status}</span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForDriver(ord);
                                  setIsAssignDriverOpen(true);
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ gap: '4px' }}
                              >
                                <Truck size={13} /> Assign Driver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: INVOICES & PAYMENTS */}
              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Invoices</h4>
                    {invoices.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                        No invoices issued yet.
                      </div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td><code>{inv.invoice_number}</code></td>
                              <td className="font-semibold">₹{Number(inv.amount).toFixed(2)}</td>
                              <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${inv.status === 'PAID' ? 'badge-success' : inv.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Payment Receipts</h4>
                    {payments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                        No payments recorded yet.
                      </div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Receipt #</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Transaction Ref</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id}>
                              <td><code>{p.payment_number}</code></td>
                              <td className="font-semibold">₹{Number(p.amount).toFixed(2)}</td>
                              <td>{p.payment_method}</td>
                              <td>{p.transaction_ref || 'N/A'}</td>
                              <td><span className="badge badge-success">{p.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DELIVERIES */}
              {activeTab === 'deliveries' && (
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Delivery History</h4>
                  {deliveries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                      No delivery runs dispatched yet.
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Driver</th>
                          <th>Driver Phone</th>
                          <th>Status</th>
                          <th>Dispatched At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((del) => (
                          <tr key={del.id}>
                            <td><code>{del.order_number || del.orderId}</code></td>
                            <td>{del.driver_name || 'Driver'}</td>
                            <td>{del.notes || '—'}</td>
                            <td><span className="badge badge-info">{del.status}</span></td>
                            <td>{del.created_at ? new Date(del.created_at).toLocaleString() : 'Recent'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 5: LOGIN & SECURITY */}
              {activeTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
                      Account Provisioning & Security Credentials
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official Shop ID</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#60A5FA', fontFamily: 'monospace', marginTop: '2px' }}>
                          {accountStatus?.shopId || shop?.shop_id}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>First-Login Password Status</div>
                        <div style={{ marginTop: '4px' }}>
                          <span className={`badge ${accountStatus?.mustChangePassword ? 'badge-warning' : 'badge-success'}`}>
                            {accountStatus?.mustChangePassword ? 'Mandatory Setup Pending' : 'Password Initialized'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account Lockout Status</div>
                        <div style={{ marginTop: '4px' }}>
                          <span className={`badge ${accountStatus?.isLocked ? 'badge-danger' : 'badge-default'}`}>
                            {accountStatus?.isLocked ? 'Locked (Brute Force Protection)' : 'Normal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          Reissue Temporary Password
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Generates a new Argon2id temporary password and forces mandatory reset on next mobile login.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleReissueCredentials}
                        disabled={isReissuing}
                        className="btn btn-outline btn-sm"
                        style={{ gap: '6px' }}
                      >
                        <Key size={14} />
                        {isReissuing ? 'Generating...' : 'Reissue Access'}
                      </button>
                    </div>

                    {/* Reissued Password Single-Reveal Card */}
                    {reissuedPassword && (
                      <div
                        style={{
                          marginTop: '16px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid #EF4444',
                          padding: '16px',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ color: '#F87171', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                          New Temporary Password Provisioned
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <code style={{ fontSize: '16px', padding: '6px 12px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                            {reissuedPassword}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyReissued}
                            className="btn btn-primary btn-sm"
                            style={{ gap: '6px' }}
                          >
                            {copiedReissued ? <Check size={14} /> : <Copy size={14} />}
                            {copiedReissued ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          This temporary password will not be retrievable again. Share it securely with the shop owner.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      <AssignDriverModal
        order={selectedOrderForDriver}
        isOpen={isAssignDriverOpen}
        onClose={() => {
          setIsAssignDriverOpen(false);
          setSelectedOrderForDriver(null);
        }}
        onAssigned={fetchShopData}
      />

      <EditShopModal
        shop={shop}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdated={fetchShopData}
      />
    </div>
  );
};
