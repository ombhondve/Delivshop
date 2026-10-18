import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Store,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  PhoneOff,
  Bell,
  PlusCircle,
  Clock,
  Package,
  Milk,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Calendar,
  Send,
  History,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api/endpoints';
import { useNavigation } from '../../context/NavigationContext';
import {
  ShopOrderTrackingRecord,
  ShopOrderTrackingSummary,
  OrderVolumeSummaryResponse,
  BulkReminderResponse,
  ReminderHistoryItem,
  Product,
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const ShopOrdersDispatchPage: React.FC = () => {
  const { navigate } = useNavigation();

  // Primary Data State
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Shop Tracking Data
  const [summary, setSummary] = useState<ShopOrderTrackingSummary>({
    reportingDate: selectedDate,
    totalActiveShops: 0,
    shopsOrdered: 0,
    shopsNotOrdered: 0,
  });
  const [shops, setShops] = useState<ShopOrderTrackingRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalCount: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [reminderStatusFilter, setReminderStatusFilter] = useState<string>('ALL');

  // Bulk Selection State
  const [selectedShopIds, setSelectedShopIds] = useState<Set<string>>(new Set());

  // Dispatch Consolidation Data
  const [dispatchData, setDispatchData] = useState<OrderVolumeSummaryResponse | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Modals State
  const [individualReminderShop, setIndividualReminderShop] = useState<ShopOrderTrackingRecord | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string>(
    'Hello! This is a reminder from Delivshop to place your order for the current delivery period. Please open your Delivshop app to submit your order. Contact us if you need assistance.'
  );
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);

  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState<boolean>(false);
  const [bulkSending, setBulkSending] = useState<boolean>(false);
  const [bulkResult, setBulkResult] = useState<BulkReminderResponse | null>(null);

  const [historyShop, setHistoryShop] = useState<ShopOrderTrackingRecord | null>(null);
  const [historyList, setHistoryList] = useState<ReminderHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Create Order Workflow State
  const [createOrderShop, setCreateOrderShop] = useState<ShopOrderTrackingRecord | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [orderItems, setOrderItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [orderCreationSuccess, setOrderCreationSuccess] = useState<{ orderNumber: string } | null>(null);

  // Toast / Feedback state
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // 1. Fetch Shop Order Tracking & Summary
  const fetchTrackingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.orders.getShopOrderTracking({
        date: selectedDate,
        search: search.trim() || undefined,
        orderStatus: orderStatusFilter !== 'ALL' ? orderStatusFilter : undefined,
        reminderStatus: reminderStatusFilter !== 'ALL' ? reminderStatusFilter : undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      setSummary(res.summary);
      setShops(res.shops);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('[ShopOrdersDispatchPage] Error fetching tracking data:', err);
      setError(err?.message || 'Failed to load shop orders summary.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, search, orderStatusFilter, reminderStatusFilter, pagination.page, pagination.limit]);

  // 2. Fetch Dispatch Summary Data
  const fetchDispatchSummary = useCallback(async () => {
    setDispatchLoading(true);
    try {
      const res = await api.orders.getVolumeSummary({
        date: selectedDate,
      });
      setDispatchData(res);
    } catch (err) {
      console.warn('[ShopOrdersDispatchPage] Dispatch summary fetch warning:', err);
    } finally {
      setDispatchLoading(false);
    }
  }, [selectedDate]);

  // Initial & Filter change triggers
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  useEffect(() => {
    fetchDispatchSummary();
  }, [fetchDispatchSummary]);

  // Reset selected shop checkboxes when filters or shops change
  useEffect(() => {
    setSelectedShopIds(new Set());
  }, [selectedDate, orderStatusFilter, reminderStatusFilter, search]);

  // CSV Export
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const csv = await api.orders.exportVolumeSummary({ date: selectedDate });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shop-orders-dispatch-${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotice('success', 'Manifest CSV exported successfully (crate columns excluded).');
    } catch (err: any) {
      console.error('[ShopOrdersDispatchPage] CSV export error:', err);
      showNotice('error', err?.message || 'Failed to export CSV manifest.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Selection Logic
  const eligibleShops = useMemo(() => {
    return shops.filter((s) => s.status === 'ACTIVE');
  }, [shops]);

  const allEligibleSelected = useMemo(() => {
    if (eligibleShops.length === 0) return false;
    return eligibleShops.every((s) => selectedShopIds.has(s.id));
  }, [eligibleShops, selectedShopIds]);

  const handleToggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelectedShopIds(new Set());
    } else {
      setSelectedShopIds(new Set(eligibleShops.map((s) => s.id)));
    }
  };

  const handleToggleShopSelect = (shopId: string) => {
    setSelectedShopIds((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) {
        next.delete(shopId);
      } else {
        next.add(shopId);
      }
      return next;
    });
  };

  // Individual Reminder Handler
  const handleOpenIndividualReminder = (shop: ShopOrderTrackingRecord) => {
    setIndividualReminderShop(shop);
    setReminderMessage(
      `Hello! This is a reminder from Delivshop for ${shop.name} to place your order for delivery date ${selectedDate}. Please open your Delivshop app to submit your order.`
    );
  };

  const handleSendIndividualReminder = async () => {
    if (!individualReminderShop) return;
    setSendingReminder(true);
    try {
      const res = await api.orders.sendShopReminder(individualReminderShop.id, {
        reportingDate: selectedDate,
        customMessage: reminderMessage,
        idempotencyKey: `remind_${individualReminderShop.id}_${selectedDate}_${Date.now()}`,
      });

      showNotice(
        res.status === 'NO_DEVICE_REGISTERED' ? 'info' : 'success',
        res.status === 'NO_DEVICE_REGISTERED'
          ? `Reminder queued: No mobile device registered for ${individualReminderShop.name}. Operator should follow up by call.`
          : `Reminder notification sent to ${individualReminderShop.name}.`
      );

      setIndividualReminderShop(null);
      fetchTrackingData();
    } catch (err: any) {
      console.error('[ShopOrdersDispatchPage] Send reminder error:', err);
      showNotice('error', err?.message || 'Failed to send reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  // Bulk Reminders Handler
  const handleOpenBulkReminders = () => {
    setBulkResult(null);
    setReminderMessage(
      `Hello! This is a reminder from Delivshop to place your daily dairy order for delivery on ${selectedDate}. Please open your Delivshop merchant app to complete your order.`
    );
    setIsBulkReminderOpen(true);
  };

  const handleConfirmBulkReminders = async () => {
    const ids = Array.from(selectedShopIds);
    if (ids.length === 0) return;

    setBulkSending(true);
    try {
      const res = await api.orders.sendBulkReminders({
        shopIds: ids,
        reportingDate: selectedDate,
        customMessage: reminderMessage,
      });

      setBulkResult(res);
      showNotice(
        'success',
        `Bulk reminders processed: ${res.acceptedCount} queued, ${res.noDeviceCount} without app device, ${res.failedCount} failed.`
      );
      fetchTrackingData();
    } catch (err: any) {
      console.error('[ShopOrdersDispatchPage] Bulk reminders error:', err);
      showNotice('error', err?.message || 'Failed to execute bulk reminders job.');
    } finally {
      setBulkSending(false);
    }
  };

  // Reminder History Handler
  const handleViewReminderHistory = async (shop: ShopOrderTrackingRecord) => {
    setHistoryShop(shop);
    setHistoryLoading(true);
    try {
      const history = await api.orders.getReminderHistory(shop.id);
      setHistoryList(history);
    } catch (err) {
      console.error('[ShopOrdersDispatchPage] Error fetching reminder history:', err);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Manual Order Creation Handler
  const handleOpenCreateOrder = async (shop: ShopOrderTrackingRecord) => {
    setCreateOrderShop(shop);
    setOrderItems([]);
    setSelectedProductId('');
    setSelectedQuantity(1);
    setOrderCreationSuccess(null);
    setProductsLoading(true);

    try {
      const res = await api.products.list({ limit: 100, status: 'ACTIVE' });
      const products = res?.items || [];
      setProductsList(products);
      if (products.length > 0) {
        setSelectedProductId(products[0].id);
      }
    } catch (err) {
      console.error('[ShopOrdersDispatchPage] Products list fetch error:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleAddItemToOrder = () => {
    if (!selectedProductId) return;
    const prod = productsList.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setOrderItems((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        );
      }
      return [...prev, { product: prod, quantity: selectedQuantity }];
    });
    setSelectedQuantity(1);
  };

  const handleRemoveOrderItem = (productId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const orderCalculations = useMemo(() => {
    let subtotal = 0;
    let totalPackages = 0;
    let totalVolumeLitres = 0;

    for (const item of orderItems) {
      const price = Number(item.product.price) || 0;
      subtotal += price * item.quantity;
      totalPackages += item.quantity;

      const packSize = item.product.pack_size || item.product.packSize || '';
      const isLitre = packSize.toLowerCase().includes('1l') || packSize.toLowerCase().includes('1 l');
      const is500ml = packSize.toLowerCase().includes('500ml') || packSize.toLowerCase().includes('500 ml');
      const is200ml = packSize.toLowerCase().includes('200ml') || packSize.toLowerCase().includes('200 ml');

      if (isLitre) totalVolumeLitres += 1.0 * item.quantity;
      else if (is500ml) totalVolumeLitres += 0.5 * item.quantity;
      else if (is200ml) totalVolumeLitres += 0.2 * item.quantity;
    }

    return {
      subtotal,
      total: subtotal, // Delivery fee 0 by default for merchant route
      totalPackages,
      totalVolumeLitres: Number(totalVolumeLitres.toFixed(3)),
    };
  }, [orderItems]);

  const handleSubmitManualOrder = async () => {
    if (!createOrderShop || orderItems.length === 0) return;
    setSubmittingOrder(true);
    try {
      const itemsPayload = orderItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const deliveryAddress = {
        street: createOrderShop.address || 'Shop Registered Address',
        city: createOrderShop.city || 'Nashik',
        postalCode: '422001',
      };

      const res = await api.orders.create({
        shopId: createOrderShop.id,
        items: itemsPayload,
        deliveryAddress,
        requestedDeliveryDate: selectedDate,
        idempotencyKey: `admin_order_${createOrderShop.id}_${selectedDate}_${Date.now()}`,
      });

      setOrderCreationSuccess({
        orderNumber: res.order_number || res.orderNumber || 'ORD-NEW',
      });

      showNotice('success', `Order successfully created for ${createOrderShop.name}!`);
      // Refresh shop list and dispatch consolidation
      fetchTrackingData();
      fetchDispatchSummary();
    } catch (err: any) {
      console.error('[ShopOrdersDispatchPage] Manual order creation error:', err);
      showNotice('error', err?.message || 'Failed to create order on behalf of shop.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* Toast Notification */}
      {actionNotice && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: actionNotice.type === 'success' ? '#064E3B' : actionNotice.type === 'error' ? '#991B1B' : '#1E3A8A',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : actionNotice.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, marginLeft: '8px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '18px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/admin/orders')}
            style={{ fontWeight: 600 }}
          >
            Back to Orders
          </Button>
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Shop Orders & Dispatch
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
              Track daily shop ordering, contact shops, send reminders, and prepare dispatch quantities
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '8px' }}>
            <Calendar size={15} style={{ color: '#047857' }} />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={loading || dispatchLoading ? 'spin' : ''} />}
            onClick={() => {
              fetchTrackingData();
              fetchDispatchSummary();
            }}
            disabled={loading || dispatchLoading}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCsv}
            disabled={exportingCsv || loading}
          >
            {exportingCsv ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* SECTION 1 — EXACTLY THREE PRIMARY SUMMARY CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Active Shops */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            borderLeft: '5px solid #0F172A',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>
            <span>Total Active Shops</span>
            <Store size={18} style={{ color: '#0F172A' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
            {summary.totalActiveShops}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Eligible merchant accounts in reporting scope
          </div>
        </div>

        {/* Card 2: Shops Ordered */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #A7F3D0',
            borderLeft: '5px solid #047857',
            boxShadow: '0 1px 3px rgba(4,120,87,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#064E3B', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>
            <span>Shops Ordered</span>
            <CheckCircle2 size={18} style={{ color: '#047857' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#047857', marginTop: '6px' }}>
            {summary.shopsOrdered}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 500 }}>
            {summary.totalActiveShops > 0
              ? `${Math.round((summary.shopsOrdered / summary.totalActiveShops) * 100)}% active shops ordered`
              : 'Placed qualifying orders for today'}
          </div>
        </div>

        {/* Card 3: Shops Not Ordered */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #FCD34D',
            borderLeft: '5px solid #D97706',
            boxShadow: '0 1px 3px rgba(217,119,6,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400E', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}>
            <span>Shops Not Ordered</span>
            <AlertTriangle size={18} style={{ color: '#D97706' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', marginTop: '6px' }}>
            {summary.shopsNotOrdered}
          </div>
          <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', fontWeight: 500 }}>
            {summary.shopsNotOrdered > 0
              ? 'Requires follow-up call, reminder, or manual order'
              : 'All active shops have ordered for today'}
          </div>
        </div>
      </div>

      {/* SECTION 2 — FILTERS AND ACTIONS TOOLBAR */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              minWidth: '240px',
            }}
          >
            <Search size={15} style={{ color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search shop, code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Order Status Filter */}
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            style={{
              fontSize: '13px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Order Statuses</option>
            <option value="NOT_ORDERED">Not Ordered (Pending)</option>
            <option value="ORDERED">Ordered (Confirmed)</option>
          </select>

          {/* Reminder Status Filter */}
          <select
            value={reminderStatusFilter}
            onChange={(e) => setReminderStatusFilter(e.target.value)}
            style={{
              fontSize: '13px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Reminder Statuses</option>
            <option value="SENT">Reminder Sent Today</option>
            <option value="NOT_SENT">No Reminder Sent</option>
          </select>

          {/* Clear Filters */}
          {(search || orderStatusFilter !== 'ALL' || reminderStatusFilter !== 'ALL') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setOrderStatusFilter('ALL');
                setReminderStatusFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Send Bulk Reminders Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="primary"
            icon={<Send size={15} />}
            onClick={handleOpenBulkReminders}
            disabled={selectedShopIds.size === 0}
            id="btn-send-bulk-reminders"
            style={{
              backgroundColor: selectedShopIds.size > 0 ? '#047857' : '#94A3B8',
              borderColor: selectedShopIds.size > 0 ? '#047857' : '#94A3B8',
              fontWeight: 700,
            }}
          >
            Send Bulk Reminders {selectedShopIds.size > 0 ? `(${selectedShopIds.size})` : ''}
          </Button>
        </div>
      </div>

      {/* SECTION 3 — SHOP CONTACT LIST TABLE */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          marginBottom: '36px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Eligible Shop Accounts
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#ECFDF5',
                color: '#064E3B',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {shops.length} Displayed
            </span>
          </div>

          {selectedShopIds.size > 0 && (
            <span style={{ fontSize: '12.5px', color: '#047857', fontWeight: 600 }}>
              {selectedShopIds.size} of {eligibleShops.length} shops selected
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#047857' }}>
            <RefreshCw size={26} className="spin" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Loading shop order statuses...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#991B1B' }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px', color: '#DC2626' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchTrackingData}>
              Retry
            </Button>
          </div>
        ) : shops.length === 0 ? (
          <div style={{ padding: '50px 24px', textAlign: 'center', color: '#64748B' }}>
            <Store size={36} style={{ margin: '0 auto 10px', color: '#94A3B8' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
              No Shops Found
            </h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              No active shops matched the current search or status filter.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="business-table" style={{ fontSize: '13px', margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allEligibleSelected}
                      onChange={handleToggleSelectAll}
                      title="Select all eligible shops"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Shop Details</th>
                  <th>Primary Contact</th>
                  <th style={{ minWidth: '150px' }}>Phone Number</th>
                  <th>Order Status</th>
                  <th>Reminder Status</th>
                  <th style={{ textAlign: 'right', minWidth: '220px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => {
                  const isOrdered = shop.orderStatus === 'ORDERED';
                  const isSelected = selectedShopIds.has(shop.id);
                  const phone = shop.phone || shop.deliveryContactPhone;

                  return (
                    <tr
                      key={shop.id}
                      style={{
                        backgroundColor: isSelected ? '#F0FDF4' : undefined,
                        borderLeft: isOrdered ? '4px solid #047857' : '4px solid #D97706',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleShopSelect(shop.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Shop Details */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{shop.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <code style={{ fontSize: '11px', fontWeight: 600 }}>{shop.shopId}</code>
                          <span>•</span>
                          <span>{shop.area || shop.city || 'Nashik'}</span>
                        </div>
                      </td>

                      {/* Primary Contact */}
                      <td>
                        <div style={{ fontWeight: 500, color: '#334155' }}>
                          {shop.ownerName || shop.deliveryContactName || 'Shop Operator'}
                        </div>
                        {shop.deliveryWindow && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Window: {shop.deliveryWindow}
                          </div>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td>
                        {phone ? (
                          <a
                            href={`tel:${phone.replace(/\s+/g, '')}`}
                            style={{
                              color: '#047857',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                            title="Click to dial"
                          >
                            <Phone size={13} />
                            <span>{phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>
                            No phone number
                          </span>
                        )}
                      </td>

                      {/* Order Status */}
                      <td>
                        {isOrdered ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#ECFDF5',
                                color: '#064E3B',
                                fontSize: '12px',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={13} style={{ color: '#059669' }} />
                              Ordered ({shop.orders.length})
                            </span>
                            {shop.orders.length > 0 && (
                              <div style={{ fontSize: '11px', color: '#047857', marginTop: '3px', fontWeight: 500 }}>
                                {shop.orders[0].orderNumber} • {formatCurrency(shop.orders[0].total)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FFFBEB',
                              color: '#92400E',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            <AlertTriangle size={13} style={{ color: '#D97706' }} />
                            Not Ordered
                          </span>
                        )}
                      </td>

                      {/* Reminder Status */}
                      <td>
                        {shop.lastReminder ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor:
                                  shop.lastReminder.status === 'ACCEPTED_FOR_DISPATCH' || shop.lastReminder.status === 'DELIVERED'
                                    ? '#E0F2FE'
                                    : shop.lastReminder.status === 'NO_DEVICE_REGISTERED'
                                    ? '#FEF3C7'
                                    : '#FEE2E2',
                                color:
                                  shop.lastReminder.status === 'ACCEPTED_FOR_DISPATCH' || shop.lastReminder.status === 'DELIVERED'
                                    ? '#0369A1'
                                    : shop.lastReminder.status === 'NO_DEVICE_REGISTERED'
                                    ? '#92400E'
                                    : '#991B1B',
                              }}
                            >
                              {shop.lastReminder.status === 'ACCEPTED_FOR_DISPATCH'
                                ? 'Reminder Sent'
                                : shop.lastReminder.status === 'NO_DEVICE_REGISTERED'
                                ? 'No App Device'
                                : 'Send Failed'}
                            </span>
                            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                              {new Date(shop.lastReminder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Call Button */}
                          {phone ? (
                            <a
                              href={`tel:${phone.replace(/\s+/g, '')}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                backgroundColor: '#F1F5F9',
                                color: '#1E293B',
                                fontSize: '12px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                border: '1px solid #CBD5E1',
                              }}
                              title={`Call ${phone}`}
                            >
                              <Phone size={12} style={{ color: '#047857' }} />
                              Call
                            </a>
                          ) : (
                            <button
                              disabled
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                backgroundColor: '#F1F5F9',
                                color: '#94A3B8',
                                fontSize: '12px',
                                border: '1px solid #E2E8F0',
                                cursor: 'not-allowed',
                              }}
                              title="No phone number stored for this shop"
                            >
                              <PhoneOff size={12} />
                              Call
                            </button>
                          )}

                          {/* Send Reminder Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenIndividualReminder(shop)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              backgroundColor: '#ECFDF5',
                              color: '#064E3B',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid #A7F3D0',
                              cursor: 'pointer',
                            }}
                            title="Send order reminder notification to shop"
                          >
                            <Bell size={12} style={{ color: '#047857' }} />
                            Remind
                          </button>

                          {/* Create Order Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenCreateOrder(shop)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#047857',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="Create order on behalf of this shop"
                          >
                            <PlusCircle size={12} />
                            Order
                          </button>

                          {/* Reminder History Trigger */}
                          <button
                            type="button"
                            onClick={() => handleViewReminderHistory(shop)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 7px',
                              borderRadius: '6px',
                              backgroundColor: 'transparent',
                              color: '#64748B',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="View reminder logs"
                          >
                            <History size={14} />
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
      </div>

      {/* SECTION 4 — DISPATCH PREPARATION SUMMARY (STRICTLY WITHOUT CRATES) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Dispatch Preparation Summary
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
              Consolidated packaging breakdown and liquid volume calculated across eligible shop orders
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCsv}
              disabled={exportingCsv || !dispatchData}
            >
              Export Manifest CSV
            </Button>
          </div>
        </div>

        {dispatchLoading && !dispatchData ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#047857' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Aggregating dispatch quantities...</p>
          </div>
        ) : !dispatchData || dispatchData.overview.totalEligibleOrders === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <Package size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#334155' }}>
              No Eligible Orders for Dispatch Summary
            </p>
            <p style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
              Place orders or adjust the date filter above to view consolidated packaging totals.
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {/* KPI Cards: ONLY Volume and Packages, NO CRATES */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Eligible Orders</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {dispatchData.overview.totalEligibleOrders}
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '11px', color: '#064E3B', fontWeight: 700, textTransform: 'uppercase' }}>Total Liquid Volume</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                  {dispatchData.overview.totalLiquidVolumeLitres} L
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: 700, textTransform: 'uppercase' }}>Total Packages</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>
                  {dispatchData.overview.totalPackagesRequired.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Distinct Products</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#334155', marginTop: '2px' }}>
                  {dispatchData.overview.distinctProductsCount}
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Included Shops</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#334155', marginTop: '2px' }}>
                  {dispatchData.overview.includedShopsCount}
                </div>
              </div>
            </div>

            {/* Product Packaging Table (STRICTLY 6 COLUMNS: NO CRATES) */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Product-Wise Packaging Consolidation
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="business-table" style={{ fontSize: '12.5px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Packaging Type</th>
                      <th>Package Size</th>
                      <th style={{ textAlign: 'right' }}>Total Packages</th>
                      <th style={{ textAlign: 'right' }}>Total Volume (L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchData.packagingBreakdown.map((p) => (
                      <tr key={`${p.productId}_${p.packageSize}`}>
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>{p.productName}</td>
                        <td>
                          <code style={{ fontSize: '11px', fontWeight: 600 }}>{p.sku}</code>
                        </td>
                        <td>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontWeight: 500 }}>
                            {p.packagingType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{p.packageSize}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {p.totalPackages.toLocaleString('en-IN')} pkts
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {p.isLiquid ? (p.totalVolumeLitres != null ? `${p.totalVolumeLitres} L` : '0 L') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expandable Shop-Wise Orders Breakdown */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Shop Order Breakdown
              </div>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="business-table" style={{ fontSize: '12px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th>Shop Name</th>
                      <th>Order #</th>
                      <th>Status</th>
                      <th>Delivery Route</th>
                      <th style={{ textAlign: 'right' }}>Packages</th>
                      <th style={{ textAlign: 'right' }}>Volume (L)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchData.shopWiseSummary.map((s) => {
                      const isExpanded = expandedOrders.has(s.orderId);
                      return (
                        <React.Fragment key={s.orderId}>
                          <tr
                            onClick={() => toggleOrderExpand(s.orderId)}
                            style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#F8FAFC' : undefined }}
                          >
                            <td style={{ textAlign: 'center' }}>
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td style={{ fontWeight: 600, color: '#0F172A' }}>
                              {s.shopName}
                              <span style={{ fontSize: '10.5px', color: '#64748B', marginLeft: '6px' }}>({s.shopCode})</span>
                            </td>
                            <td>
                              <code style={{ fontSize: '11px', fontWeight: 600 }}>{s.orderNumber}</code>
                            </td>
                            <td>
                              <Badge variant={s.orderStatus === 'DELIVERED' ? 'success' : 'info'} size="sm">
                                {s.orderStatus}
                              </Badge>
                            </td>
                            <td style={{ color: '#475569' }}>{s.routeName}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.totalPackages}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.totalLiquidVolumeLitres} L</td>
                          </tr>

                          {/* Expanded Items */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} style={{ backgroundColor: '#F8FAFC', padding: '10px 18px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                  Order Line Items:
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                  {s.items.map((item) => (
                                    <div
                                      key={item.itemId}
                                      style={{
                                        backgroundColor: '#FFFFFF',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '11px',
                                      }}
                                    >
                                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.productName}</div>
                                      <div style={{ color: '#64748B' }}>
                                        {item.quantity} pkts • {item.packageSize}
                                        {item.isLiquid && item.volumeLitres ? ` (${item.volumeLitres} L)` : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1 — INDIVIDUAL REMINDER COMPOSITION */}
      {individualReminderShop && (
        <div className="modal-backdrop" onClick={() => !sendingReminder && setIndividualReminderShop(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '90%', borderRadius: '12px', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#064E3B', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} style={{ color: '#6EE7B7' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Send Order Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => setIndividualReminderShop(null)}
                disabled={sendingReminder}
                style={{ background: 'transparent', border: 'none', color: '#D1FAE5', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px', padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{individualReminderShop.name}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Shop Code: {individualReminderShop.shopId} • Phone: {individualReminderShop.phone || 'No phone'}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reminder Message:
                </label>
                <textarea
                  rows={4}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '20px' }}>
                <Info size={14} style={{ color: '#047857' }} />
                <span>Notification will be dispatched to the shop owner's registered app device.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="secondary" size="sm" onClick={() => setIndividualReminderShop(null)} disabled={sendingReminder}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={handleSendIndividualReminder}
                  disabled={sendingReminder || !reminderMessage.trim()}
                  style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700 }}
                >
                  {sendingReminder ? 'Sending...' : 'Send Reminder'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2 — BULK REMINDERS CONFIRMATION */}
      {isBulkReminderOpen && (
        <div className="modal-backdrop" onClick={() => !bulkSending && setIsBulkReminderOpen(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', width: '90%', borderRadius: '12px', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#064E3B', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} style={{ color: '#6EE7B7' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Confirm Bulk Reminders</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkReminderOpen(false)}
                disabled={bulkSending}
                style={{ background: 'transparent', border: 'none', color: '#D1FAE5', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {bulkResult ? (
                <div>
                  <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                    <CheckCircle2 size={36} style={{ color: '#059669', margin: '0 auto 8px' }} />
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#064E3B' }}>
                      Bulk Reminders Completed
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                      Processed batch for {bulkResult.totalRequested} selected shops
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ padding: '10px', backgroundColor: '#ECFDF5', borderRadius: '8px', textAlign: 'center', border: '1px solid #A7F3D0' }}>
                      <div style={{ fontSize: '11px', color: '#064E3B', fontWeight: 700 }}>QUEUED / ACCEPTED</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857' }}>{bulkResult.acceptedCount}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#FFFBEB', borderRadius: '8px', textAlign: 'center', border: '1px solid #FCD34D' }}>
                      <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 700 }}>NO APP DEVICE</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706' }}>{bulkResult.noDeviceCount}</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#FEF2F2', borderRadius: '8px', textAlign: 'center', border: '1px solid #FECACA' }}>
                      <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700 }}>FAILED</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626' }}>{bulkResult.failedCount}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" size="sm" onClick={() => setIsBulkReminderOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: '#92400E' }}>
                      <strong>Send order reminders to {selectedShopIds.size} selected shops?</strong>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        Each recipient will receive a push notification for delivery date {selectedDate}.
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Reminder Message:
                    </label>
                    <textarea
                      rows={4}
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setIsBulkReminderOpen(false)} disabled={bulkSending}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Send size={14} />}
                      onClick={handleConfirmBulkReminders}
                      disabled={bulkSending}
                      style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700 }}
                    >
                      {bulkSending ? 'Processing...' : `Confirm & Send (${selectedShopIds.size})`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3 — REMINDER HISTORY */}
      {historyShop && (
        <div className="modal-backdrop" onClick={() => setHistoryShop(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '90%', borderRadius: '12px', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  Reminder History — {historyShop.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Shop Code: {historyShop.shopId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryShop(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '420px', overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: '#047857' }}>
                  <RefreshCw size={22} className="spin" style={{ margin: '0 auto 6px' }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>Loading reminder history...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                  <History size={28} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>No reminders have been recorded for this shop.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              item.status === 'ACCEPTED_FOR_DISPATCH' || item.status === 'DELIVERED'
                                ? '#E0F2FE'
                                : item.status === 'NO_DEVICE_REGISTERED'
                                ? '#FEF3C7'
                                : '#FEE2E2',
                            color:
                              item.status === 'ACCEPTED_FOR_DISPATCH' || item.status === 'DELIVERED'
                                ? '#0369A1'
                                : item.status === 'NO_DEVICE_REGISTERED'
                                ? '#92400E'
                                : '#991B1B',
                          }}
                        >
                          {item.status}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#334155', margin: '4px 0' }}>{item.message}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Initiated by: <strong>{item.sentByName}</strong> • Channel: {item.channel}
                      </div>
                      {item.errorReason && (
                        <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px' }}>
                          Notice: {item.errorReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
              <Button variant="secondary" size="sm" onClick={() => setHistoryShop(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4 — MANUAL ORDER CREATION WORKFLOW */}
      {createOrderShop && (
        <div className="modal-backdrop" onClick={() => !submittingOrder && setCreateOrderShop(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', width: '92%', borderRadius: '12px', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', backgroundColor: '#064E3B', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} style={{ color: '#6EE7B7' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Create Order on Behalf of Shop</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOrderShop(null)}
                disabled={submittingOrder}
                style={{ background: 'transparent', border: 'none', color: '#D1FAE5', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', maxHeight: '560px', overflowY: 'auto' }}>
              {orderCreationSuccess ? (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <CheckCircle2 size={44} style={{ color: '#059669', margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#064E3B' }}>
                    Order Placed Successfully!
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748B' }}>
                    Assigned Order Number: <strong>{orderCreationSuccess.orderNumber}</strong> for {createOrderShop.name}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setCreateOrderShop(null);
                      setOrderCreationSuccess(null);
                    }}
                    style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700 }}
                  >
                    Done & Refresh Status
                  </Button>
                </div>
              ) : (
                <>
                  {/* Shop Details Header */}
                  <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{createOrderShop.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          Code: {createOrderShop.shopId} • Phone: {createOrderShop.phone || 'No phone'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Credit Limit:</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#047857' }}>
                          {formatCurrency(createOrderShop.creditLimit)}
                        </div>
                      </div>
                    </div>

                    {createOrderShop.orderStatus === 'ORDERED' && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#ECFDF5', borderRadius: '6px', fontSize: '12px', color: '#064E3B' }}>
                        Notice: This shop already has {createOrderShop.orders.length} order(s) for today ({selectedDate}). Submitting will add an additional order.
                      </div>
                    )}
                  </div>

                  {/* Add Product Line Section */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Select Product from Dairy Catalogue:
                    </label>
                    {productsLoading ? (
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Loading catalogue products...</div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          {productsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — {formatCurrency(p.price)} [{p.pack_size || p.packSize || 'Standard'}]
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          style={{
                            width: '70px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            textAlign: 'center',
                          }}
                        />

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddItemToOrder}
                          disabled={!selectedProductId}
                          style={{ fontWeight: 600 }}
                        >
                          Add Item
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Selected Items Table */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      Order Items ({orderItems.length})
                    </div>
                    {orderItems.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                        No items added yet. Select a product above to add to this order.
                      </div>
                    ) : (
                      <table className="business-table" style={{ fontSize: '12.5px', margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Unit Price</th>
                            <th style={{ textAlign: 'center' }}>Quantity</th>
                            <th style={{ textAlign: 'right' }}>Line Total</th>
                            <th style={{ width: '30px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item) => (
                            <tr key={item.product.id}>
                              <td style={{ fontWeight: 600 }}>{item.product.name}</td>
                              <td>{formatCurrency(item.product.price)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity} pkts</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                {formatCurrency(item.product.price * item.quantity)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrderItem(item.product.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 0 }}
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Order Totals Summary */}
                  {orderItems.length > 0 && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #A7F3D0', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#064E3B' }}>
                        <span>Total Units / Packages:</span>
                        <strong>{orderCalculations.totalPackages} pkts</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#064E3B', marginTop: '2px' }}>
                        <span>Estimated Liquid Volume:</span>
                        <strong>{orderCalculations.totalVolumeLitres} L</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#064E3B', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #A7F3D0' }}>
                        <span>Order Total:</span>
                        <span>{formatCurrency(orderCalculations.total)}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setCreateOrderShop(null)} disabled={submittingOrder}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Check size={14} />}
                      onClick={handleSubmitManualOrder}
                      disabled={submittingOrder || orderItems.length === 0}
                      style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700 }}
                    >
                      {submittingOrder ? 'Submitting Order...' : 'Submit Order'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
