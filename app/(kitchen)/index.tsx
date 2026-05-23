import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Modal, Alert,
} from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import {
  getKitchenQueue, acceptKitchenOrder, readyKitchenOrder,
  pickupKitchenOrder, serveKitchenOrder, type KitchenOrder,
} from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRouter } from 'expo-router';

type StatusFilter = 'all'|'received'|'preparing'|'ready';

const STATUS_OPTIONS: { value: StatusFilter; label: string; count?: number }[] = [
  { value: 'all', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  received:   { bg: Colors.espresso, text: Colors.amber, label: 'Received' },
  preparing:  { bg: Colors.amber, text: Colors.espresso, label: 'Preparing' },
  ready:      { bg: Colors.sageGreen, text: '#fff', label: 'Ready' },
  'picked-up':{ bg: Colors.muted, text: Colors.textMuted, label: 'Picked Up' },
  served:     { bg: Colors.muted, text: Colors.textMuted, label: 'Served' },
};

const ORDER_TYPE_ICON: Record<string, string> = { 'dine-in': '🪑', 'takeaway': '🥡', 'delivery': '🛵' };

function elapsedLabel(receivedAt: string): string {
  const mins = Math.floor((Date.now() - new Date(receivedAt).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function KitchenQueueScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [serverTotals, setServerTotals] = useState({ received: 0, preparing: 0, ready: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [_, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getKitchenQueue(0, 20);
      const all = [
        ...data.received.orders,
        ...data.preparing.orders,
        ...data.ready.orders,
      ].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      setOrders(all);
      setServerTotals({ received: data.received.total, preparing: data.preparing.total, ready: data.ready.total });
    } catch {}
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    fetchQueue();
    const poll = setInterval(() => fetchQueue(true), 8_000);
    return () => clearInterval(poll);
  }, []);

  const handleRefresh = async () => { setRefreshing(true); await fetchQueue(); setRefreshing(false); };

  const handleAction = async (order: KitchenOrder, action: string) => {
    if (updating.has(order.id)) return;
    setUpdating(prev => new Set(prev).add(order.id));
    setSelectedOrder(null);
    try {
      if (action === 'accept') await acceptKitchenOrder(order.id);
      else if (action === 'ready') await readyKitchenOrder(order.id);
      else if (action === 'pickup') await pickupKitchenOrder(order.id);
      else if (action === 'serve') await serveKitchenOrder(order.id);
      await fetchQueue(true);
    } catch {
      Alert.alert('Error', 'Could not update order status. Please try again.');
    } finally {
      setUpdating(prev => { const n = new Set(prev); n.delete(order.id); return n; });
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const renderOrder = ({ item }: { item: KitchenOrder }) => {
    const statusStyle = STATUS_STYLE[item.status] ?? { bg: Colors.muted, text: Colors.textMuted, label: item.status };
    const isUpdating = updating.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, item.isUrgent && styles.cardUrgent, item.isNew && styles.cardNew]}
        onPress={() => setSelectedOrder(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              {item.isUrgent && <View style={styles.urgentBadge}><Text style={styles.urgentText}>🔥 URGENT</Text></View>}
              {item.isNew && <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View>}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{ORDER_TYPE_ICON[item.orderType]} {item.orderType}</Text>
              {item.tableNumber && <Text style={styles.metaText}>· Table {item.tableNumber}</Text>}
              {item.customerName && <Text style={styles.metaText}>· {item.customerName}</Text>}
            </View>
          </View>
          <View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
            <Text style={styles.elapsed}>{elapsedLabel(item.receivedAt)}</Text>
          </View>
        </View>

        <View style={styles.itemsList}>
          {item.items.slice(0, 3).map((i, idx) => (
            <Text key={idx} style={styles.itemText}>· {i.quantity}× {i.name}{i.specialInstructions ? ` (${i.specialInstructions})` : ''}</Text>
          ))}
          {item.items.length > 3 && <Text style={styles.itemText}>+{item.items.length - 3} more...</Text>}
        </View>

        {/* Quick action */}
        <View style={styles.actionRow}>
          {item.status === 'received' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'accept')} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator size="small" color={Colors.espresso} /> : <Text style={styles.actionBtnText}>Accept →</Text>}
            </TouchableOpacity>
          )}
          {item.status === 'preparing' && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => handleAction(item, 'ready')} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.actionBtnText, { color: '#fff' }]}>Mark Ready ✓</Text>}
            </TouchableOpacity>
          )}
          {item.status === 'ready' && (
            <View style={styles.actionRowMulti}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGray]} onPress={() => handleAction(item, 'pickup')} disabled={isUpdating}>
                <Text style={[styles.actionBtnText, { color: Colors.text }]}>Picked Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => handleAction(item, 'serve')} disabled={isUpdating}>
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Served ✓</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}><Text style={styles.statNum}>{serverTotals.received}</Text><Text style={styles.statLabel}>Received</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statNum, { color: Colors.amber }]}>{serverTotals.preparing}</Text><Text style={styles.statLabel}>Preparing</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statNum, { color: Colors.sageGreen }]}>{serverTotals.ready}</Text><Text style={styles.statLabel}>Ready</Text></View>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterTab, filter === opt.value && styles.filterTabActive]}
            onPress={() => setFilter(opt.value)}
          >
            <Text style={[styles.filterTabText, filter === opt.value && styles.filterTabTextActive]}>{opt.label}</Text>
            {opt.value !== 'all' && (
              <View style={[styles.filterBadge, filter === opt.value && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === opt.value && styles.filterBadgeTextActive]}>
                  {serverTotals[opt.value as keyof typeof serverTotals] ?? 0}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={o => o.id}
        renderItem={renderOrder}
        contentContainerStyle={filteredOrders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="🍳" title="Queue is clear" subtitle="No orders in this category right now." />}
      />

      {/* Order detail modal */}
      <Modal visible={!!selectedOrder} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order #{selectedOrder.id.slice(-6).toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMeta}>{ORDER_TYPE_ICON[selectedOrder.orderType]} {selectedOrder.orderType}</Text>
                {selectedOrder.tableNumber && <Text style={styles.modalMeta}>Table {selectedOrder.tableNumber}</Text>}
                {selectedOrder.customerName && <Text style={styles.modalMeta}>{selectedOrder.customerName}</Text>}
              </View>
              <Text style={styles.modalTime}>Received: {elapsedLabel(selectedOrder.receivedAt)}</Text>
              <View style={styles.divider} />
              <Text style={styles.modalItemsTitle}>Items</Text>
              {selectedOrder.items.map((item, i) => (
                <View key={i} style={styles.modalItemRow}>
                  <Text style={styles.modalItemQty}>{item.quantity}×</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    {item.specialInstructions && <Text style={styles.modalItemNote}>Note: {item.specialInstructions}</Text>}
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
              {selectedOrder.status === 'received' && (
                <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleAction(selectedOrder, 'accept')}>
                  <Text style={styles.modalActionText}>Accept Order →</Text>
                </TouchableOpacity>
              )}
              {selectedOrder.status === 'preparing' && (
                <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: Colors.sageGreen }]} onPress={() => handleAction(selectedOrder, 'ready')}>
                  <Text style={[styles.modalActionText, { color: '#fff' }]}>Mark as Ready ✓</Text>
                </TouchableOpacity>
              )}
              {selectedOrder.status === 'ready' && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: Colors.muted }]} onPress={() => handleAction(selectedOrder, 'pickup')}>
                    <Text style={[styles.modalActionText, { color: Colors.text }]}>Mark Picked Up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: Colors.sageGreen }]} onPress={() => handleAction(selectedOrder, 'serve')}>
                    <Text style={[styles.modalActionText, { color: '#fff' }]}>Mark Served ✓</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  statsBar: { backgroundColor: Colors.espresso, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontFamily: Fonts.bold, color: '#fff' },
  statLabel: { fontSize: 10, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  logoutBtn: { marginLeft: 12 },
  logoutBtnText: { fontSize: 12, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.6)' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  filterTabActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  filterTabText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  filterTabTextActive: { color: '#fff', fontFamily: Fonts.semiBold },
  filterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.muted, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeActive: { backgroundColor: Colors.amber },
  filterBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.textMuted },
  filterBadgeTextActive: { color: Colors.espresso },
  list: { padding: 12, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardUrgent: { borderColor: Colors.error, borderWidth: 2 },
  cardNew: { borderColor: Colors.amber, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  orderId: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  urgentBadge: { backgroundColor: '#FEF2F2', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  urgentText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.error },
  newBadge: { backgroundColor: Colors.amberLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  newText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.espresso },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, textTransform: 'capitalize' },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-end' },
  statusBadgeText: { fontSize: 11, fontFamily: Fonts.bold },
  elapsed: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textLight, textAlign: 'right', marginTop: 4 },
  itemsList: { gap: 3, backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 10 },
  itemText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionRowMulti: { flex: 1, flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  actionBtnGreen: { backgroundColor: Colors.sageGreen },
  actionBtnGray: { backgroundColor: Colors.muted },
  actionBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.espresso },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.espresso },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: Colors.textMuted },
  modalContent: { padding: 20, gap: 10 },
  modalMetaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  modalMeta: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text, textTransform: 'capitalize' },
  modalTime: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  modalItemsTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 8 },
  modalItemRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 },
  modalItemQty: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.textMuted, width: 30 },
  modalItemName: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  modalItemNote: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.burntOrange, marginTop: 2 },
  modalActionBtn: { backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center' },
  modalActionText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
});
