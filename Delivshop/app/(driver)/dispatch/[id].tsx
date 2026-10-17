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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { StatusBadge } from '@/components/driver/StatusBadge';
import { StopCard } from '@/components/driver/StopCard';
import { DeliveryRun, DeliveryRunStop } from '@/types/driver.types';

export default function DispatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dispatch, setDispatch] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Skip/Fail Stop Modal State
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [selectedStop, setSelectedStop] = useState<DeliveryRunStop | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipNotes, setSkipNotes] = useState('');
  const [skippingStop, setSkippingStop] = useState(false);

  const fetchDispatch = async (isManual = false) => {
    if (!id) return;
    if (isManual) setRefreshing(true);
    try {
      const data = await driverApi.getDispatchDetails(id);
      setDispatch(data);
    } catch (err: any) {
      Alert.alert('Dispatch Error', err.message || 'Could not load dispatch details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDispatch();
    }, [id])
  );

  const handleStartRun = async () => {
    if (!dispatch) return;
    setTransitioning(true);
    try {
      const updated = await driverApi.updateDispatchStatus(dispatch.id, 'IN_PROGRESS', 'Driver departed depot');
      setDispatch(updated);
      Alert.alert('Route Departed', 'Delivery run is now in progress. Follow the sequenced stops.');
    } catch (err: any) {
      Alert.alert('Transition Error', err.message || 'Could not update dispatch status.');
    } finally {
      setTransitioning(false);
    }
  };

  const handleStopPress = (stop: DeliveryRunStop) => {
    // If stop is pending or arrived, open options or navigate
    if (stop.status === 'DELIVERED') {
      Alert.alert(
        'Stop Already Completed',
        `Stop #${stop.stop_sequence} (${stop.shop_name}) was successfully delivered. ${stop.delivered_crates_count || 0} crates delivered.`
      );
      return;
    }

    Alert.alert(
      `Stop #${stop.stop_sequence}: ${stop.shop_name}`,
      `${stop.shop_address}\n\nSelect operational action:`,
      [
        {
          text: 'Shop Delivery Workflow',
          onPress: () => {
            // Find if matching delivery exists or navigate to delivery
            router.push({
              pathname: '/(driver)/delivery/[id]',
              params: { id: stop.shop_id, stopSequence: String(stop.stop_sequence), runId: dispatch?.id },
            });
          },
        },
        {
          text: 'Skip / Fail Stop',
          style: 'destructive',
          onPress: () => {
            setSelectedStop(stop);
            setSkipReason('Shop closed / access blocked');
            setSkipNotes('');
            setSkipModalVisible(true);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleConfirmSkipStop = async () => {
    if (!dispatch || !selectedStop) return;
    if (!skipReason.trim()) {
      Alert.alert('Reason Required', 'Please select or enter the operational reason for skipping this stop.');
      return;
    }

    setSkippingStop(true);
    try {
      await driverApi.updateStopStatus(dispatch.id, selectedStop.stop_sequence, {
        status: 'SKIPPED',
        failureReason: skipReason,
        notes: skipNotes.trim() || undefined,
      });

      Alert.alert('Stop Updated', `Stop #${selectedStop.stop_sequence} marked as SKIPPED.`);
      setSkipModalVisible(false);
      await fetchDispatch();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update stop status.');
    } finally {
      setSkippingStop(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Dispatch Progression" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading route stops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dispatch) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Dispatch Run" showBack />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={DelivColors.error} />
          <Text style={styles.emptyTitle}>Dispatch Record Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stops = dispatch.stops || [];
  const totalStops = stops.length;
  const completedStops = stops.filter((s) => s.status === 'DELIVERED').length;
  const skippedStops = stops.filter((s) => s.status === 'FAILED' || s.status === 'SKIPPED').length;
  const remainingStops = totalStops - completedStops - skippedStops;

  // Find next stop in sequence
  const nextStop = stops.find((s) => s.status === 'PENDING' || s.status === 'ARRIVED');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DriverHeader
        title={dispatch.run_code}
        subtitle={dispatch.route_name || 'Assigned Route'}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDispatch(true)}
            colors={[DelivColors.emeraldGreen]}
            tintColor={DelivColors.emeraldGreen}
          />
        }
      >
        {/* Dispatch Status Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.runCodeText}>{dispatch.run_code}</Text>
              <Text style={styles.routeCityText}>
                {dispatch.route_city || 'Pune'} Depot • {dispatch.delivery_date}
              </Text>
            </View>
            <StatusBadge status={dispatch.status} size="medium" />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Route Progression</Text>
              <Text style={styles.progressPercent}>
                {totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0}% Completed
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{totalStops}</Text>
              <Text style={styles.statLabel}>Planned</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: DelivColors.emeraldGreen }]}>
                {completedStops}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: '#0284C7' }]}>{remainingStops}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: DelivColors.error }]}>{skippedStops}</Text>
              <Text style={styles.statLabel}>Exceptions</Text>
            </View>
          </View>

          {/* Start Route Action Button (if not already started) */}
          {(dispatch.status === 'ASSIGNED' || dispatch.status === 'READY') && (
            <TouchableOpacity
              style={[styles.startRunBtn, transitioning && styles.btnDisabled]}
              onPress={handleStartRun}
              disabled={transitioning}
              activeOpacity={0.85}
            >
              {transitioning ? (
                <ActivityIndicator color={DelivColors.white} size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="play" size={18} color={DelivColors.white} />
                  <Text style={styles.startRunBtnText}>Depart Depot & Start Route</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Complete Run / Reconciliation Button (if all stops done) */}
          {dispatch.status === 'IN_PROGRESS' && remainingStops === 0 && (
            <TouchableOpacity
              style={styles.reconcileBtn}
              onPress={() =>
                router.push({
                  pathname: '/(driver)/reconciliation',
                  params: { runId: dispatch.id },
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons name="calculator-outline" size={18} color={DelivColors.white} />
              <Text style={styles.reconcileBtnText}>All Stops Complete • Open Reconciliation</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Assigned Vehicle Card */}
        <View style={styles.vehicleCard}>
          <Ionicons name="bus-outline" size={20} color={DelivColors.deepEmerald} />
          <View style={styles.vehicleTextCol}>
            <Text style={styles.vehicleTitle}>
              {dispatch.vehicle_registration || 'Vehicle On File'} • {dispatch.vehicle_type || 'Refrigerated Van'}
            </Text>
            <Text style={styles.vehicleSub}>
              Payload: {dispatch.capacity_crates || 60} crates • Cold-chain data logger active
            </Text>
          </View>
        </View>

        {/* Sequenced Route Stops List */}
        <View style={styles.stopsHeader}>
          <Text style={styles.stopsHeading}>SEQUENCED ROUTE STOPS</Text>
          <Text style={styles.stopsCount}>{totalStops} store locations</Text>
        </View>

        {stops.map((stop) => (
          <StopCard
            key={stop.id}
            stop={stop}
            isNext={nextStop?.id === stop.id}
            onPress={() => handleStopPress(stop)}
          />
        ))}
      </ScrollView>

      {/* Skip / Fail Stop Modal */}
      <Modal
        visible={skipModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSkipModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Stop Exception</Text>
              <TouchableOpacity onPress={() => setSkipModalVisible(false)}>
                <Ionicons name="close" size={24} color={DelivColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSub}>
                Stop #{selectedStop?.stop_sequence}: {selectedStop?.shop_name}
              </Text>

              <Text style={styles.inputLabel}>REASON FOR SKIPPING *</Text>
              {[
                'Shop closed / merchant unavailable',
                'Road access blocked / construction',
                'Customer refused delivery',
                'Incorrect address on file',
                'Vehicle mechanical breakdown',
                'Safety / environmental hazard',
              ].map((reason) => {
                const isSelected = skipReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSkipReason(reason)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.inputLabel}>ADDITIONAL REMARKS</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Details of attempt to contact shopkeeper..."
                placeholderTextColor={DelivColors.textMuted}
                value={skipNotes}
                onChangeText={setSkipNotes}
              />

              <TouchableOpacity
                style={[styles.confirmSkipBtn, skippingStop && styles.btnDisabled]}
                onPress={handleConfirmSkipStop}
                disabled={skippingStop}
                activeOpacity={0.85}
              >
                {skippingStop ? (
                  <ActivityIndicator color={DelivColors.white} size="small" />
                ) : (
                  <Text style={styles.confirmSkipBtnText}>Record Audit Exception & Skip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  headerCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  runCodeText: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  routeCityText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  progressSection: {
    marginTop: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    color: DelivColors.emeraldGreen,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DelivColors.emeraldGreen,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DelivColors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  startRunBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startRunBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.white,
  },
  reconcileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
  },
  reconcileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.lightEmerald,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  vehicleTextCol: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  vehicleSub: {
    fontSize: 11,
    color: DelivColors.emeraldGreen,
    marginTop: 2,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stopsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.8,
  },
  stopsCount: {
    fontSize: 12,
    color: DelivColors.textMuted,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DelivColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  modalBody: {
    gap: 10,
  },
  modalSub: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.5,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 10,
  },
  reasonOptionSelected: {
    backgroundColor: DelivColors.lightEmerald,
  },
  reasonOptionText: {
    fontSize: 13,
    color: DelivColors.textPrimary,
  },
  reasonOptionTextSelected: {
    fontWeight: '700',
    color: DelivColors.deepEmerald,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DelivColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: DelivColors.textPrimary,
  },
  confirmSkipBtn: {
    backgroundColor: DelivColors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmSkipBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.white,
  },
});
