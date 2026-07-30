import { Stack } from 'expo-router';

export default function ItemsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new-item" />
      <Stack.Screen name="edit-item" />
      <Stack.Screen name="item-analytics" />
      <Stack.Screen name="brands" />
    </Stack>
  );
}
