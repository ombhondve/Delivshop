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
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { StatusBadge } from '@/components/driver/StatusBadge';
import { StopCard } from '@/components/driver/StopCard';
import { DeliveryRun, DeliveryRunStop, DriverPickupStop, DriverPickupsResponse } from '@/types/driver.types';
import * as Location from 'expo-location';

export default function DispatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dispatch, setDispatch] = useState<DeliveryRun | null>(null);
  const [pickupsData, setPickupsData] = useState<DriverPickupsResponse | null>(null);
  const [pickupsLoading, setPickupsLoading] = useState(false);
  const [selectedPickupStop, setSelectedPickupStop] = useState<DriverPickupStop | null>(null);
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [verifyingProximity, setVerifyingProximity] = useState(false);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [collectedQuantities, setCollectedQuantities] = useState<Record<string, string>>({});
  const [shortageReasons, setShortageReasons] = useState<Record<string, string>>({});
  const [pickupNotes, setPickupNotes] = useState('');

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
    }

    try {
      setPickupsLoading(true);
      const pData = await driverApi.getAssignedPickups(id);
      setPickupsData(pData);
    } catch (pErr: any) {
      console.warn('Could not load supplier pickups for run:', pErr?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPickupsLoading(false);
    }
  };

  const handleNavigateToCompany = (supplier: DriverPickupStop) => {
    if (supplier.latitude && supplier.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${supplier.latitude},${supplier.longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Navigation Error', 'Could not launch maps application.');
      });
    } else {
      Alert.alert('Coordinates Missing', 'This supplier company has not configured GPS pickup coordinates.');
    }
  };

  const handleNavigateToLocation = (latitude?: number | null, longitude?: number | null, label?: string) => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Navigation Error', 'Could not launch maps application.');
      });
    } else {
      Alert.alert('Coordinates Missing', `${label || 'Location'} coordinates are not set.`);
    }
  };

  const handleVerifyProximity = async (supplier: DriverPickupStop) => {
    if (!dispatch) return;
    setVerifyingProximity(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          '300-metre proximity verification requires location access to verify physical arrival at the supplier facility.'
        );
        setVerifyingProximity(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const res: any = await driverApi.verifyPickupProximity(dispatch.id, supplier.companyId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy != null ? position.coords.accuracy : undefined,
      });

      // Arrival verified! Products unlocked
      const unlockedProducts = res.products || supplier.products || [];
      const updatedStop: DriverPickupStop = {
        ...supplier,
        status: 'ARRIVED',
        isUnlocked: true,
        verifiedDistanceMeters: res.distanceMeters,
        products: unlockedProducts,
      };

      setSelectedPickupStop(updatedStop);
      const initialQty: Record<string, string> = {};
      const initialShortage: Record<string, string> = {};
      unlockedProducts.forEach((p: any) => {
        initialQty[p.productId] = String(p.collectedQuantity > 0 ? p.collectedQuantity : p.requiredQuantity);
        if (p.shortageReason) {
          initialShortage[p.productId] = p.shortageReason;
        }
      });
      setCollectedQuantities(initialQty);
      setShortageReasons(initialShortage);
      setPickupModalVisible(true);

      // Refresh background dispatches
      fetchDispatch();
    } catch (err: any) {
      Alert.alert(
        'Proximity Check Failed',
        err.message || 'Driver must be within 300 metres of the supplier entrance to unlock collection quantities.'
      );
    } finally {
      setVerifyingProximity(false);
    }
  };

  const handleOpenPickupCollection = (supplier: DriverPickupStop) => {
    setSelectedPickupStop(supplier);
    const initialQty: Record<string, string> = {};
    const initialShortage: Record<string, string> = {};
    (supplier.products || []).forEach((p) => {
      initialQty[p.productId] = String(p.collectedQuantity > 0 ? p.collectedQuantity : p.requiredQuantity);
      if (p.shortageReason) {
        initialShortage[p.productId] = p.shortageReason;
      }
    });
    setCollectedQuantities(initialQty);
    setShortageReasons(initialShortage);
    setPickupModalVisible(true);
  };

  const handleConfirmPickup = async () => {
    if (!selectedPickupStop || !dispatch) return;
    setConfirmingPickup(true);

    try {
      const items = (selectedPickupStop.products || []).map((p) => {
        const entered = parseFloat(collectedQuantities[p.productId] || '0') || 0;
        const shortage = entered < p.requiredQuantity ? (shortageReasons[p.productId] || 'Supplier shortage at pickup') : null;
        return {
          productId: p.productId,
          collectedQuantity: entered,
          shortageReason: shortage,
        };
      });

      await driverApi.confirmPickup(dispatch.id, selectedPickupStop.companyId, {
        items,
        notes: pickupNotes.trim() || undefined,
      });

      Alert.alert(
        'Pickup Confirmed',
        `Collection at "${selectedPickupStop.companyName}" successfully logged. Quantities have been added to vehicle manifest.`
      );
      setPickupModalVisible(false);
      setSelectedPickupStop(null);
      await fetchDispatch();
    } catch (err: any) {
      Alert.alert('Confirmation Error', err.message || 'Failed to persist pickup confirmation.');
    } finally {
      setConfirmingPickup(false);
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
      const updated = await driverApi.updateDispatchStatus(dispatch.id, 'IN_PROGRESS', 'Driver commenced delivery route');
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DriverHeader
        title={dispatch.run_code}
        subtitle={dispatch.route_name || 'Assigned Route'}
        showBack
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
                {dispatch.route_city || 'Pune'} Sector • {dispatch.delivery_date}
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
                  <Text style={styles.startRunBtnText}>Start Delivery Route</Text>
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

        {/* Stage 1: Start Location Card */}
        <View style={styles.corridorLocationCard}>
          <View style={styles.corridorLocationHeader}>
            <View style={[styles.corridorIconBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Ionicons name="play-circle" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.corridorStageTag}>STAGE 1 • START LOCATION</Text>
                <View style={[styles.supplierBadge, styles.badgeCollected]}>
                  <Text style={[styles.supplierBadgeText, styles.badgeTextCollected]}>ORIGIN</Text>
                </View>
              </View>
              <Text style={styles.corridorLocationTitle}>
                {dispatch.start_location_name || dispatch.route_depot || 'Vehicle Start Depot'}
              </Text>
              <Text style={styles.corridorLocationAddress} numberOfLines={2}>
                {dispatch.start_address || 'Depot Hub / Journey Starting Point'}
              </Text>
              {dispatch.start_latitude && dispatch.start_longitude && (
                <View style={styles.gpsRow}>
                  <Ionicons name="location" size={12} color="#059669" />
                  <Text style={styles.gpsCoordText}>
                    GPS: {Number(dispatch.start_latitude).toFixed(4)}, {Number(dispatch.start_longitude).toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {dispatch.start_latitude && dispatch.start_longitude && (
            <TouchableOpacity
              style={[styles.navBtn, { marginTop: 8 }]}
              onPress={() => handleNavigateToLocation(dispatch.start_latitude, dispatch.start_longitude, 'Start Location')}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-outline" size={15} color={DelivColors.deepEmerald} />
              <Text style={styles.navBtnText}>Navigate to Start Location</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Supplier Pickup Stops List (Required Pickups before Store Deliveries) */}
        {pickupsData && pickupsData.pickups && pickupsData.pickups.length > 0 && (
          <View style={styles.supplierSection}>
            <View style={styles.stopsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cube" size={16} color={DelivColors.deepEmerald} />
                <Text style={styles.stopsHeading}>STAGE 2 • SUPPLIER PICKUP STOPS</Text>
              </View>
              <Text style={styles.stopsCount}>
                {pickupsData.completedPickups} / {pickupsData.totalPickups} completed
              </Text>
            </View>

            {pickupsData.pickups.map((supplier) => {
              const isCollected = supplier.status === 'COLLECTED' || supplier.status === 'SHORTAGE';
              const isArrived = supplier.status === 'ARRIVED';
              return (
                <View key={supplier.companyId} style={styles.supplierCard}>
                  <View style={styles.supplierHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.supplierName}>{supplier.companyName}</Text>
                      <Text style={styles.supplierAddress} numberOfLines={2}>
                        {supplier.addressLine1
                          ? `${supplier.addressLine1}${supplier.city ? ', ' + supplier.city : ''}`
                          : 'Address on file'}
                      </Text>
                      {supplier.latitude && supplier.longitude && (
                        <View style={styles.gpsRow}>
                          <Ionicons name="location" size={12} color={DelivColors.emeraldGreen} />
                          <Text style={styles.gpsCoordText}>
                            GPS: {Number(supplier.latitude).toFixed(4)}, {Number(supplier.longitude).toFixed(4)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.supplierBadge,
                        isCollected
                          ? styles.badgeCollected
                          : isArrived
                          ? styles.badgeArrived
                          : styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.supplierBadgeText,
                          isCollected
                            ? styles.badgeTextCollected
                            : isArrived
                            ? styles.badgeTextArrived
                            : styles.badgeTextPending,
                        ]}
                      >
                        {supplier.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.supplierStatsRow}>
                    <View style={styles.supplierStatCol}>
                      <Text style={styles.supplierStatVal}>
                        {supplier.products?.length || 0}
                      </Text>
                      <Text style={styles.supplierStatLabel}>Lines</Text>
                    </View>
                    <View style={styles.supplierStatCol}>
                      <Text style={styles.supplierStatVal}>{supplier.totalRequiredUnits}</Text>
                      <Text style={styles.supplierStatLabel}>Required Qty</Text>
                    </View>
                    <View style={styles.supplierStatCol}>
                      <Text
                        style={[
                          styles.supplierStatVal,
                          {
                            color: isCollected
                              ? DelivColors.emeraldGreen
                              : DelivColors.textSecondary,
                          },
                        ]}
                      >
                        {supplier.totalCollectedUnits}
                      </Text>
                      <Text style={styles.supplierStatLabel}>Collected</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.supplierActionsRow}>
                    <TouchableOpacity
                      style={styles.navBtn}
                      onPress={() => handleNavigateToCompany(supplier)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="navigate-outline" size={15} color={DelivColors.deepEmerald} />
                      <Text style={styles.navBtnText}>Navigate</Text>
                    </TouchableOpacity>

                    {isCollected ? (
                      <TouchableOpacity
                        style={styles.viewCollectedBtn}
                        onPress={() => handleOpenPickupCollection(supplier)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={15}
                          color={DelivColors.emeraldGreen}
                        />
                        <Text style={styles.viewCollectedBtnText}>View Confirmed Items</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.verifyProximityBtn,
                          verifyingProximity && styles.btnDisabled,
                        ]}
                        onPress={() => handleVerifyProximity(supplier)}
                        disabled={verifyingProximity}
                        activeOpacity={0.85}
                      >
                        {verifyingProximity && selectedPickupStop?.companyId === supplier.companyId ? (
                          <ActivityIndicator size="small" color={DelivColors.white} />
                        ) : (
                          <>
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={15}
                              color={DelivColors.white}
                            />
                            <Text style={styles.verifyProximityBtnText}>
                              {isArrived ? 'Collect Quantities' : 'Verify Proximity (300m) & Collect'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Sequenced Route Stops List */}
        <View style={styles.stopsHeader}>
          <Text style={styles.stopsHeading}>STAGE 3 • SEQUENCED DELIVERY STOPS</Text>
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

        {/* Stage 4: Return Location Card */}
        <View style={[styles.corridorLocationCard, { marginTop: 12, marginBottom: 24 }]}>
          <View style={styles.corridorLocationHeader}>
            <View style={[styles.corridorIconBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Ionicons name="flag" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.corridorStageTag, { color: '#2563EB' }]}>STAGE 4 • RETURN LOCATION</Text>
                <View style={[styles.supplierBadge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.supplierBadgeText, { color: '#1D4ED8' }]}>DESTINATION</Text>
                </View>
              </View>
              <Text style={styles.corridorLocationTitle}>
                {dispatch.return_location_name || dispatch.route_depot || 'Return Depot / Warehouse'}
              </Text>
              <Text style={styles.corridorLocationAddress} numberOfLines={2}>
                {dispatch.return_address || 'End of journey return location'}
              </Text>
              {dispatch.return_latitude && dispatch.return_longitude && (
                <View style={styles.gpsRow}>
                  <Ionicons name="location" size={12} color="#2563EB" />
                  <Text style={[styles.gpsCoordText, { color: '#2563EB' }]}>
                    GPS: {Number(dispatch.return_latitude).toFixed(4)}, {Number(dispatch.return_longitude).toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {dispatch.return_latitude && dispatch.return_longitude && (
            <TouchableOpacity
              style={[styles.navBtn, { marginTop: 8, borderColor: '#93C5FD' }]}
              onPress={() => handleNavigateToLocation(dispatch.return_latitude, dispatch.return_longitude, 'Return Location')}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-outline" size={15} color="#1D4ED8" />
              <Text style={[styles.navBtnText, { color: '#1D4ED8' }]}>Navigate to Return Location</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Skip / Fail Stop Modal */}
      <Modal
        visible={skipModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSkipModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Stop Exception</Text>
              <TouchableOpacity onPress={() => setSkipModalVisible(false)}>
                <Ionicons name="close" size={24} color={DelivColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollBody}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Supplier Pickup Collection Modal (Strictly No Prices Exposed to Driver) */}
      <Modal
        visible={pickupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickupModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Pickup Collection</Text>
                <Text style={styles.modalSub} numberOfLines={1}>
                  {selectedPickupStop?.companyName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickupModalVisible(false)}>
                <Ionicons name="close" size={24} color={DelivColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollBody}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              <View style={styles.securityBanner}>
                <Ionicons name="shield-checkmark" size={16} color={DelivColors.emeraldGreen} />
                <Text style={styles.securityBannerText}>
                  Location verified within 300m proximity. Record actual physical items received.
                </Text>
              </View>

              <Text style={styles.inputLabel}>REQUIRED PRODUCTS TO COLLECT</Text>

              {(selectedPickupStop?.products || []).map((product) => {
                const required = product.requiredQuantity;
                const entered = parseFloat(collectedQuantities[product.productId] || '0') || 0;
                const isShortage = entered < required;

                return (
                  <View key={product.productId} style={styles.productPickupCard}>
                    <View style={styles.productInfoRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.productNameText}>{product.productName}</Text>
                        <Text style={styles.productMetaText}>
                          SKU: {product.sku || 'N/A'} • Unit: {product.unit || 'units'}
                        </Text>
                      </View>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeLabel}>Req:</Text>
                        <Text style={styles.requiredBadgeValue}>
                          {required} {product.unit || ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.qtyInputRow}>
                      <Text style={styles.qtyInputLabel}>Actual Collected:</Text>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        value={
                          collectedQuantities[product.productId] !== undefined
                            ? collectedQuantities[product.productId]
                            : String(required)
                        }
                        onChangeText={(val) =>
                          setCollectedQuantities((prev) => ({
                            ...prev,
                            [product.productId]: val,
                          }))
                        }
                      />
                    </View>

                    {isShortage && (
                      <View style={styles.shortageRow}>
                        <Text style={styles.shortageLabel}>Shortage Reason:</Text>
                        <TextInput
                          style={styles.shortageInput}
                          placeholder="Reason (e.g. supplier shortage, packaging defect)"
                          placeholderTextColor={DelivColors.textMuted}
                          value={shortageReasons[product.productId] || ''}
                          onChangeText={(val) =>
                            setShortageReasons((prev) => ({
                              ...prev,
                              [product.productId]: val,
                            }))
                          }
                        />
                      </View>
                    )}
                  </View>
                );
              })}

              <Text style={styles.inputLabel}>ADDITIONAL DISPATCH REMARKS (OPTIONAL)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Supervisor name, dock door number, etc..."
                placeholderTextColor={DelivColors.textMuted}
                value={pickupNotes}
                onChangeText={setPickupNotes}
              />

              <TouchableOpacity
                style={[styles.confirmPickupBtn, confirmingPickup && styles.btnDisabled]}
                onPress={handleConfirmPickup}
                disabled={confirmingPickup}
                activeOpacity={0.85}
              >
                {confirmingPickup ? (
                  <ActivityIndicator color={DelivColors.white} size="small" />
                ) : (
                  <Text style={styles.confirmPickupBtnText}>
                    Confirm Pickup & Add to Manifest
                  </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
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
    paddingBottom: 24,
    maxHeight: '85%',
    flexShrink: 1,
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
  modalScrollView: {
    flexShrink: 1,
  },
  modalScrollBody: {
    gap: 10,
    paddingBottom: 20,
    flexGrow: 1,
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
  supplierSection: {
    marginBottom: 20,
  },
  supplierCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  supplierAddress: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  gpsCoordText: {
    fontSize: 11,
    color: DelivColors.emeraldGreen,
    fontWeight: '600',
  },
  supplierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeArrived: {
    backgroundColor: '#E0F2FE',
  },
  badgeCollected: {
    backgroundColor: DelivColors.lightEmerald,
  },
  supplierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: '#B45309',
  },
  badgeTextArrived: {
    color: '#0369A1',
  },
  badgeTextCollected: {
    color: DelivColors.deepEmerald,
  },
  supplierStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  supplierStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  supplierStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  supplierStatLabel: {
    fontSize: 10,
    color: DelivColors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  supplierActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DelivColors.deepEmerald,
    backgroundColor: '#F0FDF4',
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.deepEmerald,
  },
  verifyProximityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: DelivColors.emeraldGreen,
  },
  verifyProximityBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.white,
  },
  viewCollectedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: DelivColors.lightEmerald,
    borderWidth: 1,
    borderColor: DelivColors.emeraldGreen,
  },
  viewCollectedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DelivColors.deepEmerald,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 8,
  },
  securityBannerText: {
    fontSize: 12,
    color: DelivColors.deepEmerald,
    fontWeight: '600',
    flex: 1,
  },
  productPickupCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  productInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  productMetaText: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  requiredBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requiredBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: DelivColors.textMuted,
  },
  requiredBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  qtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  qtyInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  qtyInput: {
    backgroundColor: DelivColors.white,
    borderWidth: 1,
    borderColor: DelivColors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.deepEmerald,
    minWidth: 80,
    textAlign: 'center',
  },
  shortageRow: {
    gap: 4,
    marginTop: 4,
  },
  shortageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.error,
  },
  shortageInput: {
    backgroundColor: DelivColors.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: DelivColors.textPrimary,
  },
  confirmPickupBtn: {
    backgroundColor: DelivColors.emeraldGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmPickupBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: DelivColors.white,
  },
  corridorLocationCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  corridorLocationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  corridorIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  corridorStageTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  corridorLocationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
    marginTop: 2,
  },
  corridorLocationAddress: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
