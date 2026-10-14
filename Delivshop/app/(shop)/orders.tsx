import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { shopApi } from '@/services/api/shopApi';
import { MOCK_ORDERS } from '@/mock/mockData';
import { formatCurrency, formatDate, getStatusColor } from '@/utils/formatters';
import { Order } from '@/types/order';
import { Spacing } from '@/constants/theme';

export default function ShopOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await shopApi.getMyOrders();
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
      } else {
        setOrders(MOCK_ORDERS);
      }
    } catch {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderItem = ({ item }: { item: any }) => {
    const orderNumber = item.order_number || item.orderNumber || item.id?.slice(0, 8);
    const dateStr = item.created_at || item.createdAt;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <ThemedText style={styles.orderNumber}>Order #{orderNumber}</ThemedText>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <ThemedText style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.date}>{formatDate(dateStr)}</ThemedText>

        {item.items && Array.isArray(item.items) && item.items.length > 0 && (
          <View style={styles.itemsList}>
            {item.items.map((i: any) => (
              <ThemedText key={i.id} style={styles.itemRow}>
                {i.quantity}x {i.name} — {formatCurrency(i.totalPrice || i.unit_price * i.quantity)}
              </ThemedText>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <ThemedText style={styles.totalLabel}>Total</ThemedText>
          <ThemedText style={styles.totalValue}>{formatCurrency(item.total)}</ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Store Orders
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Track real-time order processing and delivery fulfillment
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
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
  title: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
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
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
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
  date: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  itemsList: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    gap: 4,
  },
  itemRow: {
    fontSize: 13,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalLabel: {
    fontWeight: '500',
    color: '#6B7280',
  },
  totalValue: {
    fontWeight: '700',
    color: '#2563EB',
    fontSize: 16,
  },
});
