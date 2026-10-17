import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DelivColors } from '@/constants/theme';

interface DriverHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  shiftStatus?: 'NOT_STARTED' | 'ON_DUTY' | 'COMPLETED';
  rightElement?: React.ReactNode;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  shiftStatus,
  rightElement,
}) => {
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const getShiftBadge = () => {
    if (!shiftStatus) return null;
    let bg = '#F1F5F9';
    let text = '#64748B';
    let label = 'OFF DUTY';

    if (shiftStatus === 'ON_DUTY') {
      bg = DelivColors.lightEmerald;
      text = DelivColors.deepEmerald;
      label = 'ON DUTY';
    } else if (shiftStatus === 'COMPLETED') {
      bg = '#E2E8F0';
      text = '#475569';
      label = 'SHIFT CLOSED';
    }

    return (
      <View style={[styles.shiftBadge, { backgroundColor: bg }]}>
        <View
          style={[
            styles.dot,
            { backgroundColor: shiftStatus === 'ON_DUTY' ? DelivColors.emeraldGreen : '#94A3B8' },
          ]}
        />
        <Text style={[styles.shiftBadgeText, { color: text }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={DelivColors.deepEmerald} />
          </TouchableOpacity>
        )}

        <View style={styles.titleArea}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightArea}>
          {getShiftBadge()}
          {rightElement}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: DelivColors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DelivColors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleArea: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 2,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shiftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
