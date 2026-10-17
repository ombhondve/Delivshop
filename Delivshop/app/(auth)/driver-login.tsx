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

export default function DriverLoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your driver email or employee ID.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your fleet access password.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: cleanEmail, password });
      router.replace('/(driver)');
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Authentication failed. Please verify your driver credentials.'
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
          style={{ flex: 1 }}
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
              <Text style={styles.roleBadgeText}>FLEET LOGISTICS PERSONNEL</Text>
            </View>
            <Text style={styles.heading}>Fleet Driver Sign In</Text>
            <Text style={styles.subheading}>
              Authenticate using your employee credentials to start today's delivery run and GPS navigation
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
            {/* Driver Identifier */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMPLOYEE EMAIL / IDENTIFIER</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="driver@delivshop.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!submitting}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FLEET ACCESS PASSWORD</Text>
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
                  <Text style={styles.submitBtnText}>Verifying Driver Session...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Sign In to Driver Portal →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityNoticeText}>
              Assigned vehicles and GPS routing require active session verification. For roster adjustments, contact fleet dispatch.
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
    flexGrow: 1,
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
    color: '#123B32',
  },
  headerBlock: {
    marginBottom: 20,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#123B32',
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
    color: '#123B32',
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#123B32',
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
