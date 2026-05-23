import { Tabs, Stack } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/stores/cartStore';
import { Colors, Fonts, Radius } from '@/constants/colors';

function CartBadge() {
  const router = useRouter();
  const totalItems = useCartStore(s => s.totalItems());
  if (totalItems === 0) return null;
  return (
    <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(customer)/cart')} activeOpacity={0.85}>
      <Text style={styles.cartIcon}>🛒</Text>
      <View style={styles.cartBadge}>
        <Text style={styles.cartBadgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: Colors.amber,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: Fonts.medium, marginTop: -2 },
        headerStyle: { backgroundColor: Colors.espresso },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17 },
        headerRight: () => <CartBadge />,
      }}
    >
      <Tabs.Screen name="branches" options={{ title: 'Branches', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏪</Text>, headerTitle: 'FoodChain', headerRight: () => null }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🍽️</Text> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🕐</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>, headerRight: () => null }} />
      {/* Stack screens — hidden from tab bar */}
      <Tabs.Screen name="cart" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="checkout" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="confirmation" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="ai" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  cartBtn: { marginRight: 12, position: 'relative' },
  cartIcon: { fontSize: 22 },
  cartBadge: { position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.amber, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  cartBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.espresso },
});
