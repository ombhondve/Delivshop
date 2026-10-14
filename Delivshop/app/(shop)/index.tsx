import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/AuthContext';
import { shopApi } from '@/services/api/shopApi';
import { formatCurrency } from '@/utils/formatters';
import { Spacing } from '@/constants/theme';

export default function ShopDashboardScreen() {
  const { user, shop, logout } = useAuth();
  const [profile, setProfile] = useState<any>(shop);
  const [stats, setStats] = useState({
    totalOrders: 0,
    outstandingBalance: 0,
    creditLimit: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const p = await shopApi.getMyProfile();
      setProfile(p);
      const orders = await shopApi.getMyOrders();
      setStats({
        totalOrders: orders.length,
        outstandingBalance: Number(p.outstanding_balance || 0),
        creditLimit: Number(p.credit_limit || 0),
        todayRevenue: orders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0),
      });
    } catch {
      // Fallback to context shop if offline
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const shopName = profile?.name || shop?.name || 'My Merchant Shop';
  const shopId = profile?.shop_id || shop?.shopId || '—';
  const address = profile?.address ? `${profile.address}, ${profile.city || 'Nashik'}` : 'Delivery Address Configured';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header Card */}
          <ThemedView style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <ThemedText type="title" style={styles.shopTitle}>{shopName}</ThemedText>
                <View style={styles.shopIdBadge}>
                  <ThemedText style={styles.shopIdText}>Shop ID: {shopId}</ThemedText>
                </View>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <ThemedText style={styles.logoutText}>Log Out</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.addressText}>{address}</ThemedText>
          </ThemedView>

          {/* Account & Credit Status */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Outstanding Balance</ThemedText>
              <ThemedText style={[styles.statValue, { color: stats.outstandingBalance > 0 ? '#DC2626' : '#10B981' }]}>
                {formatCurrency(stats.outstandingBalance)}
              </ThemedText>
            </View>

            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Available Credit Limit</ThemedText>
              <ThemedText style={[styles.statValue, { color: '#2563EB' }]}>
                {formatCurrency(stats.creditLimit)}
              </ThemedText>
            </View>

            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Total Orders Placed</ThemedText>
              <ThemedText style={styles.statValue}>{stats.totalOrders}</ThemedText>
            </View>

            <View style={styles.statCard}>
              <ThemedText style={styles.statLabel}>Payment Terms</ThemedText>
              <ThemedText style={[styles.statValue, { fontSize: 16 }]}>
                {profile?.payment_terms || 'Advance'}
              </ThemedText>
            </View>
          </View>

          {/* Navigation & Action Buttons */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(shop)/orders')}>
            <ThemedText style={styles.actionBtnText}>View Orders & Delivery Tracking →</ThemedText>
          </TouchableOpacity>
        </ScrollView>
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
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    backgroundColor: '#F9FAFB',
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shopTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  shopIdBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  shopIdText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  addressText: {
    color: '#4B5563',
    fontSize: 13,
    marginTop: 8,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F3F4F6',
    padding: Spacing.three,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  actionBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
