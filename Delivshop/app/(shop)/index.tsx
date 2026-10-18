import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { shopApi } from '@/services/api/shopApi';
import { CacheManager } from '@/services/offline/cacheManager';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/formatters';

export default function ShopDashboardScreen() {
  const { user, shop, logout } = useAuth();
  const currentShopId = shop?.id || user?.shopId || 'current';

  const [profile, setProfile] = useState<any>(shop);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const loadDashboardData = useCallback(async (forceNetwork = false) => {
    // 1. First load from offline cache for instant display
    if (!forceNetwork) {
      const cachedProfile = await CacheManager.load<any>(currentShopId, 'profile');
      const cachedOrders = await CacheManager.load<any[]>(currentShopId, 'orders');

      if (cachedProfile.data) {
        setProfile(cachedProfile.data);
        setLastSyncTime(cachedProfile.lastSync);
      }
      if (cachedOrders.data) {
        setOrders(cachedOrders.data);
      }
    }

    // 2. Fetch fresh data from backend
    try {
      const [freshProfile, freshOrders] = await Promise.all([
        shopApi.getMyProfile(),
        shopApi.getMyOrders(),
      ]);

      setProfile(freshProfile);
      setOrders(Array.isArray(freshOrders) ? freshOrders : []);
      setIsOffline(false);
      const now = new Date();
      setLastSyncTime(now);

      // Persist in local cache for offline recovery
      await Promise.all([
        CacheManager.save(currentShopId, 'profile', freshProfile),
        CacheManager.save(currentShopId, 'orders', freshOrders),
      ]);
    } catch {
      // Backend unreachable or offline — keep using cached data
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShopId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  const shopName = profile?.name || shop?.name || 'Verified Merchant Store';
  const shopNumber = profile?.shop_id || shop?.shopId || '—';
  const ownerName = profile?.owner_name || profile?.user_name || user?.name || 'Shop Partner';
  const address = profile?.address || 'Nashik Supply Zone';

  // Compute metrics from actual orders & profile
  const todayStr = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter((o) => (o.created_at || '').slice(0, 10) === todayStr).length;
  const pendingOrders = orders.filter((o) => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status)).length;
  const completedDeliveries = orders.filter((o) => o.status === 'DELIVERED').length;
  const balance = Number(profile?.outstanding_balance || 0);
  const creditLimit = Number(profile?.credit_limit || 0);

  const recentOrders = orders.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Network / Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#B45309" />
          <Text style={styles.offlineBannerText}>
            Working Offline • Displaying cached records
            {lastSyncTime ? ` (${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16805D']} />}
      >
        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoLetter}>D</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>DELIVSHOP</Text>
                <Text style={styles.brandSubtitle}>MERCHANT OPERATING PORTAL</Text>
              </View>
            </View>

            <View style={styles.shopIdTag}>
              <Text style={styles.shopIdTagText}>ID: {shopNumber}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.welcomeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.shopNameText} numberOfLines={1}>{shopName}</Text>
              <Text style={styles.ownerText}>Owner: {ownerName}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeStatusText}>
                {profile?.status === 'ACTIVE' ? 'Active Merchant' : profile?.status || 'Active'}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.primaryOrderButton}
          onPress={() => router.push('/(shop)/create-order')}
          activeOpacity={0.88}
        >
          <View style={styles.orderBtnLeft}>
            <View style={styles.orderIconBox}>
              <Ionicons name="cart" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.orderBtnTitle}>Place Milk & Dairy Order</Text>
              <Text style={styles.orderBtnSubtitle}>Daily product supply & direct delivery booking</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 4 Key Metrics Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operations Overview</Text>
          <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={16} color="#16805D" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="calendar-outline" size={18} color="#16805D" />
            </View>
            <Text style={styles.metricValue}>{ordersToday}</Text>
            <Text style={styles.metricLabel}>Orders Today</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="time-outline" size={18} color="#B45309" />
            </View>
            <Text style={[styles.metricValue, { color: '#B45309' }]}>{pendingOrders}</Text>
            <Text style={styles.metricLabel}>Pending Queue</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#0369A1" />
            </View>
            <Text style={styles.metricValue}>{completedDeliveries}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="cash-outline" size={18} color="#B91C1C" />
            </View>
            <Text style={[styles.metricValue, { color: balance > 0 ? '#B91C1C' : '#16805D' }]}>
              {formatCurrency(balance)}
            </Text>
            <Text style={styles.metricLabel}>Outstanding</Text>
          </View>
        </View>

        {/* Quick Nav Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(shop)/orders')}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={20} color="#16805D" />
            <Text style={styles.quickActionText}>All Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(shop)/deliveries')}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={20} color="#16805D" />
            <Text style={styles.quickActionText}>Deliveries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(shop)/account')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={20} color="#16805D" />
            <Text style={styles.quickActionText}>Billing & Invoices</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Store Orders</Text>
          {orders.length > 5 && (
            <TouchableOpacity onPress={() => router.push('/(shop)/orders')}>
              <Text style={styles.seeAllText}>View All ({orders.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#16805D" />
            <Text style={styles.loadingText}>Syncing store data...</Text>
          </View>
        ) : recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cart-outline" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button above to place your first direct dairy delivery order.
            </Text>
          </View>
        ) : (
          recentOrders.map((order) => {
            const orderNum = order.order_number || `ORD-${order.id?.slice(0, 8)}`;
            const itemCount = Array.isArray(order.items) ? order.items.length : 1;
            const itemsSummary = Array.isArray(order.items)
              ? order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
              : 'Dairy replenishment order';

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderNumberText}>{orderNum}</Text>
                    <Text style={styles.orderDateText}>{formatDate(order.created_at)}</Text>
                  </View>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '18' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                      {order.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.orderItemsText} numberOfLines={2}>
                  {itemsSummary}
                </Text>

                <View style={styles.orderCardFooter}>
                  <Text style={styles.itemCountText}>{itemCount} line item{itemCount !== 1 ? 's' : ''}</Text>
                  <Text style={styles.orderTotalText}>{formatCurrency(Number(order.total || 0))}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2', // Ivory background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#123B32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#123B32', // Forest green
    borderWidth: 1.5,
    borderColor: '#C7A75A', // Accent gold
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#F8F8F2',
    fontSize: 18,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#123B32',
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B',
  },
  shopIdTag: {
    backgroundColor: '#F8F8F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shopIdTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16805D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeGreeting: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#20342C',
    marginVertical: 2,
  },
  ownerText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16805D',
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16805D',
  },
  primaryOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16805D', // Primary emerald
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#16805D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  orderBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#123B32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderBtnSubtitle: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20342C',
    letterSpacing: 0.3,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16805D',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#20342C',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#20342C',
    textAlign: 'center',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20342C',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  orderCardHeader: {
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
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orderItemsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  itemCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16805D',
  },
});
