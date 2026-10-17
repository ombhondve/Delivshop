import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { DelivColors } from '@/constants/theme';

export default function DriverTabsLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== 'DRIVER') {
        router.replace('/(auth)/driver-login');
      }
    }
  }, [isAuthenticated, user, isLoading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: DelivColors.emeraldGreen,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: DelivColors.white,
          borderTopColor: DelivColors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 62 : 84,
          paddingBottom: Platform.OS === 'android' ? 8 : 24,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="speedometer-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Deliveries',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
