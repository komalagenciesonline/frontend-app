import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="order-details" />
      <Stack.Screen name="edit-order" />
      <Stack.Screen name="new-order" />
      <Stack.Screen name="order-summary" />
    </Stack>
  );
}
