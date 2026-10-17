import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { DelivColors } from '@/constants/theme';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const normStatus = (status || '').toUpperCase();

  let bg = '#F1F5F9';
  let text = '#475569';
  let label = normStatus;

  switch (normStatus) {
    case 'DELIVERED':
    case 'COMPLETED':
    case 'PAID':
    case 'VALID':
    case 'RECONCILED':
      bg = DelivColors.lightEmerald;
      text = DelivColors.deepEmerald;
      label = normStatus === 'DELIVERED' ? 'Delivered' : normStatus;
      break;

    case 'IN_PROGRESS':
    case 'IN_DELIVERY':
    case 'ON_DUTY':
    case 'ACCEPTED':
    case 'EN_ROUTE_PICKUP':
    case 'EN_ROUTE_DROPOFF':
    case 'ARRIVED_PICKUP':
    case 'PICKED_UP':
      bg = '#E0F2FE';
      text = '#0369A1';
      label = normStatus.replace(/_/g, ' ');
      break;

    case 'ASSIGNED':
    case 'READY':
    case 'PENDING':
    case 'DRAFT':
    case 'COLLECTED':
      bg = DelivColors.ivory;
      text = '#92400E';
      label = normStatus.replace(/_/g, ' ');
      break;

    case 'FAILED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'EXPIRED':
    case 'DISPUTED':
      bg = DelivColors.errorBg;
      text = DelivColors.error;
      label = normStatus.replace(/_/g, ' ');
      break;

    case 'SKIPPED':
      bg = '#F3E8FF';
      text = '#6B21A8';
      label = 'Skipped';
      break;

    default:
      bg = '#F1F5F9';
      text = '#475569';
      label = normStatus.replace(/_/g, ' ');
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSmall ? styles.smallBadge : styles.mediumBadge,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: text },
          isSmall ? styles.smallText : styles.mediumText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  smallText: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  mediumText: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
