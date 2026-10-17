import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelivColors } from '@/constants/theme';

interface QuantityCounterProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  step?: number;
}

export const QuantityCounter: React.FC<QuantityCounterProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  unit,
  step = 1,
}) => {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  return (
    <View style={styles.container}>
      {(label || unit) && (
        <View style={styles.labelArea}>
          {label && <Text style={styles.label}>{label}</Text>}
          {unit && <Text style={styles.unitText}>{unit}</Text>}
        </View>
      )}

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.btn, value <= min && styles.btnDisabled]}
          onPress={handleDecrement}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Ionicons
            name="remove"
            size={20}
            color={value <= min ? '#CBD5E1' : DelivColors.deepEmerald}
          />
        </TouchableOpacity>

        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>{value}</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, value >= max && styles.btnDisabled]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={20}
            color={value >= max ? '#CBD5E1' : DelivColors.deepEmerald}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DelivColors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DelivColors.border,
    marginBottom: 8,
  },
  labelArea: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.textPrimary,
  },
  unitText: {
    fontSize: 12,
    color: DelivColors.textSecondary,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.6,
  },
  valueDisplay: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
  },
});
