import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Driver Portal' }} />
      <Stack.Screen name="deliveries" options={{ title: 'My Active Deliveries' }} />
    </Stack>
  );
}
