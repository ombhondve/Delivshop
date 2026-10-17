import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelivColors } from '@/constants/theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  icon?: any;
  color?: string;
  variant?: 'primary' | 'emerald' | 'amber' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  iconName,
  icon,
  color,
  variant = 'neutral',
}) => {
  let iconBg: string = '#F1F5F9';
  let iconColor: string = color || DelivColors.textSecondary;

  if (!color) {
    if (variant === 'emerald') {
      iconBg = DelivColors.lightEmerald;
      iconColor = DelivColors.emeraldGreen;
    } else if (variant === 'amber') {
      iconBg = DelivColors.warningBg;
      iconColor = DelivColors.warning;
    } else if (variant === 'primary') {
      iconBg = '#E0F2FE';
      iconColor = '#0284C7';
    }
  }

  const effectiveIcon = (iconName || icon || 'cube-outline') as keyof typeof Ionicons.glyphMap;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={effectiveIcon} size={18} color={iconColor} />
        </View>
        <Text style={styles.valueText}>{value}</Text>
      </View>
      <Text style={styles.labelText}>{label}</Text>
      {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    backgroundColor: DelivColors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: DelivColors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: DelivColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 11,
    color: DelivColors.textMuted,
    marginTop: 2,
  },
});
