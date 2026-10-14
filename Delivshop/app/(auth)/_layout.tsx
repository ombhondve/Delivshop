import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="shop-login" options={{ title: 'Shop Owner Login' }} />
      <Stack.Screen name="driver-login" options={{ title: 'Driver Login' }} />
      <Stack.Screen name="login" options={{ title: 'Log In' }} />
      <Stack.Screen name="complete-setup" options={{ title: 'Set Permanent Password' }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
    </Stack>
  );
}
