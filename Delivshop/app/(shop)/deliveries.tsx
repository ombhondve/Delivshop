import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { shopApi } from '@/services/api/shopApi';
import { CacheManager } from '@/services/offline/cacheManager';
import { formatDate } from '@/utils/formatters';

export default function ShopDeliveriesScreen() {
  const { user, shop } = useAuth();
  const currentShopId = shop?.id || user?.shopId || 'current';

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const fetchDeliveries = useCallback(async (forceNetwork = false) => {
    // 1. Load from cache
    if (!forceNetwork) {
      const cached = await CacheManager.load<any[]>(currentShopId, 'deliveries');
      if (cached.data) {
        setDeliveries(cached.data);
        setLoading(false);
      }
    }

    // 2. Fetch fresh deliveries from backend
    try {
      const data = await shopApi.getMyDeliveries();
      if (Array.isArray(data)) {
        setDeliveries(data);
        await CacheManager.save(currentShopId, 'deliveries', data);
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
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries(true);
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '#16805D';
      case 'EN_ROUTE_DROPOFF':
      case 'PICKED_UP':
        return '#0284C7';
      case 'ASSIGNED':
      case 'ACCEPTED':
        return '#C7A75A';
      case 'FAILED':
      case 'CANCELLED':
        return '#B91C1C';
      case 'Scheduling':
      case 'SCHEDULING':
        return '#B45309';
      case 'Pending':
      case 'PENDING':
      default:
        return '#64748B';
    }
  };

  const renderDeliveryItem = ({ item }: { item: any }) => {
    const rawStatus = item.status === 'PENDING_ASSIGNMENT' ? 'Pending' : (item.status || 'Pending');
    const displayStatus = rawStatus.replace(/_/g, ' ');
    const statusColor = getDeliveryStatusColor(rawStatus);
    const hasCoordinates =
      item.current_latitude !== null &&
      item.current_latitude !== undefined &&
      item.current_longitude !== null &&
      item.current_longitude !== undefined;

    return (
      <View style={styles.deliveryCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumberText}>{item.order_number || 'DELIVERY DISPATCH'}</Text>
            <Text style={styles.dateText}>Created: {formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {displayStatus}
            </Text>
          </View>
        </View>

        {/* Assigned Driver Box (Only shown if genuinely assigned) */}
        {item.driver_name && (
          <View style={styles.driverBox}>
            <View style={styles.driverIconCircle}>
              <Ionicons name="person" size={16} color="#16805D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverTitle}>Assigned Logistics Driver</Text>
              <Text style={styles.driverName}>{item.driver_name}</Text>
              {item.driver_phone && (
                <Text style={styles.driverPhone}>Contact: {item.driver_phone}</Text>
              )}
            </View>
            {item.driver_phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${item.driver_phone}`)}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Confirmed Delivery Date */}
        {item.confirmed_delivery_date && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
            <Ionicons name="calendar-outline" size={14} color="#047857" />
            <Text style={{ fontSize: 13, color: '#047857', fontWeight: '600' }}>
              Confirmed Date: {formatDate(item.confirmed_delivery_date)}
              {item.delivery_window ? ` (${item.delivery_window})` : ''}
            </Text>
          </View>
        )}

        {/* Dispatch Notes */}
        {item.notes ? (
          <View style={styles.notesRow}>
            <Ionicons name="information-circle-outline" size={14} color="#64748B" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        {/* Verified Coordinates Pin (Only if genuinely present) */}
        {hasCoordinates && (
          <View style={styles.gpsRow}>
            <Ionicons name="navigate" size={14} color="#16805D" />
            <Text style={styles.gpsText}>
              Live GPS Beacon: {Number(item.current_latitude).toFixed(4)}°N,{' '}
              {Number(item.current_longitude).toFixed(4)}°E
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.footerStep}>
            <View style={[styles.stepDot, { backgroundColor: statusColor }]} />
            <Text style={styles.stepText}>
              {item.status === 'DELIVERED'
                ? 'Delivery Completed'
                : item.status === 'EN_ROUTE_DROPOFF'
                ? 'Vehicle In Transit to Store'
                : 'Supplier Collection & Dispatch'}
            </Text>
          </View>
          {item.estimated_minutes && (
            <Text style={styles.etaText}>ETA: ~{item.estimated_minutes} mins</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Deliveries & Fleet Tracking</Text>
          <Text style={styles.headerSubtitle}>
            {isOffline ? 'Offline Mode (Cached)' : `${deliveries.length} Active Logistics Runs`}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#16805D" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#16805D" />
          <Text style={styles.loadingText}>Syncing delivery dispatches...</Text>
        </View>
      ) : deliveries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={44} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Active Deliveries</Text>
          <Text style={styles.emptySubtitle}>
            When you place an order, assigned delivery vehicles and live tracking updates will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderDeliveryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16805D']} />}
        />
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
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F2',
  },
  listContent: {
    padding: 16,
    gap: 12,
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
    margin: 16,
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
  deliveryCard: {
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
    marginBottom: 10,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20342C',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  driverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F8F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  driverIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16805D',
    textTransform: 'uppercase',
  },
  driverName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20342C',
  },
  driverPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  callButton: {
    backgroundColor: '#16805D',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  gpsText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  footerStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16805D',
  },
});
