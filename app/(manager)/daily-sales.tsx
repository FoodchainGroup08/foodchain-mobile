import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDailySales } from '@/services/api';
import { BarChart } from '@/components/charts/BarChart';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

function fmtRevenue(v: number): string {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`;
  return `₦${v}`;
}

export default function DailySalesScreen() {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['dailySales'],
    queryFn: () => getDailySales(),
  });

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;
  if (sales.length === 0) return <EmptyState icon="📊" title="No sales data" subtitle="No sales recorded for today yet." />;

  const totalRevenue = sales.reduce((s, h) => s + h.revenue, 0);
  const totalOrders = sales.reduce((s, h) => s + h.orders, 0);
  const peakHour = sales.reduce((p, c) => c.revenue > p.revenue ? c : p, sales[0]);

  const revenueData = sales.map(h => ({ label: h.hour, value: h.revenue }));
  const ordersData = sales.map(h => ({ label: h.hour, value: h.orders }));

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>₦{totalRevenue.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalOrders}</Text>
          <Text style={styles.summaryLabel}>Total Orders</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{peakHour.hour}</Text>
          <Text style={styles.summaryLabel}>Peak Hour</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Hourly Revenue</Text>
        <BarChart
          data={revenueData}
          color={Colors.amber}
          height={160}
          formatValue={v => fmtRevenue(v)}
          formatLabel={l => l.replace(':00', '')}
        />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🛒 Hourly Orders</Text>
        <BarChart
          data={ordersData}
          color={Colors.espresso}
          height={120}
          formatLabel={l => l.replace(':00', '')}
        />
      </View>

      {/* Hourly table */}
      <View style={styles.tableCard}>
        <Text style={styles.tableTitle}>Hourly Breakdown</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.tableCellHeader]}>Hour</Text>
          <Text style={[styles.tableCell, styles.tableCellHeader, styles.tableCellRight]}>Revenue</Text>
          <Text style={[styles.tableCell, styles.tableCellHeader, styles.tableCellRight]}>Orders</Text>
        </View>
        {sales.map((h, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
            <Text style={styles.tableCell}>{h.hour}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>{fmtRevenue(h.revenue)}</Text>
            <Text style={[styles.tableCell, styles.tableCellRight]}>{h.orders}</Text>
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
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  summaryLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 14 },
  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  tableTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowEven: { backgroundColor: Colors.background },
  tableCell: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: Colors.text },
  tableCellHeader: { fontFamily: Fonts.semiBold, color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase' },
  tableCellRight: { textAlign: 'right' },
});
