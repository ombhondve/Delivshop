import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserRole } from '@/types/auth';
import { authApi } from '@/services/api/authApi';
import { Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SHOP');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setMessage('All fields are required');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await authApi.register({ name, email, password, role });
      setMessage('Registration successful! Please sign in.');
    } catch (err: any) {
      setMessage(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Register Account
        </ThemedText>

        {message && (
          <ThemedView style={styles.msgBox}>
            <ThemedText style={styles.msgText}>{message}</ThemedText>
          </ThemedView>
        )}

        <TextInput
          style={styles.input}
          placeholder="Full Name / Business Name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 8 chars)"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'SHOP' && styles.roleBtnActive]}
            onPress={() => setRole('SHOP')}>
            <ThemedText style={role === 'SHOP' ? styles.roleTextActive : styles.roleText}>
              Shop Owner
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'DRIVER' && styles.roleBtnActive]}
            onPress={() => setRole('DRIVER')}>
            <ThemedText style={role === 'DRIVER' ? styles.roleTextActive : styles.roleText}>
              Driver
            </ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
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
    fontSize: 26,
    marginBottom: Spacing.three,
  },
  msgBox: {
    backgroundColor: '#EFF6FF',
    padding: Spacing.three,
    borderRadius: 8,
  },
  msgText: {
    color: '#1D4ED8',
    fontSize: 14,
  },
  input: {
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#2563EB',
    fontWeight: '700',
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
});
