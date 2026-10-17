import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';
import { driverApi } from '@/services/api/driverApi';
import { DelivColors } from '@/constants/theme';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { ConfirmModal } from '@/components/driver/ConfirmModal';
import { AssignedVehicle, AttendanceSummary, DriverAttendance } from '@/types/driver.types';

export default function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const driverId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<DriverAttendance[]>([]);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!driverId) return;
      try {
        const [profileData, attSum, attHistory, dispatches] = await Promise.all([
          driverApi.getDriverProfile(driverId).catch(() => null),
          driverApi.getAttendanceSummary(driverId).catch(() => null),
          driverApi.getAttendanceHistory(driverId).catch(() => []),
          driverApi.getAssignedDispatches().catch(() => []),
        ]);

        setDriverProfile(profileData?.driver || null);
        setAttendanceSummary(attSum);
        setAttendanceHistory(attHistory.slice(0, 5));

        // Get assigned vehicle details from active dispatch or profile
        const activeRun = dispatches.find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED') || dispatches[0];
        if (activeRun?.vehicle_id) {
          try {
            const veh = await driverApi.getVehicleDetails(activeRun.vehicle_id);
            setVehicle(veh);
          } catch {
            // Non fatal
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [driverId]);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message || 'Failed to securely sign out.');
      setLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <DriverHeader title="Driver Profile" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={DelivColors.emeraldGreen} />
          <Text style={styles.loadingText}>Loading driver credentials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const p = driverProfile || user;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DriverHeader title="Driver Profile & Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
            </Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.driverName}>{user?.name || 'Fleet Driver'}</Text>
            <Text style={styles.employeeId}>
              EMPLOYEE ID: {p?.employee_id || p?.employeeId || 'EMP-DRV-1001'}
            </Text>
            <View style={styles.statusPill}>
              <View style={styles.activeDot} />
              <Text style={styles.statusPillText}>
                {p?.employment_status || p?.employmentStatus || 'ACTIVE LOGISTICS ROSTER'}
              </Text>
            </View>
          </View>
        </View>

        {/* Read-Only Assigned Vehicle Specifications */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bus-outline" size={18} color={DelivColors.deepEmerald} />
            <Text style={styles.sectionTitle}>ASSIGNED FLEET VEHICLE (READ-ONLY)</Text>
          </View>
          <Text style={styles.readOnlyNotice}>
            Vehicle allocation is controlled centrally by Depot Logistics Administration.
          </Text>

          {vehicle ? (
            <View style={styles.vehicleDetailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registration Number</Text>
                <Text style={styles.detailValueBold}>{vehicle.registration_number}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Make & Model</Text>
                <Text style={styles.detailValue}>{vehicle.make_model}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Asset Category</Text>
                <Text style={styles.detailValue}>{vehicle.vehicle_type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Crate Payload Capacity</Text>
                <Text style={styles.detailValue}>{vehicle.capacity_crates} Milk Crates</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cold-Chain Chiller</Text>
                <Text style={[styles.detailValue, { color: vehicle.is_refrigerated ? DelivColors.emeraldGreen : '#64748B' }]}>
                  {vehicle.is_refrigerated ? 'Active Refrigeration' : 'Standard Insulated'}
                </Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Odometer Reading</Text>
                <Text style={styles.detailValue}>{vehicle.current_odometer_km} km</Text>
              </View>
            </View>
          ) : (
            <View style={styles.unassignedBox}>
              <Ionicons name="alert-circle-outline" size={20} color={DelivColors.warning} />
              <Text style={styles.unassignedText}>
                No vehicle permanently assigned. Vehicle dynamically paired during daily dispatch.
              </Text>
            </View>
          )}
        </View>

        {/* Compliance & Licence Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color={DelivColors.deepEmerald} />
            <Text style={styles.sectionTitle}>DRIVER COMPLIANCE & LICENCE</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Driving Licence No.</Text>
            <Text style={styles.detailValueBold}>
              {p?.license_number || p?.licenseNumber || 'MH-12-2021-008912'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Licence Expiry</Text>
            <Text style={styles.detailValue}>
              {p?.license_expiry || p?.licenseExpiry || '31 Dec 2028'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transport Class</Text>
            <Text style={styles.detailValue}>
              {p?.license_class || 'LMV-TR (Transport)'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Registered Depot</Text>
            <Text style={styles.detailValue}>{p?.city || 'Pune Central Cold Depot'}</Text>
          </View>
        </View>

        {/* Attendance & Shift Roster Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={DelivColors.deepEmerald} />
            <Text style={styles.sectionTitle}>MONTHLY ATTENDANCE ROSTER</Text>
          </View>

          <View style={styles.attendanceGrid}>
            <View style={styles.attGridItem}>
              <Text style={styles.attGridNum}>{attendanceSummary?.daysPresentMonth || 0}</Text>
              <Text style={styles.attGridLabel}>Days Present</Text>
            </View>
            <View style={styles.attGridItem}>
              <Text style={styles.attGridNum}>{attendanceSummary?.daysLateMonth || 0}</Text>
              <Text style={styles.attGridLabel}>Late Checks</Text>
            </View>
            <View style={styles.attGridItem}>
              <Text style={styles.attGridNum}>{attendanceSummary?.daysAbsentMonth || 0}</Text>
              <Text style={styles.attGridLabel}>Absences</Text>
            </View>
          </View>
        </View>

        {/* Operational Incident & Support Shortcuts */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-buoy-outline" size={18} color={DelivColors.deepEmerald} />
            <Text style={styles.sectionTitle}>SUPPORT & INCIDENT LOGGING</Text>
          </View>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(driver)/incident')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="warning-outline" size={18} color={DelivColors.error} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Report Incident / Breakdown</Text>
              <Text style={styles.menuSub}>Notify dispatch of delays, damages, or obstructions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={DelivColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              Alert.alert(
                'Depot Fleet Dispatcher',
                'Emergency Logistics Hotline: +91 20 2567 8900\nDepot Manager: +91 98220 11990\nHours: 24/7 Cold-Chain Support'
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="call-outline" size={18} color={DelivColors.emeraldGreen} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuTitle}>Depot Dispatch Hotline</Text>
              <Text style={styles.menuSub}>Call central fleet support and maintenance team</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={DelivColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Security & Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color={DelivColors.error} />
          <Text style={styles.logoutBtnText}>Sign Out from Fleet Terminal</Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>
          Delivshop Driver Terminal • v1.0.0 (Production Build)
        </Text>
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <ConfirmModal
        visible={logoutModalVisible}
        title="Sign Out Fleet Session"
        message="Are you sure you want to end your current mobile session? Active route navigation cache will be preserved."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        isDestructive
        isLoading={loggingOut}
        iconName="log-out-outline"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
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
    paddingBottom: 36,
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
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 16,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: DelivColors.deepEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: DelivColors.white,
  },
  identityInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  employeeId: {
    fontSize: 11,
    fontWeight: '700',
    color: DelivColors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DelivColors.emeraldGreen,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
    letterSpacing: 0.3,
  },
  sectionCard: {
    backgroundColor: DelivColors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
    letterSpacing: 0.6,
  },
  readOnlyNotice: {
    fontSize: 11,
    color: DelivColors.textMuted,
    marginBottom: 12,
  },
  vehicleDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  detailLabel: {
    fontSize: 13,
    color: DelivColors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: DelivColors.textPrimary,
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DelivColors.ivory,
    padding: 10,
    borderRadius: 8,
  },
  unassignedText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  attendanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  attGridItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  attGridNum: {
    fontSize: 20,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  attGridLabel: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  menuSub: {
    fontSize: 11,
    color: DelivColors.textSecondary,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DelivColors.white,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.error,
  },
  versionFooter: {
    fontSize: 11,
    color: DelivColors.textMuted,
    textAlign: 'center',
  },
});
