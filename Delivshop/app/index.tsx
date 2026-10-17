import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/features/auth/AuthContext';

export default function DelivshopLandingScreen() {
  const { user } = useAuth();
  const isShopOwner = user?.role === 'SHOP';
  const isDriver = user?.role === 'DRIVER';

  useEffect(() => {
    // Hide native splash screen once initial landing page mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleEnterDashboard = () => {
    if (isShopOwner) {
      router.push('/(shop)');
    } else if (isDriver) {
      router.push('/(driver)/(tabs)' as any);
    } else {
      router.push('/(shop)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <View style={styles.logoInnerBox}>
              <Text style={styles.logoLetter}>D</Text>
            </View>
          </View>

          <Text style={styles.brandTitle}>DELIVSHOP</Text>
          <Text style={styles.brandSubtitle}>DAIRY DISTRIBUTION MANAGEMENT</Text>

          <View style={styles.securityPill}>
            <View style={styles.statusDot} />
            <Text style={styles.securityPillText}>PORTAL AUTHENTICATION GATEWAY</Text>
          </View>
        </View>

        {/* Existing Session Shortcut (if user is already authenticated) */}
        {user && (
          <View style={styles.activeSessionCard}>
            <View style={styles.activeSessionHeader}>
              <View style={styles.activeDot} />
              <Text style={styles.activeSessionTitle}>Active Session Detected</Text>
            </View>
            <Text style={styles.activeSessionUser}>
              {user.name} ({user.role})
            </Text>
            <TouchableOpacity
              style={styles.activeSessionBtn}
              onPress={handleEnterDashboard}
              activeOpacity={0.85}
            >
              <Text style={styles.activeSessionBtnText}>
                Continue to {isShopOwner ? 'Shop Dashboard' : 'Driver Portal'} →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Role Selection Heading */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Your Facility Portal</Text>
          <Text style={styles.sectionDesc}>
            Access dedicated mobile workflows designed for verified merchants and fleet drivers
          </Text>
        </View>

        {/* Portal 1: Shop Owner */}
        <View style={styles.portalCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#16805D' }]}>
              {/* Store Icon shape */}
              <View style={styles.storeIconRoof} />
              <View style={styles.storeIconBase} />
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>MERCHANT PORTAL</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Merchant Store Owner</Text>
          <Text style={styles.cardDesc}>
            Place daily milk replenishment orders, monitor active route dispatches, and review billing invoices & credit terms.
          </Text>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/(auth)/shop-login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Sign In as Shop Owner</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Portal 2: Fleet Driver */}
        <View style={styles.portalCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#123B32' }]}>
              {/* Truck Icon shape */}
              <View style={styles.truckIconBody} />
              <View style={styles.truckIconCab} />
            </View>
            <View style={[styles.cardBadge, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.cardBadgeText, { color: '#123B32' }]}>FLEET LOGISTICS</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Delivery Fleet Driver</Text>
          <Text style={styles.cardDesc}>
            Access daily assigned delivery runs, navigate to verified GPS destination pins, and record crate drop-offs in real time.
          </Text>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#123B32' }]}
            onPress={() => router.push('/(auth)/driver-login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>Sign In as Fleet Driver</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            TLS 1.3 ENCRYPTED • VERIFIED LOGISTICS SESSION
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#123B32',
    borderWidth: 2,
    borderColor: '#C7A75A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#123B32',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logoInnerBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#16805D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-black',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#20342C',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-black',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16805D',
    marginRight: 6,
  },
  securityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16805D',
    letterSpacing: 0.5,
  },
  activeSessionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  activeSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16805D',
    marginRight: 8,
  },
  activeSessionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16805D',
    textTransform: 'uppercase',
  },
  activeSessionUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20342C',
    marginBottom: 10,
  },
  activeSessionBtn: {
    backgroundColor: '#16805D',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeSessionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#20342C',
  },
  sectionDesc: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  portalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#123B32',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeIconRoof: {
    width: 22,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: 2,
  },
  storeIconBase: {
    width: 18,
    height: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 1,
  },
  truckIconBody: {
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginRight: 6,
  },
  truckIconCab: {
    position: 'absolute',
    right: 10,
    bottom: 12,
    width: 8,
    height: 10,
    backgroundColor: '#C7A75A',
    borderTopRightRadius: 3,
  },
  cardBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16805D',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#20342C',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#16805D',
    borderRadius: 10,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
});
