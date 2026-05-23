import { Stack } from 'expo-router';
import { Colors, Fonts } from '@/constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.espresso,
        headerTitleStyle: { fontFamily: Fonts.semiBold, fontSize: 16 },
        headerBackTitle: '',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="landing" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'New Password' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
    </Stack>
  );
}
