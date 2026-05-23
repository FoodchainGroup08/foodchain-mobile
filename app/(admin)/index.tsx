import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getAdminOverview, getBranchComparison, getAdminTrends, getAdminOperational } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { StatCard } from '@/components/ui/StatCard';
import { BarChart } from '@/components/charts/BarChart';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { useState } from 'react';

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function daysAgoISO(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function todayISO() { return new Date().toISOString().split('T')[0]; }

function fmtRevenue(v: number): string {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`;
  return `₦${v}`;
}

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [periodIdx, setPeriodIdx] = useState(0);

  const days = PERIODS[periodIdx].days;
  const startDate = daysAgoISO(days);
  const endDate = todayISO();

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['adminOverview', startDate, endDate],
    queryFn: () => getAdminOverview(startDate, endDate),
  });

  const { data: branches = [], isLoading: brLoading } = useQuery({
    queryKey: ['branchComparison', startDate, endDate],
    queryFn: () => getBranchComparison(startDate, endDate),
  });

  const { data: operational } = useQuery({
    queryKey: ['adminOperational', startDate, endDate],
    queryFn: () => getAdminOperational(startDate, endDate),
  });

  const isLoading = ovLoading || brLoading;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  const branchChartData = branches.map(b => ({ label: b.name ?? b.branchId, value: b.totalRevenue }));
  const peakHourData = (operational?.ordersByHour ?? []).map(h => ({ label: h.hour.replace(':00', ''), value: h.orders }));

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'Admin'} 👋</Text>
          <Text style={styles.subtitle}>Head Office Overview</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p, i) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.periodChip, i === periodIdx && styles.periodChipActive]}
            onPress={() => setPeriodIdx(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodText, i === periodIdx && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {overview && (
        <>
          {/* KPI grid */}
          <View style={styles.statsGrid}>
            <StatCard title="Total Revenue" value={fmtRevenue(overview.totalRevenue)} change={overview.revenueGrowthPercent} icon="💰" accentColor={Colors.sageGreen} />
            <StatCard title="Total Orders" value={String(overview.totalOrders)} change={overview.ordersGrowthPercent} icon="🛒" accentColor={Colors.amber} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard title="Avg Order Value" value={fmtRevenue(overview.avgOrderValue)} icon="📈" accentColor={Colors.espresso} />
            <StatCard title="Completion Rate" value={`${overview.completionRate.toFixed(0)}%`} icon="✅" accentColor={Colors.sageGreen} />
          </View>

          {/* Branch highlights */}
          {overview.topPerformingBranch && (
            <View style={styles.highlightCard}>
              <View style={styles.highlightItem}>
                <Text style={styles.highlightIcon}>🏆</Text>
                <View>
                  <Text style={styles.highlightLabel}>Top Branch</Text>
                  <Text style={styles.highlightValue}>{overview.topPerformingBranch}</Text>
                </View>
              </View>
              {overview.fastestBranch && (
                <View style={styles.highlightItem}>
                  <Text style={styles.highlightIcon}>⚡</Text>
                  <View>
                    <Text style={styles.highlightLabel}>Fastest</Text>
                    <Text style={styles.highlightValue}>{overview.fastestBranch}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Branch revenue chart */}
      {branchChartData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>🏪 Revenue by Branch</Text>
          <BarChart
            data={branchChartData}
            color={Colors.amber}
            height={160}
            formatValue={v => fmtRevenue(v)}
            formatLabel={l => l.length > 8 ? l.slice(0, 8) + '…' : l}
          />
        </View>
      )}

      {/* Peak hour chart */}
      {peakHourData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>⏱ Orders by Hour</Text>
          <BarChart
            data={peakHourData}
            color={Colors.espresso}
            height={120}
          />
        </View>
      )}

      {/* Branch table */}
      {branches.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Branch Comparison</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, styles.colBranch, styles.headerText]}>Branch</Text>
            <Text style={[styles.col, styles.colNum, styles.headerText]}>Orders</Text>
            <Text style={[styles.col, styles.colNum, styles.headerText]}>Revenue</Text>
            <Text style={[styles.col, styles.colNum, styles.headerText]}>Rate</Text>
          </View>
          {branches.map((b, i) => (
            <View key={b.branchId} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.col, styles.colBranch, styles.cellText]} numberOfLines={1}>{b.name ?? b.branchId}</Text>
              <Text style={[styles.col, styles.colNum, styles.cellText]}>{b.totalOrders}</Text>
              <Text style={[styles.col, styles.colNum, styles.cellText]}>{fmtRevenue(b.totalRevenue)}</Text>
              <Text style={[styles.col, styles.colNum, styles.cellText]}>{b.completionRate.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, backgroundColor: Colors.espresso, paddingTop: 16 },
  greeting: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },
  subtitle: { fontSize: 12, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  logoutText: { fontSize: 13, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.6)', paddingTop: 4 },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  periodChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  periodText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  periodTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 4, marginBottom: 6 },
  highlightCard: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 6 },
  highlightItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  highlightIcon: { fontSize: 26 },
  highlightLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted },
  highlightValue: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso, marginTop: 2 },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginBottom: 12 },
  chartTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 14 },
  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 16, marginBottom: 12 },
  tableTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowEven: { backgroundColor: Colors.background },
  col: { fontSize: 13 },
  colBranch: { flex: 1, paddingRight: 4, fontFamily: Fonts.medium, color: Colors.text },
  colNum: { width: 60, textAlign: 'right', fontFamily: Fonts.regular, color: Colors.text },
  headerText: { fontFamily: Fonts.semiBold, color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase' },
  cellText: {},
});
