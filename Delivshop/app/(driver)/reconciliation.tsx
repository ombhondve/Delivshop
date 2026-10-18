import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DelivColors } from '@/constants/theme';
import { driverApi } from '@/services/api/driverApi';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { MetricCard } from '@/components/driver/MetricCard';
import { QuantityCounter } from '@/components/driver/QuantityCounter';
import { ConfirmModal } from '@/components/driver/ConfirmModal';
import { DeliveryRun, CollectionSummary } from '@/types/driver.types';
import { formatCurrency } from '@/utils/formatters';

export default function ReconciliationScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);

  // Reconciliation form values
  const [stopsPlanned, setStopsPlanned] = useState<number>(0);
  const [stopsCompleted, setStopsCompleted] = useState<number>(0);
  const [stopsFailed, setStopsFailed] = useState<number>(0);

  const [cratesDispatched, setCratesDispatched] = useState<number>(20);
  const [cratesDelivered, setCratesDelivered] = useState<number>(18);
  const [cratesReturned, setCratesReturned] = useState<number>(18);

  const [cashCollected, setCashCollected] = useState<string>('0');
  const [upiCollected, setUpiCollected] = useState<string>('0');
  const [amountDeposited, setAmountDeposited] = useState<string>('0');
  const [handoverNotes, setHandoverNotes] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Dispatches
      const dispatches = await driverApi.getAssignedDispatches();
      const currentRun =
        dispatches.find((r) =>
          ['ASSIGNED', 'READY', 'IN_PROGRESS', 'RECONCILIATION'].includes(r.status)
        ) || dispatches[0];

      if (currentRun) {
        setActiveRun(currentRun);
        setStopsPlanned(currentRun.planned_stops_count || currentRun.stops?.length || 0);
        setStopsCompleted(currentRun.completed_stops_count || 0);

        const stops = currentRun.stops || [];
        const failedCount = stops.filter((s) => s.status === 'FAILED' || s.status === 'SKIPPED').length;
        setStopsFailed(failedCount);

        const deliveredCrateSum = stops.reduce((sum, s) => sum + (s.delivered_crates_count || 0), 0);
        const returnedCrateSum = stops.reduce((sum, s) => sum + (s.returned_crates_count || 0), 0);
        if (deliveredCrateSum > 0) setCratesDelivered(deliveredCrateSum);
        if (returnedCrateSum > 0) setCratesReturned(returnedCrateSum);
        if (currentRun.capacity_crates) setCratesDispatched(currentRun.capacity_crates);
      }

      // 2. Fetch Collection Summary
      const summary = await driverApi.getCollectionSummary();
      setCollectionSummary(summary);
      if (summary) {
        setCashCollected(String(summary.cashCollected || 0));
        setUpiCollected(String(summary.upiCollected || 0));
        setAmountDeposited(String(summary.cashCollected || 0));
      }
    } catch (err: any) {
      console.warn('Reconciliation load warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const cashVal = parseFloat(cashCollected) || 0;
  const depositVal = parseFloat(amountDeposited) || 0;
  const cashDiscrepancy = depositVal - cashVal;
  const crateVariance = cratesDispatched - (cratesDelivered + (cratesDispatched - cratesDelivered));

  const handlePreSubmit = () => {
    if (!activeRun?.id) {
      Alert.alert('No Active Run', 'No delivery run was found to reconcile.');
      return;
    }
    setConfirmModalVisible(true);
  };

  const handleSubmitReconciliation = async () => {
    setConfirmModalVisible(false);
    setSubmitting(true);
    try {
      await driverApi.submitReconciliation({
        runId: activeRun!.id,
        totalStopsPlanned: stopsPlanned,
        totalStopsCompleted: stopsCompleted,
        totalStopsFailed: stopsFailed,
        totalCratesDispatched: cratesDispatched,
        totalCratesDelivered: cratesDelivered,
        totalCratesReturned: cratesReturned,
        totalCashExpected: cashVal,
        totalCashCollected: cashVal,
        totalUpiCollected: parseFloat(upiCollected) || 0,
        totalAmountDeposited: depositVal,
        notes: handoverNotes.trim() || undefined,
      });

      Alert.alert(
        'Reconciliation Verified',
        `End-of-day reconciliation successfully recorded in depot warehouse ledger.\n\nVariance: ${formatCurrency(cashDiscrepancy)}`,
        [
          {
            text: 'Proceed to Clock Out',
            onPress: () => router.replace('/(driver)/shift-end'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit reconciliation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="End-of-Day Reconciliation" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Compiling daily shift metrics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DriverHeader
        title="Shift Reconciliation"
        subtitle={activeRun?.run_code ? `Run #${activeRun.run_code}` : 'End-of-Day Handover'}
        showBack
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
        {/* Banner */}
        <View style={styles.bannerCard}>
          <Ionicons name="shield-checkmark" size={28} color={DelivColors.lightEmerald} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.bannerTitle}>Depot Settlement Checklist</Text>
            <Text style={styles.bannerSub}>
              Verify stop completions, crates handover, and cash balances before ending shift.
            </Text>
          </View>
        </View>

        {/* Section 1: Route Stops Progression */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate-circle-outline" size={20} color={DelivColors.emeraldGreen} />
            <Text style={styles.sectionTitle}>1. Route Deliveries Summary</Text>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard
              label="Planned Stops"
              value={stopsPlanned}
              iconName="flag"
              variant="neutral"
            />
            <MetricCard
              label="Completed"
              value={stopsCompleted}
              iconName="checkmark-circle"
              variant="emerald"
            />
            <MetricCard
              label="Exceptions"
              value={stopsFailed}
              iconName="alert-circle"
              variant="amber"
            />
          </View>
        </View>

        {/* Section 2: Crates Accountability */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube-outline" size={20} color={DelivColors.emeraldGreen} />
            <Text style={styles.sectionTitle}>2. Crate Handover & Returns</Text>
          </View>

          <View style={styles.counterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.counterTitle}>Dispatched Crates</Text>
              <Text style={styles.counterSub}>Total loaded from depot</Text>
            </View>
            <QuantityCounter
              value={cratesDispatched}
              min={0}
              max={200}
              onChange={setCratesDispatched}
            />
          </View>

          <View style={styles.counterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.counterTitle}>Delivered to Shops</Text>
              <Text style={styles.counterSub}>Handed over to merchants</Text>
            </View>
            <QuantityCounter
              value={cratesDelivered}
              min={0}
              max={200}
              onChange={setCratesDelivered}
            />
          </View>

          <View style={styles.counterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.counterTitle}>Empty Crates Returned</Text>
              <Text style={styles.counterSub}>Returning to depot inventory</Text>
            </View>
            <QuantityCounter
              value={cratesReturned}
              min={0}
              max={200}
              onChange={setCratesReturned}
            />
          </View>
        </View>

        {/* Section 3: Cash & Payment Settlement */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={20} color={DelivColors.emeraldGreen} />
            <Text style={styles.sectionTitle}>3. Cash & Payment Reconciliation</Text>
          </View>

          <View style={styles.balanceGrid}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Cash Collected</Text>
              <Text style={styles.balanceItemVal}>{formatCurrency(cashVal)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>UPI Collections</Text>
              <Text style={[styles.balanceItemVal, { color: DelivColors.emeraldGreen }]}>
                {formatCurrency(parseFloat(upiCollected) || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ACTUAL PHYSICAL CASH DEPOSITED AT DEPOT (₹) *</Text>
            <TextInput
              style={styles.textInputLarge}
              keyboardType="numeric"
              value={amountDeposited}
              onChangeText={setAmountDeposited}
              placeholder="0.00"
            />
          </View>

          {/* Discrepancy Alert */}
          {cashDiscrepancy !== 0 && (
            <View
              style={[
                styles.varianceCard,
                cashDiscrepancy < 0 ? styles.varianceCardShort : styles.varianceCardOver,
              ]}
            >
              <Ionicons
                name={cashDiscrepancy < 0 ? 'warning' : 'information-circle'}
                size={20}
                color={cashDiscrepancy < 0 ? DelivColors.error : '#0284C7'}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text
                  style={[
                    styles.varianceTitle,
                    { color: cashDiscrepancy < 0 ? DelivColors.error : '#0284C7' },
                  ]}
                >
                  {cashDiscrepancy < 0
                    ? `Cash Shortage: -${formatCurrency(Math.abs(cashDiscrepancy))}`
                    : `Cash Excess: +${formatCurrency(cashDiscrepancy)}`}
                </Text>
                <Text style={styles.varianceSub}>
                  {cashDiscrepancy < 0
                    ? 'Deposited amount is less than total cash collections recorded.'
                    : 'Deposited amount is greater than recorded cash collections.'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SETTLEMENT NOTES / REMARKS</Text>
            <TextInput
              style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="e.g. Returned 2 empty crates; depot cashier confirmed cash deposit"
              multiline
              value={handoverNotes}
              onChangeText={setHandoverNotes}
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handlePreSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={DelivColors.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle" size={22} color={DelivColors.white} />
              <Text style={styles.submitBtnText}>Submit Reconciliation Report</Text>
            </>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmModalVisible}
        title="Confirm Reconciliation"
        message={`Are you sure you want to finalize end-of-day reconciliation for Run #${
          activeRun?.run_code || ''
        }?\n\n• Completed Stops: ${stopsCompleted} / ${stopsPlanned}\n• Cash Deposited: ${formatCurrency(
          depositVal
        )}\n• Crates Handover: ${cratesReturned} returned`}
        confirmText="Confirm & Finalize"
        cancelText="Review"
        onConfirm={handleSubmitReconciliation}
        onCancel={() => setConfirmModalVisible(false)}
      />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: DelivColors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    gap: 14,
    flexGrow: 1,
  },
  bannerCard: {
    backgroundColor: DelivColors.deepEmerald,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.white,
  },
  bannerSub: {
    fontSize: 12,
    color: DelivColors.warmNeutral,
    marginTop: 3,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  counterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DelivColors.textPrimary,
  },
  counterSub: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceItemLabel: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    fontWeight: '600',
  },
  balanceItemVal: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.textPrimary,
    marginTop: 4,
  },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInputLarge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 22,
    fontWeight: '700',
    color: DelivColors.emeraldGreen,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: DelivColors.textPrimary,
  },
  varianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  varianceCardShort: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  varianceCardOver: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  varianceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  varianceSub: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  submitBtnText: {
    color: DelivColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
