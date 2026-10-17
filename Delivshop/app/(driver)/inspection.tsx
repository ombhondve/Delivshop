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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { AssignedVehicle } from '@/types/driver.types';

export default function VehicleInspectionScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string; runId?: string }>();
  const vehicleId = params.vehicleId || '';
  const runId = params.runId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null);

  // Inspection Checklist Items
  const [isTyresOk, setIsTyresOk] = useState(true);
  const [isLightsOk, setIsLightsOk] = useState(true);
  const [isBodyOk, setIsBodyOk] = useState(true);
  const [isRefrigerationOk, setIsRefrigerationOk] = useState(true);
  const [isSafetyKitOk, setIsSafetyKitOk] = useState(true);
  const [isDocsValid, setIsDocsValid] = useState(true);

  // Numerical parameters
  const [odometerKm, setOdometerKm] = useState('14250');
  const [fuelPercent, setFuelPercent] = useState('85');
  const [refrigerationTemp, setRefrigerationTemp] = useState('3.5');
  const [defectNotes, setDefectNotes] = useState('');

  useEffect(() => {
    async function loadVehicle() {
      if (!vehicleId) {
        setLoading(false);
        return;
      }
      try {
        const v = await driverApi.getVehicleDetails(vehicleId);
        setVehicle(v);
        if (v.current_odometer_km) {
          setOdometerKm(String(v.current_odometer_km));
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadVehicle();
  }, [vehicleId]);

  const allPassed =
    isTyresOk &&
    isLightsOk &&
    isBodyOk &&
    isRefrigerationOk &&
    isSafetyKitOk &&
    isDocsValid;

  const handleSubmit = async () => {
    const odo = parseInt(odometerKm, 10);
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Invalid Odometer', 'Please enter a valid vehicle odometer reading.');
      return;
    }

    const temp = parseFloat(refrigerationTemp);
    if (vehicle?.is_refrigerated && (isNaN(temp) || temp < -10 || temp > 15)) {
      Alert.alert(
        'Cold-Chain Temperature Alert',
        'Dairy cargo requires cold-chain chiller temperature between 0°C and 8°C. Please verify refrigeration reading.'
      );
      return;
    }

    if (!allPassed && !defectNotes.trim()) {
      Alert.alert(
        'Defect Notes Required',
        'One or more inspection items failed. You must provide detailed defect notes for the maintenance team.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await driverApi.submitVehicleInspection({
        vehicleId: vehicleId || vehicle?.id || '',
        runId,
        odometerKm: odo,
        fuelLevelPercent: parseInt(fuelPercent, 10) || 80,
        refrigerationTempC: isNaN(temp) ? undefined : temp,
        isTyresOk,
        isLightsOk,
        isBodyOk,
        isRefrigerationOk,
        isSafetyKitOk,
        isDocsValid,
        passed: allPassed,
        defectsReported: defectNotes.trim() || undefined,
      });

      if (!allPassed) {
        Alert.alert(
          'Vehicle Inspection Failed',
          `Inspection #${result.inspection_code} recorded. Vehicle flagged with reported defects. Please report immediately to the depot fleet manager before departing.`,
          [
            {
              text: 'Acknowledge',
              onPress: () => router.replace('/(driver)/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Pre-Dispatch Verified',
          `Vehicle ${vehicle?.registration_number || 'Asset'} passed all safety and roadworthiness checks. Cold-chain certified.`,
          [
            {
              text: 'Continue to Dispatches',
              onPress: () => router.replace('/(driver)/(tabs)'),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not record vehicle inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Pre-Dispatch Inspection" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading assigned vehicle specs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DriverHeader title="Vehicle Pre-Dispatch Checklist" showBack />

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
        {/* Vehicle Identity Box */}
        <View style={styles.vehicleHeaderCard}>
          <View style={styles.vehicleIconWrap}>
            <Ionicons name="bus-outline" size={26} color={DelivColors.deepEmerald} />
          </View>
          <View style={styles.vehicleInfoCol}>
            <Text style={styles.regNumber}>
              {vehicle?.registration_number || 'MH-12-DV-4421'}
            </Text>
            <Text style={styles.vehicleModel}>
              {vehicle?.make_model || 'Tata Ace Gold EV'} • {vehicle?.vehicle_type || 'Refrigerated Van'}
            </Text>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityText}>
                Payload: {vehicle?.capacity_crates || 80} Crates ({vehicle?.capacity_kg || 1500} kg)
              </Text>
            </View>
          </View>
        </View>

        {/* Temperature & Odometer Metrics */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>INSTRUMENT READINGS</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>ODOMETER (KM) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={odometerKm}
                onChangeText={setOdometerKm}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>FUEL / BATTERY (%)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={fuelPercent}
                onChangeText={setFuelPercent}
              />
            </View>
          </View>

          <View style={[styles.inputRow, { marginTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CARGO CHILLER TEMP (°C) *</Text>
              <View style={styles.tempInputRow}>
                <Ionicons name="snow-outline" size={18} color="#0284C7" />
                <TextInput
                  style={styles.tempInput}
                  keyboardType="numeric"
                  value={refrigerationTemp}
                  onChangeText={setRefrigerationTemp}
                />
                <Text style={styles.tempUnit}>°C (Target: 2°C - 4°C)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Safety & Roadworthiness Checklist */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeading}>ROADWORTHINESS & COMPLIANCE CHECKS</Text>

          <View style={styles.checkItem}>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkTitle}>Tyres & Wheel Nuts</Text>
              <Text style={styles.checkDesc}>Tread depth adequate, pressure normal, no visible bulging</Text>
            </View>
            <Switch
              value={isTyresOk}
              onValueChange={setIsTyresOk}
              trackColor={{ false: '#FECACA', true: DelivColors.lightEmerald }}
              thumbColor={isTyresOk ? DelivColors.emeraldGreen : DelivColors.error}
            />
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkTitle}>Headlamps, Indicators & Brake Lights</Text>
              <Text style={styles.checkDesc}>All front and rear lights functioning properly</Text>
            </View>
            <Switch
              value={isLightsOk}
              onValueChange={setIsLightsOk}
              trackColor={{ false: '#FECACA', true: DelivColors.lightEmerald }}
              thumbColor={isLightsOk ? DelivColors.emeraldGreen : DelivColors.error}
            />
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkTitle}>Cargo Body & Door Latches</Text>
              <Text style={styles.checkDesc}>Cargo bay seals tight, rear doors lock securely</Text>
            </View>
            <Switch
              value={isBodyOk}
              onValueChange={setIsBodyOk}
              trackColor={{ false: '#FECACA', true: DelivColors.lightEmerald }}
              thumbColor={isBodyOk ? DelivColors.emeraldGreen : DelivColors.error}
            />
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkTitle}>Refrigeration Unit & Temperature Data-Logger</Text>
              <Text style={styles.checkDesc}>Compressor cooling active, sensor responding</Text>
            </View>
            <Switch
              value={isRefrigerationOk}
              onValueChange={setIsRefrigerationOk}
              trackColor={{ false: '#FECACA', true: DelivColors.lightEmerald }}
              thumbColor={isRefrigerationOk ? DelivColors.emeraldGreen : DelivColors.error}
            />
          </View>

          <View style={styles.checkItem}>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkTitle}>Emergency Safety Kit</Text>
              <Text style={styles.checkDesc}>Fire extinguisher charged, first aid kit, warning triangle</Text>
            </View>
            <Switch
              value={isSafetyKitOk}
              onValueChange={setIsSafetyKitOk}
              trackColor={{ false: '#FECACA', true: DelivColors.lightEmerald }}
              thumbColor={isSafetyKitOk ? DelivColors.emeraldGreen : DelivColors.error}
            />
          </View>

          <View style={[styles.checkItem, { borderBottomWidth: 0 }]}>
            <View style={styles.checkTextWrap}>
              <Text style={styles.checkTitle}>Physical Vehicle Documents</Text>
              <Text style={styles.checkDesc}>RC card, Insurance certificate & valid PUC onboard</Text>
            </View>
            <Switch
              value={isDocsValid}
              onValueChange={setIsDocsValid}
              trackColor={{ false: '#FECACA', true: DelivColors.lightEmerald }}
              thumbColor={isDocsValid ? DelivColors.emeraldGreen : DelivColors.error}
            />
          </View>
        </View>

        {/* Defect Reporting */}
        {!allPassed && (
          <View style={[styles.sectionCard, { borderColor: '#FECACA', backgroundColor: '#FFFDFD' }]}>
            <View style={styles.defectHeader}>
              <Ionicons name="warning-outline" size={18} color={DelivColors.error} />
              <Text style={styles.defectTitle}>DEFECT DETAILS & CONCERNS *</Text>
            </View>
            <TextInput
              style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
              placeholder="Describe the failed item or maintenance concern in detail..."
              placeholderTextColor={DelivColors.textMuted}
              multiline
              numberOfLines={3}
              value={defectNotes}
              onChangeText={setDefectNotes}
            />
          </View>
        )}

        {/* Submit Checklist */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            !allPassed && styles.submitBtnWarning,
            submitting && styles.btnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={DelivColors.white} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              {allPassed
                ? 'Sign & Verify Pre-Dispatch Readiness'
                : 'Submit Inspection with Reported Defects'}
            </Text>
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
  vehicleHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 14,
  },
  vehicleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: DelivColors.lightEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleInfoCol: {
    flex: 1,
  },
  regNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  vehicleModel: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  capacityRow: {
    marginTop: 4,
  },
  capacityText: {
    fontSize: 11,
    color: DelivColors.emeraldGreen,
    fontWeight: '700',
  },
  sectionCard: {
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
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DelivColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DelivColors.textPrimary,
  },
  tempInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  tempInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369A1',
    minWidth: 50,
  },
  tempUnit: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  checkTextWrap: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  checkDesc: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  defectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  defectTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DelivColors.error,
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
  submitBtnWarning: {
    backgroundColor: '#D97706',
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
