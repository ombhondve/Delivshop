import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { shopApi } from '@/services/api/shopApi';
import { CacheManager } from '@/services/offline/cacheManager';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function ShopAccountScreen() {
  const { user, shop, logout } = useAuth();
  const currentShopId = shop?.id || user?.shopId || 'current';

  const [profile, setProfile] = useState<any>(shop);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadAccountData = useCallback(async (forceNetwork = false) => {
    // 1. Load from cache
    if (!forceNetwork) {
      const cachedProf = await CacheManager.load<any>(currentShopId, 'profile');
      const cachedInvs = await CacheManager.load<any[]>(currentShopId, 'invoices');
      if (cachedProf.data) {
        setProfile(cachedProf.data);
        setLastSync(cachedProf.lastSync);
        setLoading(false);
      }
      if (cachedInvs.data) {
        setInvoices(cachedInvs.data);
      }
    }

    // 2. Fetch fresh profile & invoices from backend
    try {
      const [freshProfile, freshInvoices] = await Promise.all([
        shopApi.getMyProfile(),
        shopApi.getMyInvoices(),
      ]);

      setProfile(freshProfile);
      setInvoices(Array.isArray(freshInvoices) ? freshInvoices : []);
      const now = new Date();
      setLastSync(now);

      await Promise.all([
        CacheManager.save(currentShopId, 'profile', freshProfile),
        CacheManager.save(currentShopId, 'invoices', freshInvoices),
      ]);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentShopId]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAccountData(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'This will securely clear your local authentication keys and cached records on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace('/');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const shopName = profile?.name || shop?.name || 'Verified Merchant Store';
  const shopNumber = profile?.shop_id || shop?.shopId || '—';
  const ownerName = profile?.owner_name || profile?.user_name || user?.name || 'Om Bhondve';
  const phone = profile?.phone || profile?.user_phone || '—';
  const email = profile?.email || profile?.user_email || '—';
  const address = profile?.address || '—';
  const city = profile?.city || 'Nashik';
  const state = profile?.state || 'Maharashtra';
  const pincode = profile?.pincode || '—';
  const paymentTerms = profile?.payment_terms || 'Advance Payment';
  const creditLimit = Number(profile?.credit_limit || 0);
  const outstandingBalance = Number(profile?.outstanding_balance || 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.headerTitle}>Account & Facility Profile</Text>
          <Text style={styles.headerSubtitle}>Verified Merchant Ledger</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color="#16805D" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16805D']} />}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="business" size={24} color="#123B32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopNameText}>{shopName}</Text>
              <View style={styles.idRow}>
                <Text style={styles.shopIdBadge}>ID: {shopNumber}</Text>
                <Text style={styles.merchantRoleText}>• Merchant Facility</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Facility Owner</Text>
            <Text style={styles.infoValue}>{ownerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Mobile</Text>
            <Text style={styles.infoValue}>{phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dispatch Email</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registered Location</Text>
            <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
              {address}, {city}, {state} ({pincode})
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>GPS Pin Verification</Text>
            <View style={styles.verifiedRow}>
              <Ionicons
                name={profile?.is_location_verified ? 'checkmark-circle' : 'time-outline'}
                size={14}
                color={profile?.is_location_verified ? '#16805D' : '#B45309'}
              />
              <Text
                style={[
                  styles.verifiedText,
                  { color: profile?.is_location_verified ? '#16805D' : '#B45309' },
                ]}
              >
                {profile?.is_location_verified ? 'Coordinates Verified' : 'Pending Route Verification'}
              </Text>
            </View>
          </View>
        </View>

        {/* Financial Terms Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Financial Terms & Credit Terms</Text>

          <View style={styles.termsGrid}>
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>Payment Terms</Text>
              <Text style={styles.termValue}>{paymentTerms}</Text>
            </View>
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>Credit Limit</Text>
              <Text style={styles.termValue}>{formatCurrency(creditLimit)}</Text>
            </View>
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>Outstanding Balance</Text>
              <Text style={[styles.termValue, { color: outstandingBalance > 0 ? '#B91C1C' : '#16805D' }]}>
                {formatCurrency(outstandingBalance)}
              </Text>
            </View>
            <View style={styles.termBox}>
              <Text style={styles.termLabel}>Delivery Window</Text>
              <Text style={styles.termValue}>{profile?.delivery_window || 'Morning (5:00 - 7:30 AM)'}</Text>
            </View>
          </View>
        </View>

        {/* Invoices & Statements Section */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>Authoritative Statements & Invoices</Text>
            <Text style={styles.invCountBadge}>{invoices.length} Registered</Text>
          </View>

          {invoices.length === 0 ? (
            <View style={styles.noInvoicesBox}>
              <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
              <Text style={styles.noInvoicesText}>No outstanding or archived invoices</Text>
            </View>
          ) : (
            invoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invNumber}>{inv.invoice_number}</Text>
                  <Text style={styles.invDate}>Due: {formatDate(inv.due_date)}</Text>
                  {inv.notes && <Text style={styles.invNotes}>{inv.notes}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.invAmount}>{formatCurrency(Number(inv.amount || 0))}</Text>
                  <View
                    style={[
                      styles.invStatusBadge,
                      {
                        backgroundColor:
                          inv.status === 'PAID'
                            ? '#ECFDF5'
                            : inv.status === 'OVERDUE'
                            ? '#FEF2F2'
                            : '#FFFBEB',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.invStatusText,
                        {
                          color:
                            inv.status === 'PAID'
                              ? '#16805D'
                              : inv.status === 'OVERDUE'
                              ? '#B91C1C'
                              : '#B45309',
                        },
                      ]}
                    >
                      {inv.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Offline Cache & Security Info */}
        <View style={styles.securityBox}>
          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark" size={16} color="#16805D" />
            <Text style={styles.securityText}>Hardware Keystore Encrypted Session</Text>
          </View>
          <Text style={styles.syncMetaText}>
            Local Store Sync: {lastSync ? lastSync.toLocaleString() : 'Active session'}
          </Text>
        </View>

        {/* Sign Out Action */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.85}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#B91C1C" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
              <Text style={styles.logoutButtonText}>Sign Out of Merchant Store</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8F8F2',
    borderWidth: 1,
    borderColor: '#C7A75A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#20342C',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  shopIdBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16805D',
  },
  merchantRoleText: {
    fontSize: 11,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20342C',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#123B32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  termBox: {
    width: '48.5%',
    backgroundColor: '#F8F8F2',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  termLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  termValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20342C',
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invCountBadge: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  noInvoicesBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noInvoicesText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F2',
  },
  invNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#20342C',
  },
  invDate: {
    fontSize: 11,
    color: '#64748B',
  },
  invNotes: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  invAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#123B32',
  },
  invStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  invStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  securityBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  syncMetaText: {
    fontSize: 10,
    color: '#15803D',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
});
