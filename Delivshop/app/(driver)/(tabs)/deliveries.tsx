import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { StatusBadge } from '@/components/driver/StatusBadge';
import { Delivery } from '@/types/delivery';

type FilterTab = 'ALL' | 'CURRENT' | 'UPCOMING' | 'COMPLETED' | 'EXCEPTIONS';

export default function DriverDeliveriesTabScreen() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDeliveries = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await driverApi.getAssignedDeliveries();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [user?.id])
  );

  // Apply Filter and Search
  useEffect(() => {
    let result = [...deliveries];

    // Filter by Tab
    if (activeFilter === 'CURRENT') {
      result = result.filter((d) =>
        ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'PICKED_UP', 'EN_ROUTE_DROPOFF'].includes(
          d.status
        )
      );
    } else if (activeFilter === 'UPCOMING') {
      result = result.filter((d) =>
        ['PENDING_ASSIGNMENT', 'ASSIGNED'].includes(d.status)
      );
    } else if (activeFilter === 'COMPLETED') {
      result = result.filter((d) => d.status === 'DELIVERED');
    } else if (activeFilter === 'EXCEPTIONS') {
      result = result.filter((d) => ['FAILED', 'CANCELLED'].includes(d.status));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          (d.shop_name || d.shopName || '').toLowerCase().includes(q) ||
          (d.order_number || d.orderNumber || d.id || '').toLowerCase().includes(q) ||
          (d.shop_address || d.pickupAddress || '').toLowerCase().includes(q)
      );
    }

    setFilteredDeliveries(result);
  }, [deliveries, activeFilter, searchQuery]);

  const handleOpenMaps = async (lat?: number | null, lng?: number | null, address?: string) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    }
    if (address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    }
    Alert.alert('Location Notice', 'GPS coordinates or street address not found for navigation.');
  };

  const renderDeliveryCard = ({ item }: { item: Delivery }) => {
    const orderNo = item.order_number || item.orderNumber || item.id.substring(0, 8);
    const shopName = item.shop_name || item.shopName || 'Shop Store';
    const address = item.shop_address || item.pickupAddress || 'Address on record';
    const contactName = item.delivery_contact_name || 'Store Manager';
    const contactPhone = item.delivery_contact_phone;
    const isCompleted = item.status === 'DELIVERED';
    const isFailed = item.status === 'FAILED' || item.status === 'CANCELLED';

    return (
      <View style={[styles.card, isCompleted && styles.completedCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.orderBadge}>
            <Ionicons name="receipt-outline" size={14} color={DelivColors.deepEmerald} />
            <Text style={styles.orderNoText}>{orderNo}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <Text style={styles.shopName} numberOfLines={1}>
          {shopName}
        </Text>
        <Text style={styles.addressText} numberOfLines={2}>
          {address}
        </Text>

        <View style={styles.contactRow}>
          <Ionicons name="person-circle-outline" size={16} color={DelivColors.textSecondary} />
          <Text style={styles.contactText}>
            {contactName} {contactPhone ? `• ${contactPhone}` : ''}
          </Text>
        </View>

        {item.delivery_instructions && (
          <View style={styles.instructionsBox}>
            <Ionicons name="information-circle-outline" size={14} color="#B45309" />
            <Text style={styles.instructionsText} numberOfLines={2}>
              {item.delivery_instructions}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() =>
              handleOpenMaps(item.shop_latitude, item.shop_longitude, address)
            }
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={16} color={DelivColors.emeraldGreen} />
            <Text style={styles.mapBtnText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.openWorkflowBtn,
              isCompleted && styles.completedWorkflowBtn,
            ]}
            onPress={() =>
              router.push({
                pathname: '/(driver)/delivery/[id]',
                params: { id: item.id },
              })
            }
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.openWorkflowBtnText,
                isCompleted && styles.completedWorkflowBtnText,
              ]}
            >
              {isCompleted ? 'View Proof & Summary' : 'Shop Delivery Workflow →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DriverHeader title="Assigned Deliveries" subtitle="Manage store deliveries & verify drop-offs" />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={DelivColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search store name, order # or address..."
            placeholderTextColor={DelivColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={DelivColors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['ALL', 'CURRENT', 'UPCOMING', 'COMPLETED', 'EXCEPTIONS'] as FilterTab[]).map((tab) => {
            const isSelected = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setActiveFilter(tab)}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {tab === 'ALL' ? 'All Deliveries' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Delivery List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Fetching assigned deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderDeliveryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDeliveries(true)}
              colors={[DelivColors.emeraldGreen]}
              tintColor={DelivColors.emeraldGreen}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={DelivColors.textMuted} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Matching Deliveries' : 'No Deliveries Found'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'Try adjusting your search terms or filter.'
                  : 'You have no deliveries matching the selected category.'}
              </Text>
            </View>
          }
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: DelivColors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: DelivColors.textPrimary,
  },
  filterBar: {
    backgroundColor: DelivColors.white,
    borderBottomWidth: 1,
    borderBottomColor: DelivColors.border,
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: DelivColors.deepEmerald,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.textSecondary,
  },
  filterPillTextActive: {
    color: DelivColors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  completedCard: {
    backgroundColor: '#FAFBF9',
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderNoText: {
    fontSize: 12,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  shopName: {
    fontSize: 17,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    fontWeight: '500',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DelivColors.ivory,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  mapBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.emeraldGreen,
  },
  openWorkflowBtn: {
    flex: 1,
    backgroundColor: DelivColors.emeraldGreen,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openWorkflowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.white,
  },
  completedWorkflowBtn: {
    backgroundColor: '#F1F5F9',
  },
  completedWorkflowBtnText: {
    color: DelivColors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: DelivColors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
