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
import { StatusBadge } from '@/components/driver/StatusBadge';
import { ConfirmModal } from '@/components/driver/ConfirmModal';
import {
  IncidentCategory,
  IncidentSeverity,
  DriverIncident,
  DeliveryRun,
} from '@/types/driver.types';

const CATEGORIES: { label: string; value: IncidentCategory; icon: any }[] = [
  { label: 'Shop Closed / Merchant Away', value: 'SHOP_CLOSED', icon: 'storefront-outline' },
  { label: 'Delivery Refused by Merchant', value: 'DELIVERY_REFUSED', icon: 'close-circle-outline' },
  { label: 'Partial Delivery / Stock Shortage', value: 'PARTIAL_DELIVERY', icon: 'cube-outline' },
  { label: 'Damaged / Spoiled Products', value: 'DAMAGED_PRODUCTS', icon: 'alert-circle-outline' },
  { label: 'Missing / Discrepant Stock', value: 'MISSING_STOCK', icon: 'search-outline' },
  { label: 'Vehicle Breakdown / Puncture', value: 'VEHICLE_BREAKDOWN', icon: 'construct-outline' },
  { label: 'Road Obstruction / Traffic Delay', value: 'ROUTE_OBSTRUCTION', icon: 'warning-outline' },
  { label: 'Payment Discrepancy', value: 'PAYMENT_DISCREPANCY', icon: 'cash-outline' },
  { label: 'Safety / Accident Incident', value: 'SAFETY_INCIDENT', icon: 'shield-outline' },
  { label: 'Other Operational Issue', value: 'OTHER', icon: 'help-circle-outline' },
];

