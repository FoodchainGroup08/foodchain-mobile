import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Fonts } from '@/constants/colors';

function TabIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

function SignOutBtn() {
  const router = useRouter();
  const { logout } = useAuthStore();
  return (
    <TouchableOpacity
      style={styles.signOutBtn}
      onPress={async () => { await logout(); router.replace('/(auth)/login'); }}
      activeOpacity={0.8}
    >
      <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.75)" />
    </TouchableOpacity>
  );
}

export default function ManagerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: Colors.amber,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontFamily: Fonts.medium },
        headerStyle: { backgroundColor: Colors.espresso },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'analytics' : 'analytics-outline'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live-orders"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'flash' : 'flash-outline'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily-sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'trending-up' : 'trending-up-outline'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="popular-items"
        options={{
          title: 'Popular',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'star' : 'star-outline'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  signOutBtn: { marginRight: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
