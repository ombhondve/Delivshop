import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelivColors } from '@/constants/theme';
import { StatusBadge } from './StatusBadge';
import { DeliveryRunStop } from '@/types/driver.types';

interface StopCardProps {
  stop: DeliveryRunStop;
  onPress: () => void;
  isNext?: boolean;
}

export const StopCard: React.FC<StopCardProps> = ({ stop, onPress, isNext = false }) => {
  const handleOpenMaps = async (e: any) => {
    e.stopPropagation();
    const lat = stop.shop_latitude;
    const lng = stop.shop_longitude;
    const address = stop.shop_address;

    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    }

    if (address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    }

    Alert.alert('Navigation Notice', 'Destination GPS coordinates not available for external navigation.');
  };

  const isCompleted = stop.status === 'DELIVERED';
  const isFailed = stop.status === 'FAILED' || stop.status === 'SKIPPED';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isNext && styles.nextCard,
        isCompleted && styles.completedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={styles.sequenceBadge}>
          <Text style={styles.sequenceText}>#{stop.stop_sequence}</Text>
        </View>

        <View style={styles.statusArea}>
          {isNext && (
            <View style={styles.nextPill}>
              <Text style={styles.nextPillText}>NEXT STOP</Text>
            </View>
          )}
          <StatusBadge status={stop.status} />
        </View>
      </View>

      <Text style={styles.shopName} numberOfLines={1}>
        {stop.shop_name || 'Store'}
      </Text>

      <Text style={styles.addressText} numberOfLines={2}>
        {stop.shop_address || 'Address on record'}
      </Text>

      {stop.default_instructions && (
        <View style={styles.instructionBox}>
          <Ionicons name="information-circle-outline" size={14} color="#B45309" />
          <Text style={styles.instructionText} numberOfLines={2}>
            {stop.default_instructions}
          </Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.metaCol}>
          {stop.delivered_crates_count !== undefined && stop.delivered_crates_count > 0 ? (
            <Text style={styles.cratesText}>
              📦 {stop.delivered_crates_count} crates delivered
            </Text>
          ) : (
            <Text style={styles.metaSub}>Touch to manage delivery</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={handleOpenMaps}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={16} color={DelivColors.emeraldGreen} />
          <Text style={styles.navButtonText}>Map</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 10,
  },
  nextCard: {
    borderColor: DelivColors.emeraldGreen,
    borderWidth: 2,
    backgroundColor: '#FAFCFA',
  },
  completedCard: {
    opacity: 0.85,
    backgroundColor: '#F8FAF8',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sequenceBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceText: {
    fontSize: 13,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  statusArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextPill: {
    backgroundColor: DelivColors.emeraldGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nextPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: DelivColors.white,
    letterSpacing: 0.5,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: DelivColors.textPrimary,
    marginBottom: 3,
  },
  addressText: {
    fontSize: 13,
    color: DelivColors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.ivory,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
  },
  metaCol: {
    flex: 1,
  },
  cratesText: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.deepEmerald,
  },
  metaSub: {
    fontSize: 11,
    color: DelivColors.textMuted,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DelivColors.lightEmerald,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: DelivColors.emeraldGreen,
  },
});
