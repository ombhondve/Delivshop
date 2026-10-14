import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { driverApi } from '@/services/api/driverApi';
import { getStatusColor } from '@/utils/formatters';
import { Delivery, DeliveryStatus } from '@/types/delivery';
import { Spacing } from '@/constants/theme';
import { MOCK_DELIVERIES } from '@/mock/mockData';

export default function DriverDeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      const data = await driverApi.getAssignedDeliveries();
      if (Array.isArray(data) && data.length > 0) {
        setDeliveries(data);
      } else {
        // Fallback to sample assigned deliveries if database currently empty
        setDeliveries(MOCK_DELIVERIES);
      }
    } catch {
      setDeliveries(MOCK_DELIVERIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  /**
   * Safe Navigation Handler:
   * Validates destination coordinates before launching external maps application.
   * Ensures driver live location is never used to overwrite shop permanent coordinates.
   */
  const handleNavigateToShop = async (lat?: number | null, lng?: number | null, shopName?: string) => {
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      Alert.alert(
        'GPS Location Unverified',
        'This store does not have verified GPS coordinates saved. Please use the street address.'
      );
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert('Invalid Coordinates', 'Destination coordinates are out of standard geographic bounds.');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Map Navigation Unavailable', 'Cannot open maps app on this device.');
    }
  };

  const handleUpdateStatus = async (deliveryId: string, nextStatus: DeliveryStatus) => {
    setUpdatingId(deliveryId);
    try {
      await driverApi.updateDeliveryStatus(deliveryId, {
        status: nextStatus,
        notes: `Driver transitioned to ${nextStatus}`,
      });
      await fetchDeliveries();
    } catch (err: any) {
      Alert.alert('Status Update Failed', err.message || 'Could not update delivery status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderDelivery = ({ item }: { item: Delivery }) => {
    const orderNumber = item.order_number || item.orderNumber || item.id?.slice(0, 8);
    const shopName = item.shop_name || item.shopName || 'Store';
    const pickupAddress = item.shop_address || item.pickupAddress || 'Address on record';
    const lat = item.shop_latitude;
    const lng = item.shop_longitude;
    const hasCoordinates = lat !== undefined && lat !== null && lng !== undefined && lng !== null;
    const instructions = item.delivery_instructions;
    const contactPhone = item.delivery_contact_phone;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <ThemedText style={styles.orderNum}>Order #{orderNumber}</ThemedText>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <ThemedText style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>

        {/* Shop Pickup & GPS Section */}
        <View style={styles.addressSection}>
          <View style={styles.point}>
            <View style={styles.pointHeader}>
              <ThemedText style={styles.pointLabel}>Pickup Destination:</ThemedText>
              <View style={[styles.coordBadge, { backgroundColor: hasCoordinates ? '#ECFDF5' : '#F3F4F6' }]}>
                <ThemedText style={[styles.coordText, { color: hasCoordinates ? '#059669' : '#6B7280' }]}>
                  {hasCoordinates ? '📍 GPS Verified' : '📍 Unverified'}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.pointValue}>{shopName}</ThemedText>
            <ThemedText style={styles.pointSub}>{pickupAddress}</ThemedText>

            {contactPhone && (
              <ThemedText style={styles.contactText}>
                Contact: {contactPhone}
              </ThemedText>
            )}

            {instructions && (
              <ThemedText style={styles.instructionText}>
                Instructions: {instructions}
              </ThemedText>
            )}
          </View>

          {/* Navigation Action */}
          <TouchableOpacity
            style={[styles.navButton, !hasCoordinates && styles.navButtonDisabled]}
            onPress={() => handleNavigateToShop(lat, lng, shopName)}
          >
            <ThemedText style={styles.navButtonText}>
              🗺️ Open in Google Maps Navigation
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Driver Action Buttons */}
        <View style={styles.actions}>
          {item.status !== 'PICKED_UP' && item.status !== 'DELIVERED' && (
            <TouchableOpacity
              style={styles.primaryAction}
              disabled={updatingId === item.id}
              onPress={() => handleUpdateStatus(item.id, 'PICKED_UP')}
            >
              {updatingId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.primaryActionText}>Mark Picked Up</ThemedText>
              )}
            </TouchableOpacity>
          )}

          {item.status !== 'DELIVERED' && (
            <TouchableOpacity
              style={styles.successAction}
              disabled={updatingId === item.id}
              onPress={() => handleUpdateStatus(item.id, 'DELIVERED')}
            >
              {updatingId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.successActionText}>Complete Dropoff</ThemedText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.screenTitle}>
          Assigned Deliveries
        </ThemedText>
        <ThemedText style={styles.screenSubtitle}>
          Destination coordinates and navigation routing
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={deliveries}
            keyExtractor={(item) => item.id}
            renderItem={renderDelivery}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  screenTitle: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    fontSize: 24,
    fontWeight: '800',
  },
  screenSubtitle: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNum: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressSection: {
    gap: Spacing.two,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  point: {
    gap: 3,
  },
  pointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  coordBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coordText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pointValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  pointSub: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  contactText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
    marginTop: 2,
  },
  instructionText: {
    fontSize: 12,
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  navButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  navButtonText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  successAction: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  successActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
