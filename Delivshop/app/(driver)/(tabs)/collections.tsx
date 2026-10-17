import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { StatusBadge } from '@/components/driver/StatusBadge';
import { MetricCard } from '@/components/driver/MetricCard';
import { DeliveryCollection, CollectionSummary, PaymentMethod, DeliveryRun } from '@/types/driver.types';

export default function DriverCollectionsScreen() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<DeliveryCollection[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [activeRun, setActiveRun] = useState<DeliveryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Collection Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedShopName, setSelectedShopName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [referenceInput, setReferenceInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [cols, sum, runs] = await Promise.all([
        driverApi.getCollections().catch(() => []),
        driverApi.getCollectionSummary().catch(() => null),
        driverApi.getAssignedDispatches().catch(() => []),
      ]);
      setCollections(Array.isArray(cols) ? cols : []);
      setSummary(sum);

      const eligible = runs.find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED') || runs[0] || null;
      setActiveRun(eligible);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id])
  );

  const handleOpenRecordModal = () => {
    if (!activeRun || !activeRun.stops || activeRun.stops.length === 0) {
      Alert.alert(
        'No Active Stops',
        'You must have an assigned route run with stops to record a store payment collection.'
      );
      return;
    }
    const firstStop = activeRun.stops[0];
    setSelectedShopId(firstStop.shop_id);
    setSelectedShopName(firstStop.shop_name || 'Store');
    setAmountInput('');
    setSelectedMethod('CASH');
    setReferenceInput('');
    setNotesInput('');
    setModalVisible(true);
  };

  const handleRecordCollection = async () => {
    const numAmount = parseFloat(amountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive collection amount.');
      return;
    }

    if (!selectedShopId || !activeRun) {
      Alert.alert('Missing Selection', 'Please select a valid customer shop.');
      return;
    }

    if (selectedMethod === 'UPI' && !referenceInput.trim()) {
      Alert.alert('Reference Required', 'Please enter the UPI transaction ID / UTR reference.');
      return;
    }

    setSubmitting(true);
    try {
      await driverApi.recordCollection({
        runId: activeRun.id,
        shopId: selectedShopId,
        amount: numAmount,
        paymentMethod: selectedMethod,
        transactionReference: referenceInput.trim() || undefined,
        notes: notesInput.trim() || undefined,
      });

      Alert.alert(
        'Collection Issued',
        `Successfully recorded ₹${numAmount.toLocaleString('en-IN')} payment from ${selectedShopName}.`
      );
      setModalVisible(false);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Collection Error', err.message || 'Failed to record payment collection.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCollectionCard = ({ item }: { item: DeliveryCollection }) => {
    const isReconciled = item.status === 'RECONCILED' || item.status === 'DEPOSITED';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.receiptPill}>
            <Ionicons name="receipt-outline" size={13} color={DelivColors.deepEmerald} />
            <Text style={styles.receiptText}>{item.receipt_number}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.shopCol}>
            <Text style={styles.shopName} numberOfLines={1}>
              {item.shop_name || 'Store Merchant'}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.collected_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountText}>
              ₹{parseFloat(String(item.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <View style={styles.methodTag}>
              <Text style={styles.methodText}>{item.payment_method}</Text>
            </View>
          </View>
        </View>

        {item.transaction_reference && (
          <View style={styles.refRow}>
            <Text style={styles.refLabel}>TXN REF:</Text>
            <Text style={styles.refValue}>{item.transaction_reference}</Text>
          </View>
        )}

        {item.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DriverHeader
        title="Payment Collections"
        subtitle="Record shop invoice payments & daily deposits"
        rightElement={
          <TouchableOpacity
            style={styles.headerRecordBtn}
            onPress={handleOpenRecordModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={DelivColors.white} />
            <Text style={styles.headerRecordBtnText}>Record</Text>
          </TouchableOpacity>
        }
      />

      {/* Metrics Row */}
      <View style={styles.metricsContainer}>
        <MetricCard
          label="Total Collected"
          value={`₹${(summary?.totalCollected || 0).toLocaleString('en-IN')}`}
          subtitle={`${summary?.totalReceiptsCount || 0} receipts issued`}
          iconName="wallet-outline"
          variant="emerald"
        />
        <MetricCard
          label="Cash In Hand"
          value={`₹${(summary?.cashCollected || 0).toLocaleString('en-IN')}`}
          subtitle={`₹${(summary?.upiCollected || 0).toLocaleString('en-IN')} via UPI`}
          iconName="cash-outline"
          variant="amber"
        />
      </View>

      {/* List of Collections */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading payment ledger...</Text>
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={renderCollectionCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={[DelivColors.emeraldGreen]}
              tintColor={DelivColors.emeraldGreen}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeading}>COLLECTION TRANSACTIONS</Text>
              <Text style={styles.listCount}>{collections.length} items</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={DelivColors.textMuted} />
              <Text style={styles.emptyTitle}>No Collections Recorded</Text>
              <Text style={styles.emptySub}>
                Use the "Record" button above to enter payments received from stores on your route.
              </Text>
            </View>
          }
        />
      )}

      {/* Record Collection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment Collection</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={DelivColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {/* Shop Selector */}
              <Text style={styles.inputLabel}>SELECT STORE</Text>
              <View style={styles.shopSelectorRow}>
                {activeRun?.stops?.map((stop) => {
                  const isSelected = selectedShopId === stop.shop_id;
                  return (
                    <TouchableOpacity
                      key={stop.id}
                      style={[styles.shopChip, isSelected && styles.shopChipSelected]}
                      onPress={() => {
                        setSelectedShopId(stop.shop_id);
                        setSelectedShopName(stop.shop_name || 'Store');
                      }}
                    >
                      <Text style={[styles.shopChipText, isSelected && styles.shopChipTextSelected]}>
                        #{stop.stop_sequence} {stop.shop_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount Input */}
              <Text style={styles.inputLabel}>COLLECTION AMOUNT (₹)</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInputField}
                  placeholder="0.00"
                  placeholderTextColor={DelivColors.textMuted}
                  keyboardType="numeric"
                  value={amountInput}
                  onChangeText={setAmountInput}
                />
              </View>

              {/* Payment Method Selector */}
              <Text style={styles.inputLabel}>PAYMENT METHOD</Text>
              <View style={styles.methodRow}>
                {(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER'] as PaymentMethod[]).map((m) => {
                  const isSel = selectedMethod === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, isSel && styles.methodBtnSelected]}
                      onPress={() => setSelectedMethod(m)}
                    >
                      <Text style={[styles.methodBtnText, isSel && styles.methodBtnTextSelected]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Transaction Reference (Mandatory for UPI/Cheque) */}
              <Text style={styles.inputLabel}>
                TRANSACTION REFERENCE / UTR {selectedMethod !== 'CASH' ? '*' : '(OPTIONAL)'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. UPI-99887766 or Cheque #102938"
                placeholderTextColor={DelivColors.textMuted}
                value={referenceInput}
                onChangeText={setReferenceInput}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>INTERNAL NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Optional delivery or invoice reference remarks..."
                placeholderTextColor={DelivColors.textMuted}
                multiline
                numberOfLines={2}
                value={notesInput}
                onChangeText={setNotesInput}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
                onPress={handleRecordCollection}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={DelivColors.white} size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Issue Official Collection Receipt</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  headerRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.emeraldGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerRecordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.white,
  },
  metricsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: DelivColors.white,
    borderBottomWidth: 1,
    borderBottomColor: DelivColors.border,
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.6,
  },
  listCount: {
    fontSize: 12,
    color: DelivColors.textMuted,
    fontWeight: '600',
  },
  card: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptText: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shopCol: {
    flex: 1,
    marginRight: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 17,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  methodTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '800',
    color: DelivColors.textSecondary,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: DelivColors.textMuted,
  },
  refValue: {
    fontSize: 11,
    fontWeight: '600',
    color: DelivColors.textPrimary,
  },
  notesText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: DelivColors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  modalBody: {
    padding: 18,
    paddingBottom: 36,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: DelivColors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  shopSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shopChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: DelivColors.border,
  },
  shopChipSelected: {
    backgroundColor: DelivColors.lightEmerald,
    borderColor: DelivColors.emeraldGreen,
  },
  shopChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.textSecondary,
  },
  shopChipTextSelected: {
    color: DelivColors.deepEmerald,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
  },
  rupeeSymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
    marginRight: 6,
  },
  amountInputField: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  methodBtnSelected: {
    backgroundColor: DelivColors.deepEmerald,
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
  },
  methodBtnTextSelected: {
    color: DelivColors.white,
  },
  textInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: DelivColors.textPrimary,
  },
  modalSubmitBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
