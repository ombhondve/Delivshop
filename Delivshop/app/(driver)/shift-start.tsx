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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { DeliveryRun } from '@/types/driver.types';
import * as Location from 'expo-location';

export default function ShiftStartScreen() {
  const { user } = useAuth();
  const driverId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [notes, setNotes] = useState('Reported for Shift');
  const [readyCheck, setReadyCheck] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!driverId) return;
      try {
        const dispatches = await driverApi.getAssignedDispatches();
        const run = dispatches.find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED') || dispatches[0] || null;
        setActiveRun(run);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [driverId]);

  const handleStartShift = async () => {
    if (!readyCheck) {
      Alert.alert('Readiness Required', 'Please confirm your fitness for duty and valid documentation.');
      return;
    }

    setSubmitting(true);
    setGpsStatus('Requesting GPS location...');

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'GPS Permission Required',
            'Shift check-in requires location verification to prevent fraudulent attendance. Please grant location permissions.',
            [{ text: 'OK' }]
          );
          setSubmitting(false);
          setGpsStatus(null);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (locErr: any) {
        console.warn('GPS location reading warning:', locErr.message);
        Alert.alert(
          'Location Reading Failed',
          'Could not retrieve fresh GPS location. Please check your device GPS toggle and retry.',
          [{ text: 'Retry', onPress: () => handleStartShift() }, { text: 'Cancel', style: 'cancel' }]
        );
        setSubmitting(false);
        setGpsStatus(null);
        return;
      }

      setGpsStatus('Logging attendance check-in...');
      await driverApi.startShift(driverId, {
        latitude,
        longitude,
        notes: notes ? `${notes} (GPS: ${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})` : undefined,
      });

      Alert.alert(
        'Shift Started',
        `Your attendance has been verified and recorded with GPS coordinates (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}).`,
        [
          {
            text: 'Proceed to Inspection',
            onPress: () => {
              if (activeRun?.vehicle_id) {
                router.replace({
                  pathname: '/(driver)/inspection',
                  params: {
                    vehicleId: activeRun.vehicle_id,
                    runId: activeRun.id,
                  },
                });
              } else {
                router.replace('/(driver)/(tabs)');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Shift Check-in Error', err.message || 'Could not record shift attendance check-in.');
    } finally {
      setSubmitting(false);
      setGpsStatus(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Daily Shift Check-In" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading assigned shift parameters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DriverHeader title="Start Daily Shift" showBack />

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
          <View style={styles.bannerIconWrap}>
            <Ionicons name="time-outline" size={24} color={DelivColors.deepEmerald} />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Shift Attendance Check-In</Text>
            <Text style={styles.bannerSub}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Assigned Shift Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>ASSIGNED ROSTER PARAMETERS</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver Personnel</Text>
            <Text style={styles.infoValueBold}>{user?.name || 'Driver'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>{user?.employee_id || user?.employeeId || 'EMP-DRV-1001'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reporting Location</Text>
            <Text style={styles.infoValue}>Pune Logistics Hub</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Run</Text>
            <Text style={styles.infoValueBold}>{activeRun?.run_code || 'Pending Pairing'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Route</Text>
            <Text style={styles.infoValue}>{activeRun?.route_name || 'Route 1 • Central & Camp Area'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Assigned Vehicle</Text>
            <Text style={styles.infoValueBold}>
              {activeRun?.vehicle_registration || 'Vehicle paired on inspection'}
            </Text>
          </View>
        </View>

        {/* Readiness Checklist */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>PRE-SHIFT READINESS CONFIRMATION</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setReadyCheck(!readyCheck)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={readyCheck ? 'checkbox' : 'square-outline'}
              size={22}
              color={readyCheck ? DelivColors.emeraldGreen : DelivColors.textSecondary}
            />
            <Text style={styles.checkboxLabel}>
              I confirm I am physically fit for transport duties, possess a valid physical driving licence, and will maintain cold-chain handling protocols throughout this shift.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attendance Remarks */}
        <View style={styles.infoCard}>
          <Text style={styles.cardHeading}>CHECK-IN NOTES</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Shift check-in remarks..."
            placeholderTextColor={DelivColors.textMuted}
          />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleStartShift}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={DelivColors.white} size="small" />
          ) : (
            <View style={styles.btnRow}>
              <Ionicons name="finger-print-outline" size={20} color={DelivColors.white} />
              <Text style={styles.submitBtnText}>Confirm Attendance & Start Shift</Text>
            </View>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 50,
    flexGrow: 1,
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
    backgroundColor: DelivColors.lightEmerald,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 78, 59, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  bannerSub: {
    fontSize: 12,
    color: DelivColors.emeraldGreen,
    fontWeight: '600',
    marginTop: 2,
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
  infoValue: {
    fontSize: 13,
    color: DelivColors.textPrimary,
    fontWeight: '600',
  },
  infoValueBold: {
    fontSize: 13,
    color: DelivColors.deepEmerald,
    fontWeight: '800',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: DelivColors.textPrimary,
    lineHeight: 19,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DelivColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: DelivColors.textPrimary,
  },
  submitBtn: {
    backgroundColor: DelivColors.emeraldGreen,
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
