import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { shopApi } from '@/services/api/shopApi';
import { CacheManager } from '@/services/offline/cacheManager';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/formatters';

const STATUS_FILTERS = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
];

export default function ShopOrdersScreen() {
  const { user, shop } = useAuth();
  const currentShopId = shop?.id || user?.shopId || 'current';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchOrders = useCallback(async (forceNetwork = false) => {
    // 1. Instant load from offline cache
    if (!forceNetwork) {
      const cached = await CacheManager.load<any[]>(currentShopId, 'orders');
      if (cached.data) {
        setOrders(cached.data);
        setLoading(false);
      }
    }

    // 2. Network synchronization
    try {
      const data = await shopApi.getMyOrders();
      if (Array.isArray(data)) {
        setOrders(data);
        await CacheManager.save(currentShopId, 'orders', data);
      }
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShopId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = activeFilter === 'ALL' || order.status === activeFilter;
      const orderNum = (order.order_number || `ORD-${order.id}`).toLowerCase();
      const matchSearch =
        searchQuery.trim() === '' || orderNum.includes(searchQuery.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  const renderOrderItem = ({ item }: { item: any }) => {
    const orderNumber = item.order_number || `ORD-${item.id?.slice(0, 8)}`;
    const lineItems = Array.isArray(item.items) ? item.items : [];
    const itemCount = lineItems.length;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setSelectedOrder(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumberText}>{orderNumber}</Text>
            <Text style={styles.orderDateText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.cardHeaderBadges}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '1A' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
            {item.scheduling_status === 'AWAITING_SCHEDULING' && (
              <View style={[styles.schedulingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={11} color="#D97706" />
                <Text style={[styles.schedulingBadgeText, { color: '#B45309' }]}>Awaiting Schedule</Text>
              </View>
            )}
            {item.scheduling_status === 'SCHEDULED' && (
              <View style={[styles.schedulingBadge, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle-outline" size={11} color="#059669" />
                <Text style={[styles.schedulingBadgeText, { color: '#047857' }]}>Scheduled</Text>
              </View>
            )}
            {item.scheduling_status === 'OUT_FOR_DELIVERY' && (
              <View style={[styles.schedulingBadge, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="bicycle-outline" size={11} color="#2563EB" />
                <Text style={[styles.schedulingBadgeText, { color: '#1D4ED8' }]}>Out for Delivery</Text>
              </View>
            )}
          </View>
        </View>

        {lineItems.length > 0 ? (
          <View style={styles.itemsPreviewBox}>
            {lineItems.slice(0, 3).map((li: any, idx: number) => (
              <Text key={li.id || idx} style={styles.previewItemText} numberOfLines={1}>
                • {li.quantity}× {li.name || 'Dairy Item'} ({formatCurrency(Number(li.totalPrice || li.total_price || 0))})
              </Text>
            ))}
            {lineItems.length > 3 && (
              <Text style={styles.moreItemsText}>+ {lineItems.length - 3} more line items</Text>
            )}
          </View>
        ) : (
          <Text style={styles.itemsPreviewText}>Dairy replenishment order</Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.deliveryStatusRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            {item.confirmed_delivery_date ? (
              <Text style={[styles.deliveryStatusText, { color: '#047857', fontWeight: '600' }]}>
                Confirmed: {formatDate(item.confirmed_delivery_date)}
              </Text>
            ) : item.requested_delivery_date ? (
              <Text style={[styles.deliveryStatusText, { color: '#B45309', fontWeight: '500' }]}>
                Requested: {formatDate(item.requested_delivery_date)}
              </Text>
            ) : (
              <Text style={styles.deliveryStatusText}>
                {item.delivery_status || 'Pending Assignment'}
              </Text>
            )}
          </View>
          <Text style={styles.orderTotalText}>{formatCurrency(Number(item.total || 0))}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Order Dispatches</Text>
          <Text style={styles.headerSubtitle}>
            {isOffline ? 'Offline Mode (Cached)' : `${orders.length} Verified Orders Registered`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newOrderSmallBtn}
          onPress={() => router.push('/(shop)/create-order')}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newOrderSmallBtnText}>New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order number (e.g. ORD-2026...)"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#16805D" />
          <Text style={styles.loadingText}>Syncing orders ledger...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={44} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Orders Matching Filter</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter !== 'ALL'
              ? `No ${activeFilter.toLowerCase()} orders found. Try selecting "ALL".`
              : 'You have not submitted any replenishment orders yet.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => router.push('/(shop)/create-order')}
          >
            <Text style={styles.emptyActionBtnText}>Create New Order</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16805D']} />}
        />
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalSheetHeader}>
                <View>
                  <Text style={styles.modalOrderNumber}>
                    {selectedOrder.order_number || `ORD-${selectedOrder.id?.slice(0, 8)}`}
                  </Text>
                  <Text style={styles.modalOrderDate}>{formatDate(selectedOrder.created_at)}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Status Progress */}
                <View style={styles.statusBox}>
                  <Text style={styles.statusBoxLabel}>Current Fulfillment Status</Text>
                  <View style={styles.statusValueRow}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedOrder.status) }]} />
                    <Text style={[styles.statusValueText, { color: getStatusColor(selectedOrder.status) }]}>
                      {selectedOrder.status}
                    </Text>
                  </View>
                </View>

                {/* Route Scheduling Banner */}
                {selectedOrder.scheduling_status === 'AWAITING_SCHEDULING' ? (
                  <View style={styles.modalAwaitingBox}>
                    <View style={styles.modalAwaitingHeader}>
                      <Ionicons name="time" size={18} color="#D97706" />
                      <Text style={styles.modalAwaitingTitle}>Awaiting Supplier Scheduling</Text>
                    </View>
                    <Text style={styles.modalAwaitingMsg}>
                      Your order has been received. The delivery date will be confirmed by the supplier.
                    </Text>
                    {selectedOrder.requested_delivery_date && (
                      <Text style={styles.modalRequestedDateText}>
                        Requested Delivery Date: {formatDate(selectedOrder.requested_delivery_date)}
                      </Text>
                    )}
                  </View>
                ) : selectedOrder.confirmed_delivery_date ? (
                  <View style={styles.modalScheduledBox}>
                    <View style={styles.modalScheduledHeader}>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                      <Text style={styles.modalScheduledTitle}>Confirmed Delivery Schedule</Text>
                    </View>
                    <View style={styles.modalScheduledRow}>
                      <Text style={styles.modalScheduledDateLabel}>Delivery Date:</Text>
                      <Text style={styles.modalScheduledDateVal}>{formatDate(selectedOrder.confirmed_delivery_date)}</Text>
                    </View>
                    {selectedOrder.delivery_window && (
                      <View style={styles.modalScheduledRow}>
                        <Text style={styles.modalScheduledDateLabel}>Delivery Window:</Text>
                        <Text style={styles.modalScheduledDateVal}>{selectedOrder.delivery_window}</Text>
                      </View>
                    )}
                    <Text style={styles.modalScheduledNote}>
                      Allocated to cold-chain delivery vehicle with verified crate capacity.
                    </Text>
                  </View>
                ) : null}

                {/* Delivery Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>Delivery Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Scheduling State:</Text>
                    <Text style={[styles.detailVal, { fontWeight: '700' }]}>
                      {selectedOrder.scheduling_status ? selectedOrder.scheduling_status.replace(/_/g, ' ') : 'PENDING'}
                    </Text>
                  </View>
                  {selectedOrder.requested_delivery_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Requested Date:</Text>
                      <Text style={styles.detailVal}>{formatDate(selectedOrder.requested_delivery_date)}</Text>
                    </View>
                  )}
                  {selectedOrder.confirmed_delivery_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Confirmed Date:</Text>
                      <Text style={[styles.detailVal, { color: '#047857', fontWeight: '700' }]}>
                        {formatDate(selectedOrder.confirmed_delivery_date)}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.delivery_window && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Delivery Window:</Text>
                      <Text style={styles.detailVal}>{selectedOrder.delivery_window}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Dispatch Status:</Text>
                    <Text style={styles.detailVal}>{selectedOrder.delivery_status || 'PENDING ASSIGNMENT'}</Text>
                  </View>
                  {selectedOrder.driver_name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Assigned Driver:</Text>
                      <Text style={styles.detailVal}>{selectedOrder.driver_name}</Text>
                    </View>
                  )}
                  {selectedOrder.delivery_address && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Destination:</Text>
                      <Text style={styles.detailVal}>
                        {typeof selectedOrder.delivery_address === 'string'
                          ? selectedOrder.delivery_address
                          : `${selectedOrder.delivery_address.street || ''}, ${selectedOrder.delivery_address.city || ''}`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Items Breakdown */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeading}>Ordered Products</Text>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((i: any, idx: number) => (
                      <View key={i.id || idx} style={styles.itemDetailRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemDetailName}>{i.name || 'Dairy Item'}</Text>
                          <Text style={styles.itemDetailQty}>
                            {i.quantity} × {formatCurrency(Number(i.unitPrice || i.unit_price || 0))}
                          </Text>
                        </View>
                        <Text style={styles.itemDetailTotal}>
                          {formatCurrency(Number(i.totalPrice || i.total_price || 0))}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noItemsText}>Direct crate replenishment order</Text>
                  )}
                </View>

                {/* Financial Summary */}
                <View style={styles.financialSection}>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>Order Subtotal</Text>
                    <Text style={styles.finValue}>{formatCurrency(Number(selectedOrder.subtotal || selectedOrder.total || 0))}</Text>
                  </View>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>Delivery Transport Fee</Text>
                    <Text style={[styles.finValue, { color: '#16805D' }]}>₹0.00 (Standard)</Text>
                  </View>
                  <View style={[styles.finRow, styles.finTotalRow]}>
                    <Text style={styles.finTotalLabel}>Total Amount</Text>
                    <Text style={styles.finTotalValue}>{formatCurrency(Number(selectedOrder.total || 0))}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalBottomBar}>
                <TouchableOpacity
                  style={styles.closeSheetBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <Text style={styles.closeSheetBtnText}>Close Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#123B32',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  newOrderSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16805D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  newOrderSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#20342C',
  },
  filterSection: {
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#123B32',
    borderColor: '#123B32',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#F8F8F2',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20342C',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 8,
    backgroundColor: '#16805D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20342C',
  },
  orderDateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemsPreviewBox: {
    backgroundColor: '#F8F8F2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    gap: 3,
  },
  itemsPreviewText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  previewItemText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  moreItemsText: {
    fontSize: 10,
    color: '#16805D',
    fontWeight: '600',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryStatusText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16805D',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 59, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalOrderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#123B32',
  },
  modalOrderDate: {
    fontSize: 11,
    color: '#64748B',
  },
  modalBody: {
    padding: 16,
  },
  statusBox: {
    backgroundColor: '#F8F8F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  statusBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#123B32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailKey: {
    fontSize: 12,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20342C',
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F2',
  },
  itemDetailName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20342C',
  },
  itemDetailQty: {
    fontSize: 11,
    color: '#64748B',
  },
  itemDetailTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#20342C',
  },
  noItemsText: {
    fontSize: 12,
    color: '#64748B',
  },
  financialSection: {
    backgroundColor: '#F8F8F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 4,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  finValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20342C',
  },
  finTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    marginTop: 4,
  },
  finTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#123B32',
  },
  finTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16805D',
  },
  modalBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeSheetBtn: {
    backgroundColor: '#123B32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeSheetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schedulingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  schedulingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalAwaitingBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalAwaitingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modalAwaitingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  modalAwaitingMsg: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
    marginBottom: 6,
  },
  modalRequestedDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78350F',
  },
  modalScheduledBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalScheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  modalScheduledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  modalScheduledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  modalScheduledDateLabel: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  modalScheduledDateVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  modalScheduledNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
