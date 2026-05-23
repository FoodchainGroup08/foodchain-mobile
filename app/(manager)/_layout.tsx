import { Tabs } from 'expo-router';
import { Colors, Fonts } from '@/constants/colors';

export default function ManagerLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
      <Tabs.Screen name="live-orders" options={{ title: 'Live', tabBarIcon: ({ color }) => <TabIcon emoji="⚡" color={color} /> }} />
      <Tabs.Screen name="daily-sales" options={{ title: 'Sales', tabBarIcon: ({ color }) => <TabIcon emoji="📈" color={color} /> }} />
      <Tabs.Screen name="popular-items" options={{ title: 'Popular', tabBarIcon: ({ color }) => <TabIcon emoji="🔥" color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <TabIcon emoji="🗓" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === Colors.amber ? 1 : 0.5 }}>{emoji}</Text>;
}
