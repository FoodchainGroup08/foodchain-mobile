import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getManagerDashboard } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { StatCard } from '@/components/ui/StatCard';
import { Colors, Fonts, Radius } from '@/constants/colors';

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ManagerDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const { data: stats, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['managerDashboard', selectedDate],
    queryFn: () => getManagerDashboard(selectedDate),
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  const today = new Date();
  const dateLabel = selectedDate
    ? `Performance for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    : `Today · ${formatDate(today)}`;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Manager'} 👋</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Failed to load dashboard data.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Stats grid */}
      {stats && (
        <>
          <View style={styles.statsGrid}>
            <StatCard title="Today's Orders" value={String(stats.totalOrders)} change={stats.ordersChange} icon="🛒" accentColor={Colors.amber} />
            <StatCard title="Today's Revenue" value={`₦${stats.totalRevenue.toLocaleString()}`} change={stats.revenueChange} icon="💰" accentColor={Colors.sageGreen} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard title="Avg Order Value" value={`₦${stats.averageOrderValue.toLocaleString()}`} icon="📈" accentColor={Colors.espresso} />
            {stats.completionRate !== undefined && (
              <StatCard title="Completion Rate" value={`${stats.completionRate.toFixed(0)}%`} icon="✅" accentColor={Colors.sageGreen} />
            )}
          </View>

          {/* Peak hour */}
          {stats.peakHour && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>⏰</Text>
              <View>
                <Text style={styles.infoTitle}>Peak Hour</Text>
                <Text style={styles.infoValue}>{stats.peakHour} · {stats.peakHourOrders ?? 0} orders</Text>
              </View>
            </View>
          )}

          {/* Order breakdown */}
          {(stats.dineInCount !== undefined || stats.takeawayCount !== undefined || stats.deliveryCount !== undefined) && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Order Breakdown</Text>
              <View style={styles.breakdownRow}>
                {[
                  { icon: '🪑', label: 'Dine In', value: stats.dineInCount ?? 0 },
                  { icon: '🥡', label: 'Takeaway', value: stats.takeawayCount ?? 0 },
                  { icon: '🛵', label: 'Delivery', value: stats.deliveryCount ?? 0 },
                ].map(b => (
                  <View key={b.label} style={styles.breakdownItem}>
                    <Text style={styles.breakdownIcon}>{b.icon}</Text>
                    <Text style={styles.breakdownValue}>{b.value}</Text>
                    <Text style={styles.breakdownLabel}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* Quick links */}
      <Text style={styles.sectionTitle}>Quick Access</Text>
      {[
        { icon: '⚡', label: 'Live Orders', route: '/(manager)/live-orders' },
        { icon: '📈', label: 'Daily Sales', route: '/(manager)/daily-sales' },
        { icon: '🔥', label: 'Popular Items', route: '/(manager)/popular-items' },
        { icon: '🗓', label: 'History', route: '/(manager)/history' },
      ].map(item => (
        <TouchableOpacity key={item.route} style={styles.quickLink} onPress={() => router.push(item.route as any)} activeOpacity={0.8}>
          <Text style={styles.quickLinkIcon}>{item.icon}</Text>
          <Text style={styles.quickLinkLabel}>{item.label}</Text>
          <Text style={styles.quickLinkArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, backgroundColor: Colors.espresso, paddingTop: 16 },
  greeting: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },
  dateLabel: { fontSize: 12, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  logoutBtn: { paddingTop: 4 },
  logoutText: { fontSize: 13, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.6)' },
  errorBox: { margin: 16, backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: 16, alignItems: 'center' },
  errorText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.error, marginBottom: 10 },
  retryBtn: { backgroundColor: Colors.error, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, marginTop: 8, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  infoIcon: { fontSize: 28 },
  infoTitle: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  infoValue: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.espresso, marginTop: 2 },
  breakdownCard: { margin: 16, marginTop: 8, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  breakdownItem: { alignItems: 'center', gap: 4 },
  breakdownIcon: { fontSize: 26 },
  breakdownValue: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.espresso },
  breakdownLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.textMuted, marginHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  quickLinkIcon: { fontSize: 22 },
  quickLinkLabel: { flex: 1, fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  quickLinkArrow: { fontSize: 22, color: Colors.textLight },
});
