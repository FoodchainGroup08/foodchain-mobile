import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  Alert, Modal, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBranches, generateReport, getReports, getReportById, type ReportType, type Report, type ReportListItem } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

const REPORT_TYPES: { label: string; value: ReportType }[] = [
  { label: 'Sales Summary', value: 'SALES_SUMMARY' },
  { label: 'Order Summary', value: 'ORDER_SUMMARY' },
  { label: 'Branch Performance', value: 'BRANCH_PERFORMANCE' },
];

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}
function fmtRevenue(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`;
  return `₦${v}`;
}
function readableType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function daysAgoISO(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function ReportsScreen() {
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data: reportsList = [], isLoading: listLoading } = useQuery({
    queryKey: ['reportsList'],
    queryFn: async () => {
      const r = await getReports(0, 50);
      return (r?.content ?? r ?? []) as ReportListItem[];
    },
  });

  const renderReport = ({ item }: { item: ReportListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={async () => {
        try {
          const full = await getReportById(item.id);
          setSelectedReport(full);
        } catch { Alert.alert('Error', 'Could not load report details.'); }
      }}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.reportTypeTag}>
          <Text style={styles.reportTypeText}>{readableType(item.reportType)}</Text>
        </View>
        <Text style={styles.reportDate}>{fmtDate(item.generatedAt)}</Text>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>📅 {fmtDate(item.startDate)} → {fmtDate(item.endDate)}</Text>
        {item.branchId && <Text style={styles.metaText}>🏪 Branch {item.branchId}</Text>}
      </View>
      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalOrders ?? '—'}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{fmtRevenue(item.totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>
      <Text style={styles.viewDetail}>Tap to view details ›</Text>
    </TouchableOpacity>
  );

  if (listLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{reportsList.length} Report{reportsList.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={styles.generateBtn} onPress={() => setShowGenerate(true)} activeOpacity={0.8}>
          <Text style={styles.generateBtnText}>+ Generate</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reportsList}
        keyExtractor={r => String(r.id)}
        renderItem={renderReport}
        contentContainerStyle={reportsList.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<ActivityIndicator size="small" color={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="📋" title="No reports yet" subtitle="Generate your first report using the button above." />}
      />

      <GenerateModal
        visible={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerated={() => { setShowGenerate(false); qc.invalidateQueries({ queryKey: ['reportsList'] }); }}
      />

      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </View>
  );
}

function GenerateModal({ visible, onClose, onGenerated }: { visible: boolean; onClose: () => void; onGenerated: () => void }) {
  const [reportType, setReportType] = useState<ReportType>('SALES_SUMMARY');
  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());
  const [branchId, setBranchId] = useState('');

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });

  const generate = useMutation({
    mutationFn: () => generateReport({ reportType, startDate, endDate, branchId: branchId || null }),
    onSuccess: onGenerated,
    onError: () => Alert.alert('Error', 'Failed to generate report.'),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Generate Report</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 18 }}>
          <View>
            <Text style={styles.fieldLabel}>Report Type</Text>
            <View style={{ gap: 8 }}>
              {REPORT_TYPES.map(rt => (
                <TouchableOpacity
                  key={rt.value}
                  style={[styles.radioRow, reportType === rt.value && styles.radioRowActive]}
                  onPress={() => setReportType(rt.value)}
                >
                  <View style={[styles.radio, reportType === rt.value && styles.radioActive]}>
                    {reportType === rt.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Date Range</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>From</Text>
                <Text style={styles.dateValue}>{fmtDate(startDate)}</Text>
              </View>
              <Text style={styles.dateSep}>→</Text>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>To</Text>
                <Text style={styles.dateValue}>{fmtDate(endDate)}</Text>
              </View>
            </View>
            <View style={styles.presetRow}>
              {[7, 14, 30].map(d => (
                <TouchableOpacity key={d} style={styles.presetChip} onPress={() => { setStartDate(daysAgoISO(d)); setEndDate(todayISO()); }}>
                  <Text style={styles.presetChipText}>Last {d}d</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {reportType === 'BRANCH_PERFORMANCE' && (
            <View>
              <Text style={styles.fieldLabel}>Branch (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.chip, !branchId && styles.chipActive]} onPress={() => setBranchId('')}>
                    <Text style={[styles.chipText, !branchId && styles.chipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {branches.map(b => (
                    <TouchableOpacity key={b.id} style={[styles.chip, branchId === b.id && styles.chipActive]} onPress={() => setBranchId(b.id)}>
                      <Text style={[styles.chipText, branchId === b.id && styles.chipTextActive]}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, generate.isPending && styles.saveBtnDisabled]}
            onPress={() => generate.mutate()}
            disabled={generate.isPending}
            activeOpacity={0.8}
          >
            {generate.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Generate</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ReportDetailModal({ report, onClose }: { report: Report; onClose: () => void }) {
  function fmtRevenue(v: number | null) {
    if (v == null) return '—';
    return `₦${v.toLocaleString()}`;
  }
  const rows: { label: string; value: string }[] = [
    { label: 'Report Type', value: readableType(report.reportType) },
    { label: 'Period', value: `${fmtDate(report.startDate)} – ${fmtDate(report.endDate)}` },
    { label: 'Generated', value: fmtDate(report.generatedAt) },
    { label: 'Total Orders', value: String(report.totalOrders ?? '—') },
    { label: 'Completed', value: String(report.completedOrders ?? '—') },
    { label: 'Cancelled', value: String(report.cancelledOrders ?? '—') },
    { label: 'Total Revenue', value: fmtRevenue(report.totalRevenue) },
    { label: 'Avg Order Value', value: fmtRevenue(report.avgOrderValue) },
    { label: 'Completion Rate', value: `${report.completionRate.toFixed(1)}%` },
    { label: 'Cancellation Rate', value: `${report.cancellationRate.toFixed(1)}%` },
    { label: 'Dine In', value: String(report.dineInCount ?? '—') },
    { label: 'Takeaway', value: String(report.takeawayCount ?? '—') },
    { label: 'Delivery', value: String(report.deliveryCount ?? '—') },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{readableType(report.reportType)}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody}>
          {rows.map((r, i) => (
            <View key={r.label} style={[styles.detailRow, i % 2 === 0 && styles.detailRowEven]}>
              <Text style={styles.detailLabel}>{r.label}</Text>
              <Text style={styles.detailValue}>{r.value}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.saveText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  topBarTitle: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.text },
  generateBtn: { backgroundColor: Colors.espresso, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 9 },
  generateBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportTypeTag: { backgroundColor: Colors.amberLight, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  reportTypeText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.espresso },
  reportDate: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  cardMeta: { gap: 4 },
  metaText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  cardStats: { flexDirection: 'row', gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.espresso },
  statLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  viewDetail: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.amber, textAlign: 'right' },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.espresso },
  modalClose: { fontSize: 20, color: Colors.textMuted },
  modalBody: { flex: 1, padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  radioRowActive: { borderColor: Colors.espresso, backgroundColor: '#FAF7F2' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: Colors.espresso },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.espresso },
  radioLabel: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  dateField: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12 },
  dateLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted },
  dateValue: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 2 },
  dateSep: { fontSize: 16, color: Colors.textMuted },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  presetChipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  chipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  chipTextActive: { color: '#fff' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: Radius.md, backgroundColor: Colors.espresso, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#fff' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailRowEven: { backgroundColor: Colors.background, paddingHorizontal: 4, borderRadius: 4 },
  detailLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  detailValue: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text },
});
