import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DelivColors } from '@/constants/theme';
import { driverApi } from '@/services/api/driverApi';
import { DriverQueueManager } from '@/services/offline/driverQueue';
import { DriverCacheManager } from '@/services/offline/driverCache';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { StatusBadge } from '@/components/driver/StatusBadge';
import { QuantityCounter } from '@/components/driver/QuantityCounter';
import { ConfirmModal } from '@/components/driver/ConfirmModal';
import { PaymentMethod, DeliveryOrderItem } from '@/types/driver.types';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency } from '@/utils/formatters';

interface ItemDeliveryState {
  productId: string;
  productName: string;
  orderedQty: number;
  deliveredQty: number;
  unitPrice: number;
  unit: string;
  packSize?: string;
  shortageReason?: string;
}

const SHORTAGE_REASONS = [
  'Short supply at depot',
  'Damaged / leaked in transit',
  'Customer refused extra quantity',
  'Packaging defect / souring',
  'Crate capacity constraint',
  'Other discrepancy',
];

export default function ShopDeliveryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const driverId = user?.id || 'driver';
  const { id, stopSequence, runId } = useLocalSearchParams<{
    id: string;
    stopSequence?: string;
    runId?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [delivery, setDelivery] = useState<any>(null);

  // Delivery Workflow States
  const [activeStep, setActiveStep] = useState<'ITEMS' | 'PAYMENT' | 'POD'>('ITEMS');
  const [itemsState, setItemsState] = useState<ItemDeliveryState[]>([]);
  const [deliveredCrates, setDeliveredCrates] = useState<number>(1);
  const [returnedCrates, setReturnedCrates] = useState<number>(0);

  // Payment states
  const [collectPayment, setCollectPayment] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [txnRef, setTxnRef] = useState<string>('');

  // Proof of delivery states
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  // Modals
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [failModalVisible, setFailModalVisible] = useState(false);
  const [failureReason, setFailureReason] = useState('Shop closed / merchant unavailable');

  const fetchDelivery = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Try local cache first for fast rendering
      const cached = await DriverCacheManager.getCachedItem<any>(`delivery_${id}`);
      if (cached) {
        setDelivery(cached);
        initDeliveryState(cached);
      }

      // 2. Fetch fresh from backend
      const res = await driverApi.getDeliveryDetails(id);
      if (res) {
        setDelivery(res);
        await DriverCacheManager.cacheItem(`delivery_${id}`, res);
        initDeliveryState(res);
      }
    } catch (err: any) {
      if (!delivery) {
        Alert.alert('Load Notice', 'Could not load delivery from server. Checking cached records.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  const initDeliveryState = (data: any) => {
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      const initialItems: ItemDeliveryState[] = data.items.map((it: any) => ({
        productId: it.product_id || it.id,
        productName: it.product_name || 'Dairy Product',
        orderedQty: Number(it.quantity) || 1,
        deliveredQty: Number(it.delivered_quantity ?? it.quantity ?? 1),
        unitPrice: Number(it.unit_price) || 0,
        unit: it.base_unit || 'Units',
        packSize: it.pack_size,
        shortageReason: it.shortage_reason || undefined,
      }));
      setItemsState(initialItems);
    } else {
      // Fallback single item if items table was empty
      setItemsState([
        {
          productId: 'default-dairy',
          productName: 'Assorted Dairy Items',
          orderedQty: 1,
          deliveredQty: 1,
          unitPrice: Number(data.total) || 500,
          unit: 'Crate',
        },
      ]);
    }

    // Set default payment amount to total
    const totalAmount = Number(data.total) || 0;
    setPaymentAmount(totalAmount > 0 ? String(totalAmount) : '0');
    setRecipientName(data.delivery_contact_name || data.shop_name || '');
    setRecipientPhone(data.delivery_contact_phone || '');
  };

  const handleUpdateDeliveredQty = (index: number, newQty: number) => {
    setItemsState((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const ordered = item.orderedQty;
      const validQty = Math.max(0, Math.min(newQty, ordered));

      updated[index] = {
        ...item,
        deliveredQty: validQty,
        shortageReason: validQty < ordered ? item.shortageReason || SHORTAGE_REASONS[0] : undefined,
      };
      return updated;
    });
  };

  const handleSetShortageReason = (index: number, reason: string) => {
    setItemsState((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], shortageReason: reason };
      return updated;
    });
  };

  const calculateDeliveredTotal = () => {
    return itemsState.reduce((sum, item) => sum + item.deliveredQty * item.unitPrice, 0);
  };

  const hasShortages = itemsState.some((i) => i.deliveredQty < i.orderedQty);

  const handleCallShop = () => {
    const phone = delivery?.delivery_contact_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone', 'No contact phone number is on record for this shop.');
    }
  };

  const handleOpenMap = () => {
    const lat = delivery?.shop_latitude;
    const lng = delivery?.shop_longitude;
    const address = delivery?.shop_address || delivery?.delivery_address;
    if (lat && lng) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const url = Platform.select({
        ios: `${scheme}${delivery?.shop_name}@${lat},${lng}`,
        android: `${scheme}${lat},${lng}(${delivery?.shop_name})`,
      });
      if (url) Linking.openURL(url);
    } else if (address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    } else {
      Alert.alert('No Location', 'No address or coordinates found for this delivery.');
    }
  };

  const handlePreConfirmSubmission = () => {
    // Validate shortages
    for (const item of itemsState) {
      if (item.deliveredQty < item.orderedQty && !item.shortageReason) {
        Alert.alert(
          'Shortage Reason Required',
          `Please select an operational reason for the shortage on "${item.productName}".`
        );
        setActiveStep('ITEMS');
        return;
      }
    }

    // Validate payment
    if (collectPayment) {
      const amt = parseFloat(paymentAmount);
      if (isNaN(amt) || amt < 0) {
        Alert.alert('Invalid Payment', 'Please enter a valid payment amount (e.g. 0 for credit).');
        setActiveStep('PAYMENT');
        return;
      }
      if (paymentMethod === 'UPI' && !txnRef.trim()) {
        Alert.alert('UPI Ref Required', 'Please enter the UPI transaction / UTR reference number.');
        setActiveStep('PAYMENT');
        return;
      }
    }

    if (!recipientName.trim()) {
      Alert.alert('Recipient Required', 'Please enter the name of the shop receiver / storekeeper.');
      setActiveStep('POD');
      return;
    }

    setConfirmModalVisible(true);
  };

  const handleExecuteCompletion = async () => {
    setConfirmModalVisible(false);
    setSubmitting(true);

    const payload = {
      status: 'DELIVERED' as const,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim() || undefined,
      deliveredCratesCount: deliveredCrates,
      returnedCratesCount: returnedCrates,
      shortageReason: hasShortages ? 'Items adjusted as per checklist' : undefined,
      collectedAmount: collectPayment ? parseFloat(paymentAmount) || 0 : 0,
      paymentMethod: collectPayment ? paymentMethod : 'CASH',
      transactionReference: txnRef.trim() || undefined,
      notes: deliveryNotes.trim() || undefined,
      proofOfDeliveryUrl: photoConfirmed ? 'evidence://pod-photo-confirmed' : undefined,
      itemDiscrepancies: itemsState.map((it) => ({
        productId: it.productId,
        orderedQuantity: it.orderedQty,
        deliveredQuantity: it.deliveredQty,
        shortageReason: it.shortageReason,
      })),
    };

    try {
      await driverApi.completeDelivery(id, payload);
      Alert.alert(
        'Delivery Completed!',
        `Successfully delivered to ${delivery?.shop_name || 'shop'}.\n${
          collectPayment && parseFloat(paymentAmount) > 0
            ? `Receipt generated for ${formatCurrency(paymentAmount)}.`
            : ''
        }`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      // If offline or network error, queue offline
      await DriverQueueManager.enqueueOperation(
        driverId,
        'COMPLETE_DELIVERY',
        id,
        payload
      );

      Alert.alert(
        'Saved Offline',
        'Device is offline or network error occurred. Delivery has been queued securely and will synchronize automatically when connection is restored.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteFailure = async () => {
    if (!failureReason.trim()) {
      Alert.alert('Reason Required', 'Please choose a reason for delivery failure.');
      return;
    }
    setFailModalVisible(false);
    setSubmitting(true);

    const payload = {
      status: 'FAILED' as const,
      shortageReason: failureReason,
      notes: deliveryNotes.trim() || failureReason,
      deliveredCratesCount: 0,
      returnedCratesCount: returnedCrates,
      collectedAmount: 0,
    };

    try {
      await driverApi.completeDelivery(id, payload);
      Alert.alert('Delivery Marked as Failed', 'Status recorded and reported to dispatch dispatcher.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      await DriverQueueManager.enqueueOperation(
        driverId,
        'COMPLETE_DELIVERY',
        id,
        payload
      );
      Alert.alert('Saved Offline', 'Failure report saved to offline queue.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Shop Delivery" showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading delivery order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Shop Delivery" showBack />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={DelivColors.error} />
          <Text style={styles.emptyTitle}>Delivery Record Not Found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDelivery}>
            <Text style={styles.retryBtnText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAlreadyDelivered = delivery.status === 'DELIVERED';
  const calculatedTotal = calculateDeliveredTotal();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DriverHeader
        title={delivery.shop_name || 'Shop Delivery'}
        subtitle={`Order #${delivery.order_number || delivery.order_id?.slice(0, 8) || 'DELIV'}`}
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
        {/* Shop Info Card */}
        <View style={styles.shopCard}>
          <View style={styles.shopHeaderRow}>
            <View style={styles.shopTitleBox}>
              <Text style={styles.shopNameText}>{delivery.shop_name}</Text>
              <Text style={styles.shopAddressText}>{delivery.shop_address || delivery.delivery_address}</Text>
            </View>
            <StatusBadge status={delivery.status} size="medium" />
          </View>

          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactPill} onPress={handleCallShop}>
              <Ionicons name="call" size={15} color={DelivColors.emeraldGreen} />
              <Text style={styles.contactPillText}>
                {delivery.delivery_contact_phone ? `Call: ${delivery.delivery_contact_phone}` : 'Call Shop'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactPill} onPress={handleOpenMap}>
              <Ionicons name="navigate" size={15} color={DelivColors.emeraldGreen} />
              <Text style={styles.contactPillText}>Directions</Text>
            </TouchableOpacity>
          </View>

          {delivery.delivery_instructions ? (
            <View style={styles.instructionBanner}>
              <Ionicons name="information-circle" size={16} color="#B45309" />
              <Text style={styles.instructionText}>{delivery.delivery_instructions}</Text>
            </View>
          ) : null}
        </View>

        {isAlreadyDelivered ? (
          <View style={styles.completedNoticeCard}>
            <Ionicons name="checkmark-circle" size={36} color={DelivColors.emeraldGreen} />
            <Text style={styles.completedNoticeTitle}>Delivery Completed & Verified</Text>
            <Text style={styles.completedNoticeSub}>
              This order has already been fulfilled and reconciled with the warehouse dispatch ledger.
            </Text>
          </View>
        ) : (
          <>
            {/* Step Navigation Bar */}
            <View style={styles.stepTabs}>
              <TouchableOpacity
                style={[styles.stepTab, activeStep === 'ITEMS' && styles.stepTabActive]}
                onPress={() => setActiveStep('ITEMS')}
              >
                <Ionicons
                  name="cube-outline"
                  size={16}
                  color={activeStep === 'ITEMS' ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                />
                <Text style={[styles.stepTabText, activeStep === 'ITEMS' && styles.stepTabTextActive]}>
                  1. Quantities
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepTab, activeStep === 'PAYMENT' && styles.stepTabActive]}
                onPress={() => setActiveStep('PAYMENT')}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={activeStep === 'PAYMENT' ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                />
                <Text style={[styles.stepTabText, activeStep === 'PAYMENT' && styles.stepTabTextActive]}>
                  2. Payment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepTab, activeStep === 'POD' && styles.stepTabActive]}
                onPress={() => setActiveStep('POD')}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={activeStep === 'POD' ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                />
                <Text style={[styles.stepTabText, activeStep === 'POD' && styles.stepTabTextActive]}>
                  3. POD & Submit
                </Text>
              </TouchableOpacity>
            </View>

            {/* STEP 1: QUANTITIES & CRATES */}
            {activeStep === 'ITEMS' && (
              <View style={styles.stepContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Product Delivery Checklist</Text>
                  <Text style={styles.sectionHint}>Record actual delivered quantities</Text>
                </View>

                {itemsState.map((item, idx) => {
                  const hasShortage = item.deliveredQty < item.orderedQty;
                  return (
                    <View key={item.productId + idx} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.productName}</Text>
                          <Text style={styles.itemMeta}>
                            Ordered: {item.orderedQty} {item.unit} • {formatCurrency(item.unitPrice)} / {item.unit}
                          </Text>
                        </View>
                        <Text style={styles.itemSubtotal}>
                          {formatCurrency(item.deliveredQty * item.unitPrice)}
                        </Text>
                      </View>

                      <View style={styles.counterRow}>
                        <Text style={styles.counterLabel}>Delivered Quantity:</Text>
                        <QuantityCounter
                          value={item.deliveredQty}
                          min={0}
                          max={item.orderedQty}
                          onChange={(val) => handleUpdateDeliveredQty(idx, val)}
                        />
                      </View>

                      {hasShortage && (
                        <View style={styles.shortageBox}>
                          <Text style={styles.shortageBadge}>
                            Shortage: {item.orderedQty - item.deliveredQty} {item.unit}
                          </Text>
                          <Text style={styles.shortageLabel}>REASON FOR SHORTAGE:</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} style={styles.reasonScroll}>
                            {SHORTAGE_REASONS.map((r) => {
                              const isSelected = item.shortageReason === r;
                              return (
                                <TouchableOpacity
                                  key={r}
                                  style={[styles.reasonPill, isSelected && styles.reasonPillSelected]}
                                  onPress={() => handleSetShortageReason(idx, r)}
                                >
                                  <Text
                                    style={[
                                      styles.reasonPillText,
                                      isSelected && styles.reasonPillTextSelected,
                                    ]}
                                  >
                                    {r}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Crates Reconciliation */}
                <View style={styles.cratesSection}>
                  <Text style={styles.sectionTitle}>Crate Accountability</Text>
                  <View style={styles.cratesGrid}>
                    <View style={styles.crateBox}>
                      <Text style={styles.crateBoxTitle}>Crates Delivered</Text>
                      <QuantityCounter
                        value={deliveredCrates}
                        min={0}
                        max={50}
                        onChange={setDeliveredCrates}
                      />
                    </View>
                    <View style={styles.crateBox}>
                      <Text style={styles.crateBoxTitle}>Empty Crates Returned</Text>
                      <QuantityCounter
                        value={returnedCrates}
                        min={0}
                        max={50}
                        onChange={setReturnedCrates}
                      />
                    </View>
                  </View>
                </View>

                {/* Next Step Button */}
                <TouchableOpacity
                  style={styles.stepNextBtn}
                  onPress={() => setActiveStep('PAYMENT')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.stepNextBtnText}>Proceed to Payment ({formatCurrency(calculatedTotal)}) →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: PAYMENT COLLECTION */}
            {activeStep === 'PAYMENT' && (
              <View style={styles.stepContainer}>
                <View style={styles.paymentSummaryCard}>
                  <Text style={styles.paymentCardLabel}>AUTHORITATIVE ORDER DUE</Text>
                  <Text style={styles.paymentCardAmount}>{formatCurrency(delivery.total || calculatedTotal)}</Text>
                  <Text style={styles.paymentCardSub}>
                    Delivered Items Value: {formatCurrency(calculatedTotal)}
                  </Text>
                </View>

                {/* Collect Payment Toggle */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setCollectPayment(!collectPayment)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={collectPayment ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={collectPayment ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.toggleTitle}>Collect Payment On Delivery</Text>
                    <Text style={styles.toggleSub}>Record cash or digital collection at shop</Text>
                  </View>
                </TouchableOpacity>

                {collectPayment && (
                  <View style={styles.paymentForm}>
                    <Text style={styles.inputLabel}>COLLECTION AMOUNT (₹) *</Text>
                    <TextInput
                      style={styles.textInputLarge}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder="0.00"
                    />

                    <Text style={[styles.inputLabel, { marginTop: 16 }]}>PAYMENT METHOD *</Text>
                    <View style={styles.methodGrid}>
                      {(['CASH', 'UPI', 'CHEQUE'] as PaymentMethod[]).map((m) => {
                        const isSelected = paymentMethod === m;
                        return (
                          <TouchableOpacity
                            key={m}
                            style={[styles.methodCard, isSelected && styles.methodCardActive]}
                            onPress={() => setPaymentMethod(m)}
                          >
                            <Ionicons
                              name={m === 'CASH' ? 'cash' : m === 'UPI' ? 'qr-code' : 'document-text'}
                              size={20}
                              color={isSelected ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                            />
                            <Text
                              style={[styles.methodCardText, isSelected && styles.methodCardTextActive]}
                            >
                              {m}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {paymentMethod === 'UPI' && (
                      <View style={{ marginTop: 14 }}>
                        <Text style={styles.inputLabel}>UPI TRANSACTION / UTR REFERENCE *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 428719283741"
                          value={txnRef}
                          onChangeText={setTxnRef}
                          autoCapitalize="characters"
                        />
                      </View>
                    )}

                    {paymentMethod === 'CHEQUE' && (
                      <View style={{ marginTop: 14 }}>
                        <Text style={styles.inputLabel}>CHEQUE NUMBER & BANK *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. CHQ-928172 (HDFC Bank)"
                          value={txnRef}
                          onChangeText={setTxnRef}
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* Step Navigation Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.stepBackBtn}
                    onPress={() => setActiveStep('ITEMS')}
                  >
                    <Text style={styles.stepBackBtnText}>← Items</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.stepNextBtn, { flex: 1 }]}
                    onPress={() => setActiveStep('POD')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.stepNextBtnText}>Proceed to POD →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: PROOF OF DELIVERY & SUBMIT */}
            {activeStep === 'POD' && (
              <View style={styles.stepContainer}>
                <View style={styles.podForm}>
                  <Text style={styles.inputLabel}>RECIPIENT STOREKEEPER NAME *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full name of receiver"
                    value={recipientName}
                    onChangeText={setRecipientName}
                  />

                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>RECIPIENT CONTACT PHONE</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    keyboardType="phone-pad"
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                  />

                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>HANDOVER NOTES / OBSERVATIONS</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                    placeholder="e.g. Received chilled crates in good condition"
                    multiline
                    value={deliveryNotes}
                    onChangeText={setDeliveryNotes}
                  />

                  {/* Photo confirmation toggle */}
                  <TouchableOpacity
                    style={[styles.photoToggleCard, photoConfirmed && styles.photoToggleCardActive]}
                    onPress={() => setPhotoConfirmed(!photoConfirmed)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={photoConfirmed ? 'camera' : 'camera-outline'}
                      size={24}
                      color={photoConfirmed ? DelivColors.emeraldGreen : DelivColors.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.photoToggleTitle}>Delivery Verification Photo</Text>
                      <Text style={styles.photoToggleSub}>
                        {photoConfirmed
                          ? '✓ Crate stack & storefront verified'
                          : 'Tap to mark crates inspected and photographed'}
                      </Text>
                    </View>
                    <Ionicons
                      name={photoConfirmed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={photoConfirmed ? DelivColors.emeraldGreen : DelivColors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Final Review Summary Card */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Submission Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Items Delivered:</Text>
                    <Text style={styles.summaryVal}>
                      {itemsState.reduce((s, i) => s + i.deliveredQty, 0)} Units
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Crates Handover:</Text>
                    <Text style={styles.summaryVal}>
                      +{deliveredCrates} Deliv / -{returnedCrates} Ret
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payment to Record:</Text>
                    <Text style={[styles.summaryVal, { color: DelivColors.emeraldGreen, fontWeight: '700' }]}>
                      {collectPayment && parseFloat(paymentAmount) > 0
                        ? `${formatCurrency(paymentAmount)} (${paymentMethod})`
                        : 'None (Credit Account)'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.btnDisabled]}
                  onPress={handlePreConfirmSubmission}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color={DelivColors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color={DelivColors.white} />
                      <Text style={styles.submitBtnText}>Confirm & Complete Delivery</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Fail Delivery Alternative */}
                <TouchableOpacity
                  style={styles.failBtn}
                  onPress={() => setFailModalVisible(true)}
                  disabled={submitting}
                >
                  <Text style={styles.failBtnText}>Delivery Failed / Refused By Customer</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModalVisible}
        title="Confirm Shop Delivery"
        message={`Are you sure you want to finalize delivery for ${delivery.shop_name}?\n\n• Delivered: ${itemsState.reduce((s, i) => s + i.deliveredQty, 0)} items\n• Payment: ${formatCurrency(collectPayment ? paymentAmount : 0)}\n• Receiver: ${recipientName}`}
        confirmText="Yes, Complete Delivery"
        cancelText="Review Again"
        onConfirm={handleExecuteCompletion}
        onCancel={() => setConfirmModalVisible(false)}
      />

      {/* Fail Delivery Modal */}
      <ConfirmModal
        visible={failModalVisible}
        title="Record Delivery Exception"
        message={`Mark delivery to ${delivery.shop_name} as FAILED?\n\nThis will record an operational exception in the dispatch ledger.`}
        confirmText="Confirm Failure"
        cancelText="Back"
        confirmColor={DelivColors.error}
        onConfirm={handleExecuteFailure}
        onCancel={() => setFailModalVisible(false)}
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DelivColors.textPrimary,
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 8,
  },
  retryBtnText: {
    color: DelivColors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    flexGrow: 1,
  },
  shopCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  shopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  shopTitleBox: {
    flex: 1,
    marginRight: 10,
  },
  shopNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  shopAddressText: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.deepEmerald,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
  },
  completedNoticeCard: {
    backgroundColor: DelivColors.lightEmerald,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DelivColors.emeraldGreen,
  },
  completedNoticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DelivColors.deepEmerald,
    marginTop: 10,
  },
  completedNoticeSub: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  stepTabs: {
    flexDirection: 'row',
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  stepTabActive: {
    backgroundColor: DelivColors.lightEmerald,
  },
  stepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.textSecondary,
  },
  stepTabTextActive: {
    color: DelivColors.deepEmerald,
    fontWeight: '700',
  },
  stepContainer: {
    gap: 14,
  },
  sectionHeaderRow: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  sectionHint: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  itemCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  itemMeta: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 3,
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '700',
    color: DelivColors.emeraldGreen,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DelivColors.textPrimary,
  },
  shortageBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shortageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    color: DelivColors.error,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  shortageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
    marginBottom: 6,
  },
  reasonScroll: {
    flexDirection: 'row',
  },
  reasonPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonPillSelected: {
    backgroundColor: DelivColors.lightEmerald,
    borderColor: DelivColors.emeraldGreen,
  },
  reasonPillText: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    fontWeight: '500',
  },
  reasonPillTextSelected: {
    color: DelivColors.deepEmerald,
    fontWeight: '700',
  },
  cratesSection: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  cratesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  crateBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  crateBoxTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.textPrimary,
    textAlign: 'center',
  },
  stepNextBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  stepNextBtnText: {
    color: DelivColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  stepBackBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  stepBackBtnText: {
    color: DelivColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  paymentSummaryCard: {
    backgroundColor: DelivColors.deepEmerald,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  paymentCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.lightEmerald,
    letterSpacing: 0.5,
  },
  paymentCardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: DelivColors.white,
    marginVertical: 4,
  },
  paymentCardSub: {
    fontSize: 12,
    color: DelivColors.warmNeutral,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  toggleSub: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  paymentForm: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  methodGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  methodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodCardActive: {
    backgroundColor: DelivColors.lightEmerald,
    borderColor: DelivColors.emeraldGreen,
  },
  methodCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.textSecondary,
  },
  methodCardTextActive: {
    color: DelivColors.deepEmerald,
    fontWeight: '700',
  },
  podForm: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  photoToggleCardActive: {
    backgroundColor: DelivColors.lightEmerald,
    borderColor: DelivColors.emeraldGreen,
  },
  photoToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  photoToggleSub: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.textPrimary,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: DelivColors.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: DelivColors.textPrimary,
  },
  submitBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: DelivColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  failBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  failBtnText: {
    color: DelivColors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
