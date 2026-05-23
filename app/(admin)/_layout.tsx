import { Tabs } from 'expo-router';
import { Colors, Fonts } from '@/constants/colors';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: Colors.amber,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontFamily: Fonts.medium },
        headerStyle: { backgroundColor: Colors.espresso },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: Fonts.bold, fontSize: 17 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Analytics', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
      <Tabs.Screen name="branches" options={{ title: 'Branches', tabBarIcon: ({ color }) => <TabIcon emoji="🏪" color={color} /> }} />
      <Tabs.Screen name="menu-catalogue" options={{ title: 'Menu', tabBarIcon: ({ color }) => <TabIcon emoji="🍽️" color={color} /> }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <TabIcon emoji="🔔" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === Colors.amber ? 1 : 0.5 }}>{emoji}</Text>;
}
