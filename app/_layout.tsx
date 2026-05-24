import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Poppins_400Regular, Poppins_500Medium,
  Poppins_600SemiBold, Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/authStore';
import { on } from '@/constants/eventEmitter';
import { Colors, Fonts } from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';

(Text as any).defaultProps = (Text as any).defaultProps ?? {};
(Text as any).defaultProps.style = { fontFamily: Fonts.regular };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FoodChain Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F0A500',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF7D',
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'foodchain-mobile',
    });
    return token.data;
  } catch {
    return null;
  }
}

function RootLayoutNav() {
  const { user, isAuthenticated, isLoading, logout, bootstrap } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => { bootstrap(); }, []);

  useEffect(() => {
    const unsub = on('foodchain:unauthorized', async () => {
      await logout();
      router.replace('/(auth)/login');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications().catch(() => {});

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.orderId) {
        router.push(`/(customer)/order/${data.orderId}` as any);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!navState?.key) return;
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/landing');
      return;
    }
    const role = user?.role;
    const inCustomer = segments[0] === '(customer)';
    const inKitchen = segments[0] === '(kitchen)';
    const inManager = segments[0] === '(manager)';
    const inAdmin = segments[0] === '(admin)';
    if (inAuth) {
      if (role === 'Customer') router.replace('/(customer)/branches');
      else if (role === 'Kitchen Staff') router.replace('/(kitchen)/');
      else if (role === 'Branch Manager') router.replace('/(manager)/');
      else if (role === 'Admin') router.replace('/(admin)/');
    } else {
      if (role === 'Customer' && !inCustomer) router.replace('/(customer)/branches');
      else if (role === 'Kitchen Staff' && !inKitchen) router.replace('/(kitchen)/');
      else if (role === 'Branch Manager' && !inManager) router.replace('/(manager)/');
      else if (role === 'Admin' && !inAdmin) router.replace('/(admin)/');
    }
  }, [navState?.key, isLoading, isAuthenticated, user?.role]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.amber} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(kitchen)" />
      <Stack.Screen name="(manager)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium,
    Poppins_600SemiBold, Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.amber} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <RootLayoutNav />
      <Toast />
    </QueryClientProvider>
  );
}
