import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList,
  Search,
  ListFilter,
  Eye,
  FileCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Milk,
  Boxes,
  RefreshCw,
  AlertTriangle,
  Package,
  Bell,
  Check,
  XCircle,
  ArrowRight,
  Calendar,
  Clock,
  History,
  Send,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { OrderVolumeSummaryModal } from './OrderVolumeSummaryModal';
import { ScheduleOrderModal } from './ScheduleOrderModal';
import { SchedulingHistoryModal } from './SchedulingHistoryModal';
import { RescheduleOrderModal } from './RescheduleOrderModal';
import { api } from '../../services/api/endpoints';
import { OrderDispatchRecord, UnscheduledOrderRecord } from '../../types';

interface DisplayOrderItem {
  sku: string;
  name: string;
  category: string;
  packSize: string;
  packageSize: string;
  packagingType: string;
  isLiquid: boolean;
  orderedPackages: number;
  orderedCrates: number | null;
  deliveredCrates: number | null;
  deliveredPackages: number;
  volumeLitres: number | null;
  weightKg: number | null;
  unitPrice: number;
  total: number;
  isCrateCapacityKnown: boolean;
}

interface DisplayOrderRecord {
  id: string;
  orderNumber: string;
  shopId: string;
  shopName: string;
  route: string;
  driver: string;
  status: 'PENDING_CONFIRMATION' | 'DISPATCH_PREPARED' | 'IN_TRANSIT' | 'DELIVERED' | 'DISPUTED' | 'CANCELLED' | string;
  totalAmount: number;
  paidAmount: number;
  totalVolumeLitres: number;
  cratesCount: number;
  packagesCount: number;
  hasUnknownCrates: boolean;
  createdAt: string;
  deliveredAt?: string;
  requestedDeliveryDate?: string | null;
  confirmedDeliveryDate?: string | null;
  deliveryWindow?: string | null;
  schedulingStatus?: string;
  deliveryRunId?: string | null;
  vehicleRegistration?: string | null;
  items: DisplayOrderItem[];
  notes?: string;
  itemsSummaryText?: string;
  isNew?: boolean;
}

