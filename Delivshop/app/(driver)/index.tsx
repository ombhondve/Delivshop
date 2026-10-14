import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_USER_DRIVER } from '@/mock/mockData';
import { Spacing } from '@/constants/theme';

export default function DriverHomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedView style={styles.header}>
            <ThemedText type="title">Driver Portal</ThemedText>
            <ThemedText style={styles.driverName}>{MOCK_USER_DRIVER.name}</ThemedText>
            <ThemedText style={styles.status}>Status: Available / On Duty</ThemedText>
          </ThemedView>

          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Active Assigned Tasks</ThemedText>
            <ThemedText style={styles.cardDesc}>
              You have 1 delivery assigned and ready for transit.
            </ThemedText>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(driver)/deliveries')}>
              <ThemedText style={styles.actionBtnText}>Open Deliveries View →</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    marginBottom: Spacing.two,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  status: {
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#4B5563',
    fontSize: 14,
  },
  actionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
