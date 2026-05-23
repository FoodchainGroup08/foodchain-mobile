import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getOrderHistory, type Order } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

function statusColor(status: string) {
  if (['COMPLETED', 'SERVED'].includes(status)) return Colors.sageGreen;
  if (status === 'CANCELLED') return Colors.error;
  return Colors.textMuted;
}

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<Order | null>(null);

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orderHistory', user?.id],
    queryFn: () => getOrderHistory(user?.id),
  });

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1, marginRight: 12, gap: 3 }}>
          <Text style={styles.branchName}>{item.branchName}</Text>
          <Text style={styles.orderDate}>{formatDate(item.placedAt)}</Text>
          <Text style={styles.orderMeta}>{item.items.length} item{item.items.length !== 1 ? 's' : ''} · {item.orderType?.replace('-', ' ')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={styles.orderTotal}>₦{item.total.toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}18` }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        renderItem={renderOrder}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="🕐" title="No past orders" subtitle="Your completed orders will appear here." />}
      />

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {[
                { label: 'Branch', value: selected.branchName },
                { label: 'Date', value: formatDate(selected.placedAt) },
                { label: 'Type', value: selected.orderType?.replace('-', ' '), capitalize: true },
                { label: 'Status', value: selected.status.charAt(0) + selected.status.slice(1).toLowerCase(), colorStatus: true },
              ].map((r, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{r.label}</Text>
                  <Text style={[styles.detailValue, r.capitalize && { textTransform: 'capitalize' }, r.colorStatus && { color: statusColor(selected.status), fontFamily: Fonts.bold }]}>
                    {r.value}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Items</Text>
              {selected.items.map((item, i) => (
                <View key={`${item.id}-${i}`} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}×</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subtotal</Text>
                <Text style={styles.detailValue}>₦{selected.subtotal.toLocaleString()}</Text>
              </View>
              {selected.deliveryFee > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Delivery fee</Text>
                  <Text style={styles.detailValue}>₦{selected.deliveryFee.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { fontFamily: Fonts.bold, color: Colors.espresso }]}>Total</Text>
                <Text style={[styles.detailValue, { fontFamily: Fonts.bold, color: Colors.amber, fontSize: 16 }]}>
                  ₦{selected.total.toLocaleString()}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  branchName: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.espresso },
  orderDate: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textLight },
  orderMeta: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, textTransform: 'capitalize' },
  orderTotal: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.text },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.espresso },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: Colors.textMuted },
  modalContent: { padding: 20, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  detailValue: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  sectionLabel: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, width: 28 },
  itemName: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text, flex: 1 },
  itemPrice: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text },
});