// Fallback data preserving standard dispatch orders if backend is loading or unavailable
const FALLBACK_DISPATCH_ORDERS: DisplayOrderRecord[] = [
  {
    id: 'ord_101',
    orderNumber: 'DS-26-8891',
    shopId: 'SH-8821',
    shopName: 'Krishna Dairy & Provisions',
    route: 'Route A (Shivajinagar)',
    driver: 'Ramesh Powar',
    status: 'DELIVERED',
    totalAmount: 14850,
    paidAmount: 14850,
    totalVolumeLitres: 216,
    cratesCount: 20,
    packagesCount: 336,
    hasUnknownCrates: false,
    createdAt: '2026-10-14T03:15:00Z',
    deliveredAt: '2026-10-14T06:45:00Z',
    itemsSummaryText: '18 milk crates (312 pkts) • 2 curd crates',
    items: [
      { sku: 'MILK-COW-1L', name: 'Fresh Whole Cow Milk (1L Pouch)', category: 'Milk', packSize: '1L Pouch', packageSize: '1 L', packagingType: 'Pouch', isLiquid: true, orderedPackages: 120, orderedCrates: 10, deliveredCrates: 10, deliveredPackages: 120, volumeLitres: 120, weightKg: null, unitPrice: 68, total: 8160, isCrateCapacityKnown: true },
      { sku: 'MILK-TONED-500', name: 'Standardized Toned Milk (500ml)', category: 'Milk', packSize: '500ml Pouch', packageSize: '500 ml', packagingType: 'Pouch', isLiquid: true, orderedPackages: 192, orderedCrates: 8, deliveredCrates: 8, deliveredPackages: 192, volumeLitres: 96, weightKg: null, unitPrice: 28, total: 5376, isCrateCapacityKnown: true },
      { sku: 'CURD-500G', name: 'Traditional Set Curd / Dahi (500g)', category: 'Curd', packSize: '500g Cup', packageSize: '500 g', packagingType: 'Cup', isLiquid: false, orderedPackages: 24, orderedCrates: 2, deliveredCrates: 2, deliveredPackages: 24, volumeLitres: null, weightKg: 12, unitPrice: 60, total: 1440, isCrateCapacityKnown: true },
    ],
    notes: 'Delivered and verified by shop pin signature.',
  },
  {
    id: 'ord_102',
    orderNumber: 'DS-26-8892',
    shopId: 'SH-7740',
    shopName: 'Anand Supermarket & Milk Depot',
    route: 'Route B (Kothrud)',
    driver: 'Sunil Shinde',
    status: 'IN_TRANSIT',
    totalAmount: 22400,
    paidAmount: 15000,
    totalVolumeLitres: 312,
    cratesCount: 26,
    packagesCount: 432,
    hasUnknownCrates: false,
    createdAt: '2026-10-14T03:20:00Z',
    itemsSummaryText: '26 milk crates (432 pkts)',
    items: [
      { sku: 'MILK-COW-1L', name: 'Fresh Whole Cow Milk (1L Pouch)', category: 'Milk', packSize: '1L Pouch', packageSize: '1 L', packagingType: 'Pouch', isLiquid: true, orderedPackages: 192, orderedCrates: 16, deliveredCrates: 16, deliveredPackages: 192, volumeLitres: 192, weightKg: null, unitPrice: 68, total: 13056, isCrateCapacityKnown: true },
      { sku: 'MILK-TONED-500', name: 'Standardized Toned Milk (500ml)', category: 'Milk', packSize: '500ml Pouch', packageSize: '500 ml', packagingType: 'Pouch', isLiquid: true, orderedPackages: 240, orderedCrates: 10, deliveredCrates: 10, deliveredPackages: 240, volumeLitres: 120, weightKg: null, unitPrice: 26, total: 6240, isCrateCapacityKnown: true },
    ],
    notes: 'Driver approaching Kothrud depot. ETA 15 mins.',
  },
  {
    id: 'ord_103',
    orderNumber: 'DS-26-8893',
    shopId: 'SH-9104',
    shopName: 'Shree Ganesh Dairy Farm',
    route: 'Route C (Hadapsar)',
    driver: 'Amit Patil',
    status: 'DELIVERED',
    totalAmount: 8600,
    paidAmount: 8600,
    totalVolumeLitres: 96,
    cratesCount: 10,
    packagesCount: 136,
    hasUnknownCrates: false,
    createdAt: '2026-10-14T03:00:00Z',
    deliveredAt: '2026-10-14T06:10:00Z',
    itemsSummaryText: '8 buffalo milk crates (96 pkts) • 2 paneer crates',
    items: [
      { sku: 'MILK-BUF-1L', name: 'Premium Buffalo Milk (1L Pouch)', category: 'Milk', packSize: '1L Pouch', packageSize: '1 L', packagingType: 'Pouch', isLiquid: true, orderedPackages: 96, orderedCrates: 8, deliveredCrates: 8, deliveredPackages: 96, volumeLitres: 96, weightKg: null, unitPrice: 74, total: 7104, isCrateCapacityKnown: true },
      { sku: 'PANEER-200G', name: 'Fresh Malai Paneer (200g Pack)', category: 'Paneer', packSize: '200g Pack', packageSize: '200 g', packagingType: 'Pack', isLiquid: false, orderedPackages: 40, orderedCrates: 2, deliveredCrates: 2, deliveredPackages: 40, volumeLitres: null, weightKg: 8, unitPrice: 92, total: 3680, isCrateCapacityKnown: true },
    ],
    notes: 'Delivered early morning drop.',
  },
  {
    id: 'ord_104',
    orderNumber: 'DS-26-8894',
    shopId: 'SH-5512',
    shopName: 'Mahesh Retail Store',
    route: 'Route D (Pimpri)',
    driver: 'Ganesh Deshmukh',
    status: 'DISPUTED',
    totalAmount: 19200,
    paidAmount: 0,
    totalVolumeLitres: 264,
    cratesCount: 22,
    packagesCount: 360,
    hasUnknownCrates: false,
    createdAt: '2026-10-14T03:30:00Z',
    itemsSummaryText: '22 milk crates (360 pkts)',
    items: [
      { sku: 'MILK-COW-1L', name: 'Fresh Whole Cow Milk (1L Pouch)', category: 'Milk', packSize: '1L Pouch', packageSize: '1 L', packagingType: 'Pouch', isLiquid: true, orderedPackages: 168, orderedCrates: 14, deliveredCrates: 12, deliveredPackages: 144, volumeLitres: 168, weightKg: null, unitPrice: 68, total: 9792, isCrateCapacityKnown: true },
      { sku: 'MILK-TONED-500', name: 'Standardized Toned Milk (500ml)', category: 'Milk', packSize: '500ml Pouch', packageSize: '500 ml', packagingType: 'Pouch', isLiquid: true, orderedPackages: 192, orderedCrates: 8, deliveredCrates: 8, deliveredPackages: 192, volumeLitres: 96, weightKg: null, unitPrice: 28, total: 5376, isCrateCapacityKnown: true },
    ],
    notes: 'Shop reported 2 crates leaking on arrival. Awaiting supervisor inspection.',
  },
  {
    id: 'ord_105',
    orderNumber: 'DS-26-8895',
    shopId: 'SH-6320',
    shopName: 'Om Sai Dairy Corner',
    route: 'Route A (Shivajinagar)',
    driver: 'Ramesh Powar',
    status: 'DISPATCH_PREPARED',
    totalAmount: 6750,
    paidAmount: 6750,
    totalVolumeLitres: 108,
    cratesCount: 9,
    packagesCount: 216,
    hasUnknownCrates: false,
    createdAt: '2026-10-14T04:00:00Z',
    itemsSummaryText: '9 milk crates (216 pkts)',
    items: [
      { sku: 'MILK-TONED-500', name: 'Standardized Toned Milk (500ml)', category: 'Milk', packSize: '500ml Pouch', packageSize: '500 ml', packagingType: 'Pouch', isLiquid: true, orderedPackages: 216, orderedCrates: 9, deliveredCrates: 0, deliveredPackages: 0, volumeLitres: 108, weightKg: null, unitPrice: 26, total: 5616, isCrateCapacityKnown: true },
    ],
    notes: 'Loaded in cold storage bay #3. Scheduled for next dispatch wave.',
  },
];

