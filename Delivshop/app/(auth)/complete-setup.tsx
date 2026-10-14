import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/AuthContext';
import { Spacing } from '@/constants/theme';

export default function CompleteSetupScreen() {
  const { completeSetup } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCompleteSetup = async () => {
    setErrorMsg(null);

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setErrorMsg('Password must contain uppercase, lowercase, number, and a special character.');
      return;
    }

    setSubmitting(true);
    try {
      await completeSetup(newPassword);
      router.replace('/(shop)');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Set Permanent Password
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your supplier created your account with a temporary password. Choose a secure permanent password to activate your shop dashboard.
        </ThemedText>

        {errorMsg && (
          <ThemedView style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
          </ThemedView>
        )}

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="New Permanent Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            style={styles.showPasswordBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            <ThemedText style={styles.showPasswordText}>
              {showPassword ? 'Hide' : 'Show'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm New Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <ThemedText style={styles.requirementsText}>
          Must be at least 8 characters with uppercase, lowercase, numbers, and symbols.
        </ThemedText>

        <TouchableOpacity
          style={styles.button}
          onPress={handleCompleteSetup}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>Activate Account & Enter Shop</ThemedText>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.three,
    opacity: 0.75,
    lineHeight: 20,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: Spacing.three,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  showPasswordBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  showPasswordText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  requirementsText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
