import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getPopularItems, type PopularItem } from '@/services/api';
import { BarChart } from '@/components/charts/BarChart';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

const PERIODS = [
  { label: 'Today', value: undefined as string | undefined },
  { label: 'This Week', value: getISOWeekStart() },
];

function getISOWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().split('T')[0];
}

function fmtRevenue(v: number): string {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`;
  return `₦${v}`;
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) return null;
  const up = trend > 0;
  return (
    <View style={[styles.trendBadge, { backgroundColor: up ? '#DCFCE7' : '#FEE2E2' }]}>
      <Text style={[styles.trendText, { color: up ? '#16A34A' : '#DC2626' }]}>
        {up ? '↑' : '↓'} {Math.abs(trend)}%
      </Text>
    </View>
  );
}

export default function PopularItemsScreen() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const date = PERIODS[periodIdx].value;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['popularItems', date],
    queryFn: () => getPopularItems(date),
  });

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;
  if (items.length === 0) return <EmptyState icon="🔥" title="No data yet" subtitle="Popular items will appear once orders come in." />;

  const top10 = items.slice(0, 10);
  const chartData = top10.map(item => ({ label: item.name, value: item.quantitySold }));

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Period filter */}
      <View style={styles.filterRow}>
        {PERIODS.map((p, i) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.filterChip, i === periodIdx && styles.filterChipActive]}
            onPress={() => setPeriodIdx(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, i === periodIdx && styles.filterChipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{items.reduce((s, i) => s + i.quantitySold, 0)}</Text>
          <Text style={styles.summaryLabel}>Total Sold</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{fmtRevenue(items.reduce((s, i) => s + i.revenue, 0))}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{items.length}</Text>
          <Text style={styles.summaryLabel}>Items</Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🔥 Top Items by Orders</Text>
        <BarChart
          data={chartData}
          color={Colors.burntOrange}
          height={160}
          formatLabel={l => l.length > 8 ? l.slice(0, 8) + '…' : l}
        />
      </View>

      {/* Rankings list */}
      <View style={styles.tableCard}>
        <Text style={styles.tableTitle}>Full Rankings</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col, styles.colRank, styles.headerText]}>#</Text>
          <Text style={[styles.col, styles.colName, styles.headerText]}>Item</Text>
          <Text style={[styles.col, styles.colNum, styles.headerText]}>Sold</Text>
          <Text style={[styles.col, styles.colNum, styles.headerText]}>Revenue</Text>
          <Text style={[styles.col, styles.colTrend, styles.headerText]}>Trend</Text>
        </View>
        {items.map((item, i) => (
          <View key={item.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
            <Text style={[styles.col, styles.colRank, styles.rankText, i < 3 && styles.rankTop]}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </Text>
            <View style={[styles.col, styles.colName]}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
            </View>
            <Text style={[styles.col, styles.colNum, styles.cellText]}>{item.quantitySold}</Text>
            <Text style={[styles.col, styles.colNum, styles.cellText]}>{fmtRevenue(item.revenue)}</Text>
            <View style={[styles.col, styles.colTrend]}>
              <TrendBadge trend={item.trend} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 14, paddingBottom: 32 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  filterChipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  filterChipTextActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  summaryLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 14 },
  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  tableTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  tableRowEven: { backgroundColor: Colors.background },
  col: { justifyContent: 'center' },
  colRank: { width: 32 },
  colName: { flex: 1, paddingRight: 6 },
  colNum: { width: 56, alignItems: 'flex-end' },
  colTrend: { width: 60, alignItems: 'flex-end' },
  headerText: { fontSize: 10, fontFamily: Fonts.semiBold, color: Colors.textMuted, textTransform: 'uppercase' },
  rankText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.textMuted, textAlign: 'center' },
  rankTop: { color: Colors.amber },
  itemName: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text },
  itemCategory: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
  cellText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text, textAlign: 'right' },
  trendBadge: { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  trendText: { fontSize: 10, fontFamily: Fonts.bold },
});
