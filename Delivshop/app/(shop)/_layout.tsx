import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Shop Dashboard' }} />
      <Stack.Screen name="orders" options={{ title: 'Manage Orders' }} />
    </Stack>
  );
}
