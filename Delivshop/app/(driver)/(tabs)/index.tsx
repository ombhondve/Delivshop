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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { driverApi } from '@/services/api/driverApi';
import { DriverQueueManager, PendingDriverOperation } from '@/services/offline/driverQueue';
import { DriverCacheManager } from '@/services/offline/driverCache';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { MetricCard } from '@/components/driver/MetricCard';
import { StatusBadge } from '@/components/driver/StatusBadge';
import { DeliveryRun, DriverAttendance, VehicleInspection, CollectionSummary } from '@/types/driver.types';
import { formatCurrency } from '@/utils/formatters';

export default function DriverDashboardScreen() {
  const { user } = useAuth();
  const driverId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const [attendance, setAttendance] = useState<DriverAttendance | null>(null);
  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);
  const [pendingOps, setPendingOps] = useState<PendingDriverOperation[]>([]);

  const loadDashboardData = async (isManualRefresh = false) => {
    if (!driverId) return;
    if (isManualRefresh) setRefreshing(true);

    try {
      // 1. Load from cache first for immediate render
      const cachedRun = await DriverCacheManager.load<DeliveryRun>(driverId, 'active_run');
      if (cachedRun.data && !activeRun) {
        setActiveRun(cachedRun.data);
      }

      // 2. Fetch real data from backend concurrently
      const [todayAtt, runs, recentInsp, colSum, queued] = await Promise.all([
        driverApi.getTodayAttendance(driverId).catch(() => null),
        driverApi.getAssignedDispatches().catch(() => []),
        driverApi.getRecentInspections().catch(() => []),
        driverApi.getCollectionSummary().catch(() => null),
        DriverQueueManager.getPendingOperations(driverId).catch(() => []),
      ]);

      setAttendance(todayAtt);
      setInspections(recentInsp);
      setCollectionSummary(colSum);
      setPendingOps(queued);

      // Find current active or latest assigned run
      const eligibleRun = runs.find(
        (r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
      ) || runs[0] || null;

      setActiveRun(eligibleRun);
      if (eligibleRun) {
        await DriverCacheManager.save(driverId, 'active_run', eligibleRun);
      }
    } catch {
      // Retain cached data gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [driverId])
  );

  const handleSyncQueue = async () => {
    if (!driverId || syncingOffline) return;
    setSyncingOffline(true);
    try {
      await DriverQueueManager.syncPendingQueue(driverId);
      await loadDashboardData();
    } finally {
      setSyncingOffline(false);
    }
  };

  // Determine shift lifecycle state
  const isShiftStarted = !!attendance?.check_in_time && !attendance?.check_out_time;
  const isShiftCompleted = !!attendance?.check_out_time;
  const shiftState: 'NOT_STARTED' | 'ON_DUTY' | 'COMPLETED' = isShiftCompleted
    ? 'COMPLETED'
    : isShiftStarted
    ? 'ON_DUTY'
    : 'NOT_STARTED';

  // Determine today's vehicle inspection state
  const hasInspectedToday = inspections.some((i) => {
    const inspDate = new Date(i.created_at).toDateString();
    const today = new Date().toDateString();
    return inspDate === today;
  });

  // Calculate stop statistics
  const totalStops = activeRun?.planned_stops_count || 0;
  const completedStops = activeRun?.completed_stops_count || 0;
  const remainingStops = Math.max(0, totalStops - completedStops);
  const stopsDone = totalStops > 0 && remainingStops === 0;

  // Determine the authoritative Single Primary Action CTA
  const renderPrimaryAction = () => {
    if (!isShiftStarted && !isShiftCompleted) {
      return (
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: DelivColors.emeraldGreen }]}
          onPress={() => router.push('/(driver)/shift-start')}
          activeOpacity={0.85}
        >
          <View style={styles.actionBtnIcon}>
            <Ionicons name="log-in-outline" size={20} color={DelivColors.white} />
          </View>
          <View style={styles.actionBtnContent}>
            <Text style={styles.primaryBtnTitle}>Start Daily Shift</Text>
            <Text style={styles.primaryBtnSub}>Check-in at depot & verify daily roster</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={DelivColors.white} />
        </TouchableOpacity>
      );
    }

    if (isShiftStarted && !hasInspectedToday && activeRun?.vehicle_id) {
      return (
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: '#0284C7' }]}
          onPress={() =>
            router.push({
              pathname: '/(driver)/inspection',
              params: {
                vehicleId: activeRun.vehicle_id,
                runId: activeRun.id,
              },
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.actionBtnIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={DelivColors.white} />
          </View>
          <View style={styles.actionBtnContent}>
            <Text style={styles.primaryBtnTitle}>Pre-Dispatch Inspection</Text>
            <Text style={styles.primaryBtnSub}>Complete vehicle roadworthiness & cold-chain checklist</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={DelivColors.white} />
        </TouchableOpacity>
      );
    }

    if (isShiftStarted && activeRun) {
      if (activeRun.status === 'ASSIGNED' || activeRun.status === 'READY') {
        return (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: DelivColors.deepEmerald }]}
            onPress={() =>
              router.push({
                pathname: '/(driver)/dispatch/[id]',
                params: { id: activeRun.id },
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.actionBtnIcon}>
              <Ionicons name="navigate-outline" size={20} color={DelivColors.white} />
            </View>
            <View style={styles.actionBtnContent}>
              <Text style={styles.primaryBtnTitle}>Start Assigned Route</Text>
              <Text style={styles.primaryBtnSub}>Review route stops & depart depot</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={DelivColors.white} />
          </TouchableOpacity>
        );
      }

      if (activeRun.status === 'IN_PROGRESS' || activeRun.status === 'IN_DELIVERY') {
        if (stopsDone) {
          return (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#7C3AED' }]}
              onPress={() =>
                router.push({
                  pathname: '/(driver)/reconciliation',
                  params: { runId: activeRun.id },
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.actionBtnIcon}>
                <Ionicons name="calculator-outline" size={20} color={DelivColors.white} />
              </View>
              <View style={styles.actionBtnContent}>
                <Text style={styles.primaryBtnTitle}>Complete Reconciliation</Text>
                <Text style={styles.primaryBtnSub}>Reconcile collected cash & returned crates</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={DelivColors.white} />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: DelivColors.emeraldGreen }]}
            onPress={() =>
              router.push({
                pathname: '/(driver)/dispatch/[id]',
                params: { id: activeRun.id },
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.actionBtnIcon}>
              <Ionicons name="play-outline" size={20} color={DelivColors.white} />
            </View>
            <View style={styles.actionBtnContent}>
              <Text style={styles.primaryBtnTitle}>Continue Delivery Run</Text>
              <Text style={styles.primaryBtnSub}>{remainingStops} shop stops pending drop-off</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={DelivColors.white} />
          </TouchableOpacity>
        );
      }
    }

    if (isShiftStarted && stopsDone) {
      return (
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: '#475569' }]}
          onPress={() => router.push('/(driver)/shift-end')}
          activeOpacity={0.85}
        >
          <View style={styles.actionBtnIcon}>
            <Ionicons name="flag-outline" size={20} color={DelivColors.white} />
          </View>
          <View style={styles.actionBtnContent}>
            <Text style={styles.primaryBtnTitle}>Finish Daily Shift</Text>
            <Text style={styles.primaryBtnSub}>Submit end-of-day handover & clock out</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={DelivColors.white} />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.standbyCard}>
        <Ionicons name="checkmark-circle-outline" size={24} color={DelivColors.emeraldGreen} />
        <Text style={styles.standbyTitle}>All Operations Completed</Text>
        <Text style={styles.standbySub}>No pending deliveries or dispatches requiring action.</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Fleet Driver Dashboard" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading driver operations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DriverHeader
        title="Fleet Logistics"
        subtitle={`Emp ID: ${user?.employee_id || user?.employeeId || 'EMP-DRV-1001'}`}
        shiftStatus={shiftState}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(true)}
            colors={[DelivColors.emeraldGreen]}
            tintColor={DelivColors.emeraldGreen}
          />
        }
      >
        {/* Offline Sync Banner if pending operations exist */}
        {pendingOps.length > 0 && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#B45309" />
            <View style={styles.offlineTextCol}>
              <Text style={styles.offlineTitle}>
                {pendingOps.length} Offline Actions Pending Sync
              </Text>
              <Text style={styles.offlineSub}>
                Operations captured offline will sync when connected.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={handleSyncQueue}
              disabled={syncingOffline}
            >
              {syncingOffline ? (
                <ActivityIndicator size="small" color={DelivColors.white} />
              ) : (
                <Text style={styles.syncBtnText}>Sync</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Driver Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityAvatar}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
            </Text>
          </View>
          <View style={styles.identityDetails}>
            <Text style={styles.driverName}>{user?.name || 'Driver'}</Text>
            <Text style={styles.driverMeta}>
              {user?.phone || 'Fleet Logistics Personnel'} • Pune Depot
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>AUTHORIZED DRIVER</Text>
              </View>
              {activeRun?.vehicle_registration && (
                <View style={styles.vehicleTag}>
                  <Text style={styles.vehicleTagText}>
                    🚛 {activeRun.vehicle_registration}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Primary Action CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.sectionHeading}>PRIMARY WORKFLOW ACTION</Text>
          {renderPrimaryAction()}
        </View>

        {/* Today's Operational Status Metrics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>TODAY'S OPERATIONS</Text>
          <Text style={styles.dateBadge}>
            {new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Total Stops"
            value={totalStops}
            subtitle={activeRun ? activeRun.run_code : 'No run assigned'}
            iconName="location-outline"
            variant="primary"
          />
          <MetricCard
            label="Completed"
            value={completedStops}
            subtitle={`${remainingStops} remaining`}
            iconName="checkmark-done-circle-outline"
            variant="emerald"
          />
        </View>

        <View style={[styles.metricsGrid, { marginTop: 10 }]}>
          <MetricCard
            label="Collections"
            value={formatCurrency(collectionSummary?.totalCollected || 0)}
            subtitle={`${collectionSummary?.totalReceiptsCount || 0} payments`}
            iconName="cash-outline"
            variant="amber"
          />
          <MetricCard
            label="Inspections"
            value={hasInspectedToday ? 'Passed' : 'Pending'}
            subtitle={hasInspectedToday ? 'Checklist valid' : 'Pre-check required'}
            iconName="shield-checkmark-outline"
            variant={hasInspectedToday ? 'emerald' : 'neutral'}
          />
        </View>

        {/* Active Dispatch Card */}
        {activeRun ? (
          <View style={styles.dispatchCard}>
            <View style={styles.dispatchHeader}>
              <View>
                <Text style={styles.dispatchCode}>{activeRun.run_code}</Text>
                <Text style={styles.routeName}>{activeRun.route_name || 'Assigned Route'}</Text>
              </View>
              <StatusBadge status={activeRun.status} size="medium" />
            </View>

            <View style={styles.divider} />

            <View style={styles.dispatchMetaRow}>
              <View style={styles.dispatchMetaItem}>
                <Ionicons name="bus-outline" size={16} color={DelivColors.textSecondary} />
                <Text style={styles.dispatchMetaText}>
                  {activeRun.vehicle_registration || 'Vehicle on file'}
                </Text>
              </View>
              <View style={styles.dispatchMetaItem}>
                <Ionicons name="time-outline" size={16} color={DelivColors.textSecondary} />
                <Text style={styles.dispatchMetaText}>
                  {activeRun.estimated_duration_minutes || 60} mins est.
                </Text>
              </View>
              <View style={styles.dispatchMetaItem}>
                <Ionicons name="cube-outline" size={16} color={DelivColors.textSecondary} />
                <Text style={styles.dispatchMetaText}>
                  {activeRun.capacity_crates || 60} crates max
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.openDispatchBtn}
              onPress={() =>
                router.push({
                  pathname: '/(driver)/dispatch/[id]',
                  params: { id: activeRun.id },
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.openDispatchBtnText}>Open Route Progression View</Text>
              <Ionicons name="chevron-forward" size={16} color={DelivColors.emeraldGreen} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyRunCard}>
            <Ionicons name="calendar-outline" size={32} color={DelivColors.textMuted} />
            <Text style={styles.emptyRunTitle}>No Dispatches Assigned Today</Text>
            <Text style={styles.emptyRunSub}>
              Contact your logistics dispatcher or depot coordinator to receive today's route assignment.
            </Text>
          </View>
        )}

        {/* Quick Operational Shortcuts */}
        <View style={styles.shortcutsSection}>
          <Text style={styles.sectionHeading}>OPERATIONAL ACTIONS</Text>

          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutItem}
              onPress={() => router.push('/(driver)/incident')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: DelivColors.errorBg }]}>
                <Ionicons name="warning-outline" size={20} color={DelivColors.error} />
              </View>
              <Text style={styles.shortcutLabel}>Report Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutItem}
              onPress={() => {
                if (activeRun?.vehicle_id) {
                  router.push({
                    pathname: '/(driver)/inspection',
                    params: { vehicleId: activeRun.vehicle_id, runId: activeRun.id },
                  });
                } else {
                  router.push('/(driver)/(tabs)/deliveries' as any);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: DelivColors.lightEmerald }]}>
                <Ionicons name="clipboard-outline" size={20} color={DelivColors.emeraldGreen} />
              </View>
              <Text style={styles.shortcutLabel}>Inspection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutItem}
              onPress={() => {
                if (activeRun) {
                  router.push({
                    pathname: '/(driver)/reconciliation',
                    params: { runId: activeRun.id },
                  });
                } else {
                  router.push('/(driver)/(tabs)/collections' as any);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: DelivColors.ivory }]}>
                <Ionicons name="receipt-outline" size={20} color="#92400E" />
              </View>
              <Text style={styles.shortcutLabel}>Reconciliation</Text>
            </TouchableOpacity>
          </View>
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
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 96,
    flexGrow: 1,
  },
  loadingContainer: {
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.ivory,
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  offlineTextCol: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  offlineSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  syncBtn: {
    backgroundColor: '#92400E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.white,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  identityAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: DelivColors.deepEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: DelivColors.white,
  },
  identityDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  driverMeta: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.4,
  },
  vehicleTag: {
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: DelivColors.deepEmerald,
  },
  ctaSection: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnContent: {
    flex: 1,
  },
  primaryBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DelivColors.white,
  },
  primaryBtnSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  standbyCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DelivColors.border,
    gap: 6,
  },
  standbyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.deepEmerald,
  },
  standbySub: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBadge: {
    fontSize: 11,
    color: DelivColors.textMuted,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  dispatchCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginTop: 18,
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dispatchCode: {
    fontSize: 16,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  routeName: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  dispatchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dispatchMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dispatchMetaText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    fontWeight: '500',
  },
  openDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DelivColors.lightEmerald,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  openDispatchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.emeraldGreen,
  },
  emptyRunCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginTop: 18,
    gap: 8,
  },
  emptyRunTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  emptyRunSub: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  shortcutsSection: {
    marginTop: 20,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutItem: {
    flex: 1,
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DelivColors.border,
    gap: 8,
  },
  shortcutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
});