const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function IncidentReportingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'REPORT' | 'HISTORY'>('REPORT');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Form states
  const [category, setCategory] = useState<IncidentCategory>('SHOP_CLOSED');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceAttached, setEvidenceAttached] = useState(false);

  // Contextual data
  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [reportedIncidents, setReportedIncidents] = useState<DriverIncident[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const dispatches = await driverApi.getAssignedDispatches();
      if (dispatches && dispatches.length > 0) {
        setActiveRun(dispatches[0]);
      }
      const history = await driverApi.getReportedIncidents();
      setReportedIncidents(history);
    } catch (err: any) {
      console.warn('Incident load notice:', err.message);
    }
  };

  const handlePreSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a summary title for the incident.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please provide detailed operational notes describing the situation.');
      return;
    }
    setConfirmModalVisible(true);
  };

  const handleSubmitIncident = async () => {
    setConfirmModalVisible(false);
    setSubmitting(true);
    try {
      const res = await driverApi.reportIncident({
        category,
        severity,
        title: title.trim(),
        description: description.trim(),
        runId: activeRun?.id,
        vehicleId: activeRun?.vehicle_id,
        evidenceUrl: evidenceAttached ? 'evidence://driver-incident-photo' : undefined,
      });

      Alert.alert(
        'Incident Logged',
        `Incident ${res.incident_number} has been recorded and escalated to the dispatch operations team.`,
        [
          {
            text: 'View Log',
            onPress: () => {
              setTitle('');
              setDescription('');
              setActiveTab('HISTORY');
              loadInitialData();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Report Error', err.message || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DriverHeader
        title="Incident & Exceptions"
        subtitle="Operational Escalations"
        showBack
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'REPORT' && styles.tabBtnActive]}
          onPress={() => setActiveTab('REPORT')}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={activeTab === 'REPORT' ? DelivColors.emeraldGreen : DelivColors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeTab === 'REPORT' && styles.tabBtnTextActive]}>
            Report Issue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeTab === 'HISTORY' ? DelivColors.emeraldGreen : DelivColors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeTab === 'HISTORY' && styles.tabBtnTextActive]}>
            Recent Logs ({reportedIncidents.length})
          </Text>
        </TouchableOpacity>
      </View>

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
        {activeTab === 'REPORT' ? (
          <View style={styles.formCard}>
            {/* Banner */}
            <View style={styles.bannerRow}>
              <Ionicons name="information-circle" size={20} color="#B45309" />
              <Text style={styles.bannerText}>
                Use this form to document route roadblocks, shop refusals, damage, or breakdowns.
                All logs are audited in real time.
              </Text>
            </View>

            {/* Category Grid */}
            <Text style={styles.inputLabel}>INCIDENT CATEGORY *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={20}
                      color={isSelected ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                    />
                    <Text
                      style={[styles.categoryText, isSelected && styles.categoryTextSelected]}
                      numberOfLines={2}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Picker */}
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>SEVERITY LEVEL *</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((sev) => {
                const isSelected = severity === sev;
                const color =
                  sev === 'CRITICAL'
                    ? DelivColors.error
                    : sev === 'HIGH'
                    ? '#EA580C'
                    : sev === 'MEDIUM'
                    ? DelivColors.warning
                    : DelivColors.emeraldGreen;
                return (
                  <TouchableOpacity
                    key={sev}
                    style={[
                      styles.severityPill,
                      isSelected && { backgroundColor: color, borderColor: color },
                    ]}
                    onPress={() => setSeverity(sev)}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        isSelected && { color: DelivColors.white, fontWeight: '700' },
                      ]}
                    >
                      {sev}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>INCIDENT TITLE / SUBJECT *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Shop shutter closed; merchant not reachable"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Detailed Description */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>DETAILED DESCRIPTION & NOTES *</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Provide specific details (timings, location landmark, conversation with merchant, etc.)"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Evidence Photo Toggle */}
            <TouchableOpacity
              style={[styles.evidenceToggle, evidenceAttached && styles.evidenceToggleActive]}
              onPress={() => setEvidenceAttached(!evidenceAttached)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={evidenceAttached ? 'camera' : 'camera-outline'}
                size={22}
                color={evidenceAttached ? DelivColors.emeraldGreen : DelivColors.textSecondary}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.evidenceTitle}>Attach Photographic Evidence</Text>
                <Text style={styles.evidenceSub}>
                  {evidenceAttached
                    ? '✓ Photo documented and attached to incident record'
                    : 'Tap to mark on-scene photo captured'}
                </Text>
              </View>
              <Ionicons
                name={evidenceAttached ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={evidenceAttached ? DelivColors.emeraldGreen : DelivColors.textMuted}
              />
            </TouchableOpacity>

            {/* Submit Button */}
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
                  <Ionicons name="alert-circle" size={20} color={DelivColors.white} />
                  <Text style={styles.submitBtnText}>Submit Incident Escalation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {reportedIncidents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={48} color={DelivColors.emeraldGreen} />
                <Text style={styles.emptyTitle}>No Incidents Reported</Text>
                <Text style={styles.emptySub}>
                  No delivery exceptions or operational incidents recorded for your profile today.
                </Text>
              </View>
            ) : (
              reportedIncidents.map((inc) => (
                <View key={inc.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyNumber}>{inc.incident_number}</Text>
                      <Text style={styles.historyTitle}>{inc.title}</Text>
                    </View>
                    <StatusBadge status={inc.status} size="small" />
                  </View>

                  <Text style={styles.historyDesc}>{inc.description}</Text>

                  <View style={styles.historyMetaRow}>
                    <View style={styles.metaPill}>
                      <Ionicons name="pricetag-outline" size={12} color={DelivColors.textSecondary} />
                      <Text style={styles.metaPillText}>{inc.category}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons name="time-outline" size={12} color={DelivColors.textSecondary} />
                      <Text style={styles.metaPillText}>
                        {new Date(inc.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.severityTag,
                        {
                          color:
                            inc.severity === 'CRITICAL'
                              ? DelivColors.error
                              : inc.severity === 'HIGH'
                              ? '#EA580C'
                              : DelivColors.warning,
                        },
                      ]}
                    >
                      {inc.severity}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmModalVisible}
        title="Submit Incident Report"
        message={`Are you sure you want to log this ${severity} incident?\n\n• Category: ${category}\n• Subject: "${title}"\n\nThis will alert the dispatcher operations desk immediately.`}
        confirmText="Confirm Submission"
        cancelText="Review"
        confirmColor={severity === 'CRITICAL' ? DelivColors.error : DelivColors.emeraldGreen}
        onConfirm={handleSubmitIncident}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: DelivColors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: DelivColors.lightEmerald,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: DelivColors.textSecondary,
  },
  tabBtnTextActive: {
    color: DelivColors.deepEmerald,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    flexGrow: 1,
  },
  formCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerRow: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCardSelected: {
    backgroundColor: DelivColors.lightEmerald,
    borderColor: DelivColors.emeraldGreen,
  },
  categoryText: {
    fontSize: 11,
    color: DelivColors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  categoryTextSelected: {
    color: DelivColors.deepEmerald,
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.textSecondary,
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
  evidenceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  evidenceToggleActive: {
    backgroundColor: DelivColors.lightEmerald,
    borderColor: DelivColors.emeraldGreen,
  },
  evidenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  evidenceSub: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  submitBtnText: {
    color: DelivColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
    marginTop: 2,
  },
  historyDesc: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    lineHeight: 18,
    marginVertical: 6,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    fontWeight: '500',
  },
  severityTag: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DelivColors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
