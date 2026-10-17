import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { DeliveryRun, CollectionSummary } from '@/types/driver.types';

export default function ShiftEndScreen() {
  const { user } = useAuth();
  const driverId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [colSummary, setColSummary] = useState<CollectionSummary | null>(null);
  const [notes, setNotes] = useState('All depot drop-offs finished. Empty crates returned to bay.');
  const [finalOdometer, setFinalOdometer] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!driverId) return;
      try {
        const [dispatches, sum] = await Promise.all([
          driverApi.getAssignedDispatches(),
          driverApi.getCollectionSummary().catch(() => null),
        ]);
        const run = dispatches.find((r) => r.status !== 'CANCELLED') || dispatches[0] || null;
        setActiveRun(run);
        setColSummary(sum);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [driverId]);

  const handleEndShift = async () => {
    setSubmitting(true);
    try {
      await driverApi.endShift(driverId, {
        notes: finalOdometer
          ? `${notes} | Final Odometer: ${finalOdometer} km`
          : notes,
      });

      Alert.alert(
        'Shift Concluded',
        'Your daily attendance check-out has been recorded. Thank you for ensuring fresh dairy delivery!',
        [
          {
            text: 'Return to Dashboard',
            onPress: () => router.replace('/(driver)/(tabs)'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Shift Closure Error', err.message || 'Could not conclude daily shift.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Complete Daily Shift" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Verifying shift closure status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const planned = activeRun?.planned_stops_count || 0;
  const completed = activeRun?.completed_stops_count || 0;
  const remaining = Math.max(0, planned - completed);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DriverHeader title="Complete Daily Shift" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="flag-outline" size={24} color={DelivColors.deepEmerald} />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Daily Shift Checkout</Text>
            <Text style={styles.bannerSub}>Depot Handover & Attendance Sign-off</Text>
          </View>
        </View>

        {/* Warning if remaining stops */}
        {remaining > 0 && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle-outline" size={20} color={DelivColors.warning} />
            <Text style={styles.warningText}>
              Notice: You have {remaining} stop(s) marked pending. Ensure all delivery exceptions are documented before concluding duty.
            </Text>
          </View>
        )}

        {/* Shift Summary Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>DAILY OPERATIONAL SUMMARY</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dispatched Run</Text>
            <Text style={styles.infoValueBold}>{activeRun?.run_code || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Stops Completed</Text>
            <Text style={styles.infoValueBold}>
              {completed} of {planned} stores
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Cash / UPI Handover</Text>
            <Text style={[styles.infoValueBold, { color: DelivColors.emeraldGreen }]}>
              ₹{(colSummary?.totalCollected || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Vehicle Asset</Text>
            <Text style={styles.infoValueBold}>
              {activeRun?.vehicle_registration || 'Fleet Vehicle'}
            </Text>
          </View>
        </View>

        {/* Vehicle Handover Odometer */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>FINAL VEHICLE ODOMETER (KM)</Text>
          <TextInput
            style={styles.inputField}
            placeholder="e.g. 14285"
            placeholderTextColor={DelivColors.textMuted}
            keyboardType="numeric"
            value={finalOdometer}
            onChangeText={setFinalOdometer}
          />
        </View>

        {/* Handover Remarks */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>DEPOT HANDOVER REMARKS</Text>
          <TextInput
            style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]}
            placeholder="Handover notes, crate returns, depot bay inspection notes..."
            placeholderTextColor={DelivColors.textMuted}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleEndShift}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={DelivColors.white} size="small" />
          ) : (
            <View style={styles.btnRow}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={DelivColors.white} />
              <Text style={styles.submitBtnText}>Submit Handover & Clock Out</Text>
            </View>
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
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.ivory,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: 12,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(146, 64, 14, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  bannerSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: DelivColors.error,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: DelivColors.textSecondary,
  },
  infoValueBold: {
    fontSize: 13,
    color: DelivColors.deepEmerald,
    fontWeight: '800',
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DelivColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DelivColors.textPrimary,
  },
  submitBtn: {
    backgroundColor: '#475569',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
