import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelivColors } from '@/constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  confirmColor,
  onConfirm,
  onCancel,
  iconName = 'alert-circle-outline',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel} disabled={isLoading}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isDestructive
                      ? DelivColors.errorBg
                      : DelivColors.lightEmerald,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={28}
                  color={isDestructive ? DelivColors.error : DelivColors.emeraldGreen}
                />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor:
                        confirmColor ||
                        (isDestructive ? DelivColors.error : DelivColors.emeraldGreen),
                    },
                    isLoading && styles.btnDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: DelivColors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: DelivColors.deepEmerald,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: DelivColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: DelivColors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DelivColors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