export const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<DisplayOrderRecord[]>(FALLBACK_DISPATCH_ORDERS);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<DisplayOrderRecord | null>(null);
  const [isVolumeSummaryOpen, setIsVolumeSummaryOpen] = useState<boolean>(false);
  const [newOrderNotice, setNewOrderNotice] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Route Scheduling & Unscheduled Queue State
  const [activeSection, setActiveSection] = useState<'ALL_ORDERS' | 'UNSCHEDULED_QUEUE'>('ALL_ORDERS');
  const [unscheduledOrders, setUnscheduledOrders] = useState<UnscheduledOrderRecord[]>([]);
  const [unscheduledCount, setUnscheduledCount] = useState<number>(0);
  const [loadingUnscheduled, setLoadingUnscheduled] = useState<boolean>(false);
  const [orderToSchedule, setOrderToSchedule] = useState<UnscheduledOrderRecord | null>(null);
  const [orderToReschedule, setOrderToReschedule] = useState<{ id: string; orderNumber: string; currentDate?: string | null } | null>(null);
  const [historyOrder, setHistoryOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  // Track known order IDs to detect newly arrived shop orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set(FALLBACK_DISPATCH_ORDERS.map((o) => o.id)));

  const fetchUnscheduledOrders = useCallback(async () => {
    setLoadingUnscheduled(true);
    try {
      const res = await api.orders.listUnscheduled();
      setUnscheduledOrders(res?.orders || []);
      setUnscheduledCount(res?.count || 0);
    } catch (e) {
      console.warn('[OrdersList] Failed to fetch unscheduled orders queue:', e);
    } finally {
      setLoadingUnscheduled(false);
    }
  }, []);

  const fetchOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    try {
      let apiStatus = statusFilter || undefined;
      if (statusFilter === 'PENDING_CONFIRMATION') apiStatus = 'PENDING';
      else if (statusFilter === 'DISPATCH_PREPARED') apiStatus = 'PREPARING';

      const res = await api.orders.list({
        status: apiStatus,
        search: search || undefined,
        limit: 100,
      });

      if (res && Array.isArray(res.orders) && res.orders.length > 0) {
        let newlyFound = 0;

        const mappedOrders: DisplayOrderRecord[] = res.orders.map((o: OrderDispatchRecord) => {
          const isNewlyArrived = !knownOrderIdsRef.current.has(o.id);
          if (isNewlyArrived) newlyFound++;

          let liquidVol = 0;
          let milkCrates = 0;
          let solidCrates = 0;
          let totalPkts = 0;
          let hasUnknown = false;

          const items: DisplayOrderItem[] = (o.items || []).map((it) => {
            const isLiquid = Boolean(
              it.baseUnit?.toLowerCase() === 'litre' ||
              it.baseUnit?.toLowerCase() === 'ml' ||
              ['milk', 'buttermilk', 'chaas', 'lassi'].includes(it.category?.toLowerCase() || '')
            );

            const qty = Number(it.quantity) || 0;
            totalPkts += qty;

            const itemVol = isLiquid
              ? (it.volumeLitres != null && Number(it.volumeLitres) > 0 ? Number(it.volumeLitres) : (it.calculatedVolumeLitres || 0))
              : null;

            if (isLiquid && itemVol != null) {
              liquidVol += itemVol;
            }

            const itemWeightKg = !isLiquid ? (it.calculatedWeightKg || 0) : null;
            const crates = it.cratesCount != null && Number(it.cratesCount) > 0
              ? Number(it.cratesCount)
              : (it.calculatedCrates != null ? it.calculatedCrates : null);

            if (crates != null) {
              if (isLiquid) {
                milkCrates += crates;
              } else {
                solidCrates += crates;
              }
            } else {
              hasUnknown = true;
            }

            return {
              sku: it.sku || 'SKU-NA',
              name: it.name || 'Dairy Product',
              category: it.category || 'Dairy',
              packSize: it.packSize || it.packageSize || '1 unit',
              packageSize: it.packageSize || it.packSize || '1 unit',
              packagingType: it.packagingType || 'Pouch',
              isLiquid,
              orderedPackages: qty,
              orderedCrates: crates,
              deliveredCrates: it.deliveredQuantity != null && it.unitsPerPack ? Number((it.deliveredQuantity / it.unitsPerPack).toFixed(1)) : crates,
              deliveredPackages: it.deliveredQuantity || qty,
              volumeLitres: itemVol,
              weightKg: itemWeightKg,
              unitPrice: Number(it.unitPrice) || 0,
              total: Number(it.totalPrice) || 0,
              isCrateCapacityKnown: it.isCrateCapacityKnown !== false,
            };
          });

          const totalVol = o.total_volume_litres != null && Number(o.total_volume_litres) > 0
            ? Number(o.total_volume_litres)
            : liquidVol;

          let itemsSummary = '';
          if (milkCrates > 0) {
            itemsSummary += `${milkCrates} milk crates`;
          }
          if (solidCrates > 0) {
            itemsSummary += `${itemsSummary ? ' • ' : ''}${solidCrates} solid crates`;
          }
          if (totalPkts > 0) {
            itemsSummary += ` (${totalPkts} pkts)`;
          }

          let mappedStatus = o.status;
          if (o.status === 'DELIVERED') mappedStatus = 'DELIVERED';
          else if (o.status === 'IN_TRANSIT') mappedStatus = 'IN_TRANSIT';
          else if (o.status === 'PREPARING') mappedStatus = 'DISPATCH_PREPARED';
          else if (o.status === 'CONFIRMED' && o.delivery_status === 'FAILED') mappedStatus = 'DISPUTED';
          else if (o.status === 'CONFIRMED') mappedStatus = 'CONFIRMED';
          else if (o.status === 'PENDING') mappedStatus = 'PENDING_CONFIRMATION';
          else if (o.status === 'CANCELLED') mappedStatus = 'CANCELLED';

          return {
            id: o.id,
            orderNumber: o.order_number,
            shopId: o.shop_code || 'SH-NA',
            shopName: o.shop_name,
            route: o.route_name || 'City Route',
            driver: o.driver_name || 'Unassigned',
            status: mappedStatus,
            totalAmount: Number(o.total) || 0,
            paidAmount: Number(o.total) || 0,
            totalVolumeLitres: totalVol,
            cratesCount: Number(o.total_crates_count) || (milkCrates + solidCrates),
            packagesCount: Number(o.total_packages_count) || totalPkts,
            hasUnknownCrates: hasUnknown || Boolean(o.has_unknown_crates),
            createdAt: o.created_at,
            deliveredAt: o.delivered_at,
            requestedDeliveryDate: o.requested_delivery_date,
            confirmedDeliveryDate: o.confirmed_delivery_date,
            deliveryWindow: o.delivery_window,
            schedulingStatus: o.scheduling_status || (o.confirmed_delivery_date ? 'SCHEDULED' : 'AWAITING_SCHEDULING'),
            deliveryRunId: o.delivery_run_id,
            vehicleRegistration: o.vehicle_registration,
            items,
            notes: o.notes,
            itemsSummaryText: itemsSummary,
            isNew: isNewlyArrived,
          };
        });

        // Update known order IDs
        res.orders.forEach((o) => knownOrderIdsRef.current.add(o.id));

        if (newlyFound > 0 && isBackground) {
          setNewOrderNotice(`🔔 ${newlyFound} new shop order${newlyFound === 1 ? '' : 's'} arrived from mobile customer app!`);
        }

        setOrders(mappedOrders);
      }
    } catch (err) {
      if (!isBackground) {
        console.warn('[OrdersList] Backend listing fallback used:', err);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [search, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchOrders(false);
    fetchUnscheduledOrders();
  }, [fetchOrders, fetchUnscheduledOrders]);

  // 4. Controlled Background Polling for Auto-Refresh (every 6 seconds when tab is active)
  useEffect(() => {
    let intervalId: any = null;

    const poll = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return; // Pause polling when tab is inactive
      }
      await Promise.all([fetchOrders(true), fetchUnscheduledOrders()]);
    };

    intervalId = setInterval(poll, 6000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders, fetchUnscheduledOrders]);

  // 5. Admin Status Review Workflow (Approve, Reject, Dispatch)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setUpdatingOrderId(orderId);
    try {
      await api.orders.updateStatus(orderId, newStatus, notes);
      await fetchOrders(false);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      console.error('[OrdersList] Status update error:', err);
      alert('Failed to update order status: ' + (err?.message || 'Unknown error'));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.shopName.toLowerCase().includes(search.toLowerCase()) ||
      o.shopId.toLowerCase().includes(search.toLowerCase()) ||
      o.driver.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatVolumeLitres = (litres: number | null | undefined): string => {
    if (litres == null || isNaN(litres)) return '0 L';
    const rounded = Number(litres.toFixed(2));
    return `${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="info">In Transit</Badge>;
      case 'DISPATCH_PREPARED':
        return <Badge variant="neutral">Bay Prepared</Badge>;
      case 'CONFIRMED':
        return <Badge variant="navy">Confirmed</Badge>;
      case 'PENDING_CONFIRMATION':
      case 'PENDING':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'DISPUTED':
        return <Badge variant="danger">Discrepancy</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // KPI Calculations
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const inTransitCount = orders.filter((o) => o.status === 'IN_TRANSIT').length;
  const inTransitLitres = orders
    .filter((o) => o.status === 'IN_TRANSIT')
    .reduce((sum, o) => sum + o.totalVolumeLitres, 0);
  const pendingCount = orders.filter((o) => o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING').length;
  const disputedCount = orders.filter((o) => o.status === 'DISPUTED').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 className="page-title">Milk Orders & Dispatch Lifecycle</h2>
            {isRefreshing && (
              <span style={{ fontSize: '11px', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={11} className="spin" /> Syncing live
              </span>
            )}
          </div>
          <p className="page-desc">
            Track daily milk orders from shop mobile placement to cold crate packing, approval, driver transit, and confirmation
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Prominent Order Volume Summary Button (Emerald & Ivory) */}
          <Button
            variant="primary"
            icon={<Milk size={16} />}
            onClick={() => setIsVolumeSummaryOpen(true)}
            id="btn-order-volume-summary"
            style={{
              backgroundColor: '#047857',
              borderColor: '#047857',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
            }}
          >
            Order Volume Summary
          </Button>

          <Button
            variant="secondary"
            icon={<Download size={15} />}
            onClick={() => setIsVolumeSummaryOpen(true)}
          >
            Export Manifest
          </Button>
        </div>
      </div>

      {/* 4. Live Incoming Order Notification Banner */}
      {newOrderNotice && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#064E3B',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
            <Bell size={16} style={{ color: '#047857' }} />
            <span>{newOrderNotice}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter('PENDING_CONFIRMATION');
                setNewOrderNotice(null);
              }}
              style={{ fontSize: '11.5px', padding: '3px 8px', height: '26px' }}
            >
              Filter Pending
            </Button>
            <button
              type="button"
              onClick={() => setNewOrderNotice(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}
              aria-label="Dismiss banner"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#DCFCE7', color: '#059669' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Delivered Orders</span>
            <span className="metric-value">{deliveredCount} Completed</span>
            <span className="metric-trend" style={{ color: '#059669' }}>Confirmed by shop pin</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <Truck size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Active In Transit</span>
            <span className="metric-value">{inTransitCount} Vehicle Run</span>
            <span className="metric-trend" style={{ color: '#0369A1' }}>
              {formatVolumeLitres(inTransitLitres)} on vehicle
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <Package size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Pending Shop Orders</span>
            <span className="metric-value">{pendingCount} Awaiting Review</span>
            <span className="metric-trend" style={{ color: '#D97706' }}>Placed via Shop App</span>
          </div>
        </div>

        {/* 5th KPI CARD: Unscheduled Orders Queue */}
        <div
          className="metric-card"
          onClick={() => setActiveSection('UNSCHEDULED_QUEUE')}
          style={{
            cursor: 'pointer',
            backgroundColor: activeSection === 'UNSCHEDULED_QUEUE' ? '#FEF3C7' : '#FFFFFF',
            border: activeSection === 'UNSCHEDULED_QUEUE' ? '2px solid #B45309' : undefined,
          }}
        >
          <div className="metric-icon" style={{ backgroundColor: '#FDE68A', color: '#B45309' }}>
            <Clock size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Unscheduled Orders</span>
            <span className="metric-value" style={{ color: '#B45309' }}>{unscheduledCount} Need Run</span>
            <span className="metric-trend" style={{ color: '#92400E', fontWeight: 700 }}>
              {activeSection === 'UNSCHEDULED_QUEUE' ? '● Currently viewing queue' : 'Click to view queue →'}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
            <AlertCircle size={18} />
          </div>
          <div className="metric-info">
            <span className="metric-title">Disputed / Shortage</span>
            <span className="metric-value">{disputedCount} Order{disputedCount === 1 ? '' : 's'}</span>
            <span className="metric-trend" style={{ color: '#B91C1C' }}>Leaking crates reported</span>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveSection('ALL_ORDERS')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSection === 'ALL_ORDERS' ? '#047857' : '#F1F5F9',
            color: activeSection === 'ALL_ORDERS' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeSection === 'ALL_ORDERS' ? '0 2px 4px rgba(4, 120, 87, 0.2)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <ClipboardList size={15} />
          <span>All Dispatch Orders ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('UNSCHEDULED_QUEUE')}
          id="tab-unscheduled-orders"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSection === 'UNSCHEDULED_QUEUE' ? '#B45309' : '#FEF3C7',
            color: activeSection === 'UNSCHEDULED_QUEUE' ? '#FFFFFF' : '#92400E',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeSection === 'UNSCHEDULED_QUEUE' ? '0 2px 4px rgba(180, 83, 9, 0.2)' : 'none',
            transition: 'all 0.15s ease',
            position: 'relative',
          }}
        >
          <Clock size={15} />
          <span>Unscheduled Orders Queue</span>
          {unscheduledCount > 0 && (
            <span
              style={{
                backgroundColor: activeSection === 'UNSCHEDULED_QUEUE' ? '#FFFFFF' : '#B45309',
                color: activeSection === 'UNSCHEDULED_QUEUE' ? '#B45309' : '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
                marginLeft: '2px',
              }}
            >
              {unscheduledCount}
            </span>
          )}
        </button>
      </div>

      {/* VIEW A: Unscheduled Orders Queue */}
      {activeSection === 'UNSCHEDULED_QUEUE' ? (
        <Card
          title="Unscheduled Orders Queue"
          subtitle={`Orders awaiting route allocation, driver assignment, and publication (${unscheduledOrders.length} pending in queue)`}
          noPadding
        >
          {loadingUnscheduled ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
              <div>Loading unscheduled orders queue...</div>
            </div>
          ) : unscheduledOrders.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                No Unscheduled Orders in Queue
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '0 auto' }}>
                All received replenishment orders have been assigned to confirmed cold-chain delivery runs.
              </p>
            </div>
          ) : (
            <div className="business-table-container">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Merchant Store & Destination</th>
                    <th>Requested Date</th>
                    <th>Queue Waiting</th>
                    <th>Crates & Volume</th>
                    <th>Route Coverage & Eligible Runs</th>
                    <th style={{ textAlign: 'right' }}>Scheduling Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unscheduledOrders.map((u) => {
                    const hasRuns = u.eligible_runs && u.eligible_runs.length > 0;
                    const fittingRuns = (u.eligible_runs || []).filter((r) => r.fits_order);

                    return (
                      <tr key={u.id}>
                        <td>
                          <code style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>
                            {u.order_number}
                          </code>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {formatDate(u.created_at)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.shop_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {typeof u.shop_address === 'string' ? u.shop_address : `${u.shop_address?.street || ''}, ${u.shop_address?.city || ''}`}
                          </div>
                          {u.shop_phone && (
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Ph: {u.shop_phone}</div>
                          )}
                        </td>
                        <td>
                          {u.requested_delivery_date ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#B45309' }}>
                                {formatDate(u.requested_delivery_date)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                Window: {u.delivery_window || 'Standard Morning'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                              Date to be confirmed by supplier
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={11} />
                            {u.awaiting_time_hours} hrs in queue
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#047857' }}>
                            {u.total_crates} Milk Crates
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {u.total_volume_litres} L • {formatCurrency(u.total)}
                          </div>
                        </td>
                        <td>
                          {hasRuns ? (
                            <div>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: fittingRuns.length > 0 ? '#DCFCE7' : '#FEF3C7',
                                  color: fittingRuns.length > 0 ? '#166534' : '#92400E',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                }}
                              >
                                {fittingRuns.length > 0
                                  ? `${fittingRuns.length} matching run${fittingRuns.length === 1 ? '' : 's'} available`
                                  : `${u.eligible_runs.length} runs full / create new`}
                              </span>
                              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                Next: {u.eligible_runs[0]?.route_name} ({formatDate(u.eligible_runs[0]?.delivery_date)})
                              </div>
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              No published route runs
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setOrderToSchedule(u)}
                              style={{ backgroundColor: '#047857', borderColor: '#047857', fontWeight: 700, fontSize: '12px' }}
                              icon={<Calendar size={13} />}
                            >
                              Schedule Order →
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setHistoryOrder({ id: u.id, orderNumber: u.order_number })}
                              icon={<History size={13} />}
                              title="Audit Trail"
                            />
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
      ) : (
        /* VIEW B: All Dispatch Orders */
        <>
          {/* Filter and Search Bar */}
          <div className="search-filter-toolbar">
            <div className="toolbar-search-form">
              <div className="search-input-wrapper">
                <Search size={18} className="search-input-icon" />
                <input
                  type="text"
                  className="toolbar-search-input"
                  placeholder="Search by order number, shop name, or driver..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search orders"
                />
              </div>
            </div>

            <div className="toolbar-filters-group">
              <div className="filter-select-wrapper">
                <ListFilter size={16} className="filter-leading-icon" />
                <select
                  className="toolbar-select-field"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by order status"
                >
                  <option value="">All Statuses ({orders.length})</option>
                  <option value="PENDING_CONFIRMATION">Pending Review ({pendingCount})</option>
                  <option value="CONFIRMED">Confirmed Orders</option>
                  <option value="DISPATCH_PREPARED">Bay Prepared</option>
                  <option value="IN_TRANSIT">In Transit ({inTransitCount})</option>
                  <option value="DELIVERED">Delivered ({deliveredCount})</option>
                  <option value="DISPUTED">Disputed ({disputedCount})</option>
                  <option value="CANCELLED">Cancelled / Rejected</option>
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={13} className={loading ? 'spin' : ''} />}
                onClick={() => {
                  fetchOrders(false);
                  fetchUnscheduledOrders();
                }}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Orders Dispatch Manifest Table */}
          <Card
            title="Live Dispatch Manifest"
            subtitle={`Showing ${filtered.length} shop orders with accurate liquid volume (L) conversions`}
            noPadding
          >
            <div className="business-table-container">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Merchant Store</th>
                    <th>Assigned Route & Driver</th>
                    <th>Total Volume (L)</th>
                    <th>Total Value</th>
                    <th>Order Placed</th>
                    <th>Delivery Schedule</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const isPending = o.status === 'PENDING_CONFIRMATION' || o.status === 'PENDING';
                    return (
                      <tr
                        key={o.id}
                        style={{
                          backgroundColor: o.isNew ? '#F0FDF4' : undefined,
                          transition: 'background-color 0.5s ease',
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ fontWeight: 700, fontSize: '12.5px' }}>{o.orderNumber}</code>
                            {o.isNew && (
                              <span style={{ fontSize: '9.5px', fontWeight: 700, backgroundColor: '#059669', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px' }}>
                                NEW
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-primary">{o.shopName}</div>
                          <div className="text-secondary text-xs">{o.shopId}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{o.driver}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{o.route}</div>
                        </td>

                        {/* LIQUID VOLUME IN LITRES DISPLAY */}
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          <div style={{ fontWeight: 700, color: '#047857', fontSize: '13.5px' }}>
                            {formatVolumeLitres(o.totalVolumeLitres)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {o.cratesCount} crates • {o.packagesCount} pkts
                          </div>
                          {o.hasUnknownCrates && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '10.5px',
                                color: '#B45309',
                                backgroundColor: '#FEF3C7',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                marginTop: '2px',
                              }}
                            >
                              <AlertTriangle size={10} />
                              Partial crate config
                            </span>
                          )}
                        </td>

                        <td className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(o.totalAmount)}
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748B' }}>
                          {formatDate(o.createdAt)}
                        </td>

                        {/* Delivery Schedule Column */}
                        <td>
                          {o.confirmedDeliveryDate ? (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} />
                                <span>{formatDate(o.confirmedDeliveryDate)}</span>
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                {o.deliveryWindow || 'Morning Route'}
                              </div>
                            </div>
                          ) : o.schedulingStatus === 'AWAITING_SCHEDULING' ? (
                            <div>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  padding: '2px 6px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Clock size={10} />
                                Awaiting Run
                              </span>
                              {o.requestedDeliveryDate && (
                                <div style={{ fontSize: '10.5px', color: '#B45309', marginTop: '2px' }}>
                                  Req: {formatDate(o.requestedDeliveryDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Unscheduled</span>
                          )}
                        </td>

                        <td>{getStatusBadge(o.status)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {o.schedulingStatus === 'AWAITING_SCHEDULING' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  const foundUnscheduled = unscheduledOrders.find((u) => u.id === o.id);
                                  if (foundUnscheduled) {
                                    setOrderToSchedule(foundUnscheduled);
                                  } else {
                                    setActiveSection('UNSCHEDULED_QUEUE');
                                  }
                                }}
                                style={{
                                  backgroundColor: '#B45309',
                                  borderColor: '#B45309',
                                  fontSize: '11.5px',
                                  padding: '2px 8px',
                                  height: '28px',
                                }}
                                icon={<Calendar size={12} />}
                              >
                                Schedule
                              </Button>
                            )}
                            {o.confirmedDeliveryDate && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOrderToReschedule({ id: o.id, orderNumber: o.orderNumber, currentDate: o.confirmedDeliveryDate })}
                                style={{ fontSize: '11px', padding: '2px 6px', height: '28px' }}
                                title="Reschedule delivery run/date"
                              >
                                <RefreshCw size={12} />
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setHistoryOrder({ id: o.id, orderNumber: o.orderNumber })}
                              style={{ fontSize: '11px', padding: '2px 6px', height: '28px' }}
                              title="View scheduling audit history"
                            >
                              <History size={12} />
                            </Button>
                            <Button
                              variant={isPending ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setSelectedOrder(o)}
                              style={isPending ? { backgroundColor: '#047857', borderColor: '#047857', fontSize: '12px', fontWeight: 600 } : { fontSize: '12px' }}
                              icon={<Eye size={13} />}
                            >
                              {isPending ? 'Review' : 'Details'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Order Detail & Approval Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '750px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    Order {selectedOrder.orderNumber}
                  </h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="modal-desc" style={{ marginTop: '2px' }}>
                  Merchant: {selectedOrder.shopName} ({selectedOrder.shopId}) • Placed {formatDate(selectedOrder.createdAt)}
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
              {/* Review Order Notification if Pending */}
              {(selectedOrder.status === 'PENDING_CONFIRMATION' || selectedOrder.status === 'PENDING') && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ color: '#92400E', fontSize: '13px' }}>
                    <strong>Action Required:</strong> This replenishment order was placed by the shop customer and is pending administrator confirmation before crate packing.
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                      disabled={updatingOrderId === selectedOrder.id}
                      icon={<Check size={13} />}
                      style={{ backgroundColor: '#047857', borderColor: '#047857' }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to reject this shop replenishment order?')) {
                          handleUpdateOrderStatus(selectedOrder.id, 'CANCELLED', 'Rejected by administrator during dispatch review');
                        }
                      }}
                      disabled={updatingOrderId === selectedOrder.id}
                      icon={<XCircle size={13} />}
                      style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Next Lifecycle Step if Confirmed */}
              {selectedOrder.status === 'CONFIRMED' && (
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '12.5px', color: '#064E3B' }}>
                    <strong>Order Confirmed:</strong> Ready to allocate cold storage and prepare crates for loading.
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'PREPARING')}
                    disabled={updatingOrderId === selectedOrder.id}
                    icon={<ArrowRight size={13} />}
                    style={{ backgroundColor: '#047857', borderColor: '#047857', fontSize: '12px' }}
                  >
                    Prepare for Dispatch
                  </Button>
                </div>
              )}

              {/* Route Scheduling & Delivery Date Banner */}
              <div
                style={{
                  backgroundColor: selectedOrder.confirmedDeliveryDate ? '#F0FDF4' : '#FFFBEB',
                  border: `1px solid ${selectedOrder.confirmedDeliveryDate ? '#BBF7D0' : '#FDE68A'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedOrder.confirmedDeliveryDate ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : (
                      <Clock size={16} color="#D97706" />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: selectedOrder.confirmedDeliveryDate ? '#166534' : '#92400E' }}>
                      {selectedOrder.confirmedDeliveryDate
                        ? `Confirmed Delivery Date: ${formatDate(selectedOrder.confirmedDeliveryDate)}`
                        : 'Delivery Date Awaiting Supplier Confirmation'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                    {selectedOrder.confirmedDeliveryDate
                      ? `Window: ${selectedOrder.deliveryWindow || 'Morning Route'} • Van: ${selectedOrder.vehicleRegistration || 'Cold-Chain Van'}`
                      : selectedOrder.requestedDeliveryDate
                      ? `Shop requested arrival: ${formatDate(selectedOrder.requestedDeliveryDate)} (Pending run allocation)`
                      : 'No delivery run currently assigned to this order'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {selectedOrder.confirmedDeliveryDate ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setOrderToReschedule({ id: selectedOrder.id, orderNumber: selectedOrder.orderNumber, currentDate: selectedOrder.confirmedDeliveryDate })}
                      style={{ fontSize: '12px' }}
                      icon={<RefreshCw size={12} />}
                    >
                      Reschedule
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const foundUnscheduled = unscheduledOrders.find((u) => u.id === selectedOrder.id);
                        if (foundUnscheduled) {
                          setOrderToSchedule(foundUnscheduled);
                          setSelectedOrder(null);
                        } else {
                          setActiveSection('UNSCHEDULED_QUEUE');
                          setSelectedOrder(null);
                        }
                      }}
                      style={{ backgroundColor: '#047857', borderColor: '#047857', fontSize: '12px', fontWeight: 700 }}
                      icon={<Calendar size={12} />}
                    >
                      Schedule Order
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setHistoryOrder({ id: selectedOrder.id, orderNumber: selectedOrder.orderNumber })}
                    style={{ fontSize: '12px' }}
                    icon={<History size={12} />}
                  >
                    Audit Trail
                  </Button>
                </div>
              </div>

              {/* Route & Driver Details & Liquid Volume Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  backgroundColor: '#FFFFFF',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3C8',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Assigned Driver
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedOrder.driver}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Delivery Route
                  </span>
                  <div style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    {selectedOrder.route}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#047857', textTransform: 'uppercase', fontWeight: 700 }}>
                    Ordered Liquid Volume
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#047857' }}>
                    {formatVolumeLitres(selectedOrder.totalVolumeLitres)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Crates
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedOrder.cratesCount} Crates ({selectedOrder.packagesCount} pkts)
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Product Allocation & Packaging Conversion Breakdown
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className="business-table" style={{ fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Packaging</th>
                        <th>Ordered Packages</th>
                        <th>Liquid Volume (L)</th>
                        <th>Crates</th>
                        <th>Rate</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <code style={{ fontSize: '11px' }}>{item.sku}</code>
                          </td>
                          <td>
                            {item.packageSize} {item.packagingType}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {item.orderedPackages} pkts
                          </td>
                          <td style={{ fontWeight: 700, color: item.isLiquid ? '#047857' : '#64748B' }}>
                            {item.isLiquid ? (
                              formatVolumeLitres(item.volumeLitres)
                            ) : (
                              <span style={{ fontSize: '11.5px' }}>
                                Not applicable {item.weightKg != null ? `(${item.weightKg} kg)` : ''}
                              </span>
                            )}
                          </td>
                          <td>
                            {item.orderedCrates != null ? (
                              <span>{item.orderedCrates} crates</span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#B45309' }}>Missing config</span>
                            )}
                          </td>
                          <td>{formatCurrency(item.unitPrice)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #D6D3C8' }}>
                          Order Total:
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #D6D3C8', color: 'var(--color-navy)' }}>
                          {formatCurrency(selectedOrder.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes or Dispute Notice */}
              {selectedOrder.notes && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    backgroundColor: selectedOrder.status === 'DISPUTED' ? '#FEF2F2' : '#F1F5F9',
                    border: `1px solid ${selectedOrder.status === 'DISPUTED' ? '#FECACA' : '#D6D3C8'}`,
                    color: selectedOrder.status === 'DISPUTED' ? '#991B1B' : 'var(--text-primary)',
                    fontSize: '12.5px',
                  }}
                >
                  <strong>Operational Note:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="secondary" size="sm" icon={<FileCheck size={14} />}>
                Print Delivery Challan
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" size="sm" onClick={() => setSelectedOrder(null)}>
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONSOLIDATED ORDER VOLUME SUMMARY MODAL */}
      <OrderVolumeSummaryModal
        isOpen={isVolumeSummaryOpen}
        onClose={() => setIsVolumeSummaryOpen(false)}
      />

      {/* 3. SCHEDULE ORDER MODAL (UNSCHEDULED QUEUE WORKFLOW) */}
      <ScheduleOrderModal
        order={orderToSchedule}
        isOpen={Boolean(orderToSchedule)}
        onClose={() => setOrderToSchedule(null)}
        onScheduled={() => {
          fetchOrders(false);
          fetchUnscheduledOrders();
        }}
      />

      {/* 4. RESCHEDULE ORDER MODAL */}
      <RescheduleOrderModal
        orderId={orderToReschedule?.id || null}
        orderNumber={orderToReschedule?.orderNumber || ''}
        currentDate={orderToReschedule?.currentDate}
        isOpen={Boolean(orderToReschedule)}
        onClose={() => setOrderToReschedule(null)}
        onRescheduled={() => {
          fetchOrders(false);
          fetchUnscheduledOrders();
        }}
      />

      {/* 5. SCHEDULING AUDIT TRAIL MODAL */}
      <SchedulingHistoryModal
        orderId={historyOrder?.id || null}
        orderNumber={historyOrder?.orderNumber || ''}
        isOpen={Boolean(historyOrder)}
        onClose={() => setHistoryOrder(null)}
      />
    </div>
  );
};
