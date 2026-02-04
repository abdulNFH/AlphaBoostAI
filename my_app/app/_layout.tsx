import { Stack } from 'expo-router';
import HeaderMenu from '@/components/HeaderMenu';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'AlphaBoost',
          headerLeft: () => <HeaderMenu />, // ← left-side button
        }}
      />
      <Stack.Screen name="training/index" options={{ title: 'Training' }} />
      <Stack.Screen name="games/index" options={{ title: 'Games' }} />
      
      <Stack.Screen name="reports/index" options={{ title: 'Reports' }} />
      <Stack.Screen name="account/index" options={{ title: 'Account' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
    </Stack>
  );
}
