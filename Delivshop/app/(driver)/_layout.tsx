import React from 'react';
import { Stack } from 'expo-router';

export default function DriverRootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F8F2' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="shift-start" options={{ headerShown: false }} />
      <Stack.Screen name="shift-end" options={{ headerShown: false }} />
      <Stack.Screen name="inspection" options={{ headerShown: false }} />
      <Stack.Screen name="dispatch/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="delivery/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="reconciliation" options={{ headerShown: false }} />
      <Stack.Screen name="incident" options={{ headerShown: false }} />
    </Stack>
  );
}
