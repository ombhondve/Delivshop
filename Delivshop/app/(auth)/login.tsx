import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/AuthContext';
import { Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const { login, shopLogin } = useAuth();
  const [loginMode, setLoginMode] = useState<'shop' | 'staff'>('shop');
  const [shopId, setShopId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMsg(null);

    if (loginMode === 'shop') {
      if (!shopId.trim() || !password) {
        setErrorMsg('Please enter both your Shop ID and password.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await shopLogin({ shopId: shopId.trim(), password });
        if (res.mustChangePassword) {
          // Mandatory password reset on first login
          router.replace('/(auth)/complete-setup');
        } else {
          router.replace('/(shop)');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Login failed. Please verify your Shop ID and password.');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both your email address and password.');
        return;
      }
      setSubmitting(true);
      try {
        await login({ email: email.trim(), password });
        router.replace('/(driver)');
      } catch (err: any) {
        setErrorMsg(err.message || 'Login failed. Please verify credentials.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Delivshop
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {loginMode === 'shop' ? 'Shop Owner Mobile Portal' : 'Driver & Staff Portal'}
        </ThemedText>

        {/* Tab Selector */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, loginMode === 'shop' && styles.modeTabActive]}
            onPress={() => {
              setLoginMode('shop');
              setErrorMsg(null);
            }}
          >
            <ThemedText style={[styles.modeTabText, loginMode === 'shop' && styles.modeTabTextActive]}>
              Shop ID Login
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, loginMode === 'staff' && styles.modeTabActive]}
            onPress={() => {
              setLoginMode('staff');
              setErrorMsg(null);
            }}
          >
            <ThemedText style={[styles.modeTabText, loginMode === 'staff' && styles.modeTabTextActive]}>
              Staff / Driver Login
            </ThemedText>
          </TouchableOpacity>
        </View>

        {errorMsg && (
          <ThemedView style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
          </ThemedView>
        )}

        {loginMode === 'shop' ? (
          <TextInput
            style={styles.input}
            placeholder="Shop ID (e.g. 20261014001)"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            value={shopId}
            onChangeText={setShopId}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        )}

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>Log In</ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => {
            alert('To reset your credentials, please contact your supplier administrator.');
          }}
        >
          <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
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
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.two,
    opacity: 0.7,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: Spacing.two,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeTabTextActive: {
    fontWeight: '700',
    color: '#2563EB',
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
  input: {
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
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
  button: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  forgotText: {
    color: '#6B7280',
    fontSize: 13,
  },
});
