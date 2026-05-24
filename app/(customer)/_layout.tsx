import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/stores/cartStore';
import { getUnreadNotificationCount, getUserPreferencesV2 } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { PreferencesOnboardingModal } from '@/components/PreferencesOnboardingModal';
import { Colors, Fonts, Radius } from '@/constants/colors';

function CartBadge() {
  const router = useRouter();
  const totalItems = useCartStore(s => s.totalItems());
  if (totalItems === 0) return null;
  return (
    <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(customer)/cart')} activeOpacity={0.85}>
      <Ionicons name="cart-outline" size={24} color="#fff" />
      <View style={styles.cartBadge}>
        <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
      </View>
    </TouchableOpacity>
  );
}

function NotificationBell() {
  const router = useRouter();
  const { data: count = 0 } = useQuery({
    queryKey: ['notifCount'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60_000,
  });
  return (
    <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(customer)/notifications')} activeOpacity={0.85}>
      <Ionicons name={count > 0 ? 'notifications' : 'notifications-outline'} size={24} color="#fff" />
      {count > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function TabIcon({ name, color, size = 22 }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function CustomerLayout() {
  const { isAuthenticated } = useAuthStore();
  const [showPrefsModal, setShowPrefsModal] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ['preferencesV2'],
    queryFn: getUserPreferencesV2,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (prefs && prefs.preferencesCompleted === false) {
      const timer = setTimeout(() => setShowPrefsModal(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [prefs]);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, height: 62, paddingBottom: 8, paddingTop: 6 },
          tabBarActiveTintColor: Colors.amber,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontFamily: Fonts.medium, marginTop: -2 },
          headerStyle: { backgroundColor: Colors.espresso },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17 },
          headerRight: () => <CartBadge />,
        }}
      >
        <Tabs.Screen
          name="branches"
          options={{
            title: 'Branches',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'storefront' : 'storefront-outline'} color={color} />,
            headerTitle: 'FoodChain',
            headerRight: () => (
              <View style={{ flexDirection: 'row', gap: 4, marginRight: 4 }}>
                <NotificationBell />
                <CartBadge />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'restaurant' : 'restaurant-outline'} color={color} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'time' : 'time-outline'} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} color={color} />,
            headerRight: () => null,
          }}
        />
        {/* Stack screens — hidden from tab bar */}
        <Tabs.Screen name="setup-location" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="cart" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="checkout" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="confirmation" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="ai" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="order/[id]" options={{ href: null, headerShown: false }} />
      </Tabs>

      <PreferencesOnboardingModal
        visible={showPrefsModal}
        onClose={() => setShowPrefsModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cartBtn: { marginRight: 8, position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18,
    borderRadius: 9, backgroundColor: Colors.amber,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  cartBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.espresso },
  bellBtn: { marginRight: 4, position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
    borderRadius: 8, backgroundColor: Colors.error,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  bellBadgeText: { fontSize: 9, fontFamily: Fonts.bold, color: '#fff' },
});
