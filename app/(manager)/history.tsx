import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getManagerHistory, type ManagerHistoryDay } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function fmtRevenue(v: number): string {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`;
  return `₦${v}`;
}

export default function ManagerHistoryScreen() {
  const [presetIdx, setPresetIdx] = useState(0);

  const days = PRESETS[presetIdx].days;
  const from = daysAgoISO(days);
  const to = todayISO();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['managerHistory', from, to],
    queryFn: () => getManagerHistory(from, to),
  });

  const totalRevenue = history.reduce((s, d) => s + d.totalRevenue, 0);
  const totalOrders = history.reduce((s, d) => s + d.totalOrders, 0);
  const completedOrders = history.reduce((s, d) => s + d.completedOrders, 0);
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Period selector */}
      <View style={styles.filterRow}>
        {PRESETS.map((p, i) => (
          <TouchableOpacity
            key={p.label}
            style={[styles.filterChip, i === presetIdx && styles.filterChipActive]}
            onPress={() => setPresetIdx(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, i === presetIdx && styles.filterChipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {history.length === 0 ? (
        <EmptyState icon="🗓" title="No history" subtitle="No order history found for this period." />
      ) : (
        <>
          {/* Aggregate summary */}
          <View style={styles.aggregateCard}>
            <Text style={styles.aggregateTitle}>Period Summary</Text>
            <View style={styles.aggregateGrid}>
              <View style={styles.aggregateItem}>
                <Text style={styles.aggregateValue}>₦{totalRevenue.toLocaleString()}</Text>
                <Text style={styles.aggregateLabel}>Total Revenue</Text>
              </View>
              <View style={styles.aggregateDivider} />
              <View style={styles.aggregateItem}>
                <Text style={styles.aggregateValue}>{totalOrders}</Text>
                <Text style={styles.aggregateLabel}>Total Orders</Text>
              </View>
              <View style={styles.aggregateDivider} />
              <View style={styles.aggregateItem}>
                <Text style={styles.aggregateValue}>{completionRate.toFixed(0)}%</Text>
                <Text style={styles.aggregateLabel}>Completion</Text>
              </View>
            </View>
          </View>

          {/* Daily breakdown */}
          {history.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function DayCard({ day }: { day: ManagerHistoryDay }) {
  const [expanded, setExpanded] = useState(false);
  const rate = day.totalOrders > 0 ? (day.completedOrders / day.totalOrders) * 100 : 0;

  return (
    <TouchableOpacity style={styles.dayCard} onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
      <View style={styles.dayHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayDate}>{fmtDate(day.date)}</Text>
          <Text style={styles.daySub}>{day.totalOrders} orders · {rate.toFixed(0)}% completion</Text>
        </View>
        <View style={styles.dayRevBlock}>
          <Text style={styles.dayRevenue}>{fmtRevenue(day.totalRevenue)}</Text>
          <Text style={[styles.chevron, expanded && styles.chevronOpen]}>›</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.dayDetail}>
          <View style={styles.detailDivider} />
          <View style={styles.detailGrid}>
            <DetailItem label="Completed" value={String(day.completedOrders)} color={Colors.sageGreen} />
            <DetailItem label="Cancelled" value={String(day.cancelledOrders)} color={Colors.error} />
            <DetailItem label="In Progress" value={String(day.inProgressOrders)} color={Colors.amber} />
          </View>
          <View style={styles.detailGrid}>
            <DetailItem label="Avg Order" value={fmtRevenue(day.avgOrderValue)} />
            <DetailItem label="Dine In" value={String(day.dineInCount)} />
            <DetailItem label="Takeaway" value={String(day.takeawayCount)} />
            <DetailItem label="Delivery" value={String(day.deliveryCount)} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetailItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  filterChipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  filterChipTextActive: { color: '#fff' },
  aggregateCard: { backgroundColor: Colors.espresso, borderRadius: Radius.lg, padding: 18 },
  aggregateTitle: { fontSize: 12, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.65)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  aggregateGrid: { flexDirection: 'row', alignItems: 'center' },
  aggregateItem: { flex: 1, alignItems: 'center' },
  aggregateValue: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },
  aggregateLabel: { fontSize: 11, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  aggregateDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  dayCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayDate: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  daySub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  dayRevBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayRevenue: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  chevron: { fontSize: 22, color: Colors.textLight, transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  dayDetail: { marginTop: 10 },
  detailDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  detailItem: { minWidth: 70, alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, padding: 8, flex: 1 },
  detailValue: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  detailLabel: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
});
