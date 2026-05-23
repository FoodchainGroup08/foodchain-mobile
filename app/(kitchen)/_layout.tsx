import { Stack } from 'expo-router';
import { Colors, Fonts } from '@/constants/colors';

export default function KitchenLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.espresso },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Kitchen Queue' }} />
    </Stack>
  );
}
