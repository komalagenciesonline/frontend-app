import { Stack } from 'expo-router';

export default function RetailersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new-retailer" />
      <Stack.Screen name="edit-retailer" />
    </Stack>
  );
}
