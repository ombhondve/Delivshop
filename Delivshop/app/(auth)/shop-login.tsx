import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';

export default function ShopLoginScreen() {
  const { shopLogin } = useAuth();
  const [shopId, setShopId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (submitting) return;
    setErrorMsg(null);

    const cleanShopId = shopId.trim();
    if (!cleanShopId) {
      setErrorMsg('Please enter your unique Shop ID (e.g. 20261014001).');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your access password or temporary security key.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await shopLogin({ shopId: cleanShopId, password });
      if (res.mustChangePassword) {
        // Mandatory first-login setup
        router.replace('/(auth)/complete-setup');
      } else {
        router.replace('/(shop)');
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Authentication failed. Please verify your Shop ID and password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
            disabled={submitting}
          >
            <Text style={styles.backButtonText}>← Back to Portal Selection</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>MERCHANT FACILITY PORTAL</Text>
            </View>
            <Text style={styles.heading}>Shop Owner Sign In</Text>
            <Text style={styles.subheading}>
              Enter your assigned Shop ID and password to access orders, stock replenishment, and billing
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Authentication Error</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Shop ID */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>OFFICIAL SHOP ID</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="e.g. 20261014001"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
                value={shopId}
                onChangeText={(val) => {
                  setShopId(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!submitting}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SECURITY ACCESS KEY</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.toggleBtnText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitBtnText}>Verifying Clearance...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Sign In to Shop Dashboard →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityNoticeText}>
              Need to initialize credentials or reset your temporary password? Contact your central facility administrator.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16805D',
  },
  headerBlock: {
    marginBottom: 20,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16805D',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#20342C',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12.5,
    color: '#B91C1C',
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#123B32',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#20342C',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputControl: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#20342C',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#20342C',
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#16805D',
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#16805D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityNotice: {
    marginTop: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  securityNoticeText: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
});
