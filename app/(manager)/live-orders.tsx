import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getManagerLiveOrders, type Order } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: Colors.statusReceived, CONFIRMED: '#3B82F6',
  PREPARING: Colors.statusPreparing, READY: '#8B5CF6',
  PICKED_UP: '#14B8A6', SERVED: Colors.amber,
  COMPLETED: Colors.statusCompleted, CANCELLED: Colors.statusCancelled,
};

function statusColor(s: string) { return STATUS_COLORS[s] ?? Colors.textMuted; }
function fmtTime(s: string) { try { return new Date(s).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }); } catch { return s; } }

export default function LiveOrdersScreen() {
  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['managerLiveOrders'],
    queryFn: getManagerLiveOrders,
    refetchInterval: 20_000,
  });

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}18` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.customerName}</Text>
        <Text style={styles.metaText}>·</Text>
        <Text style={[styles.metaText, { textTransform: 'capitalize' }]}>{item.orderType?.replace('-', ' ')}</Text>
        {item.tableNumber && <><Text style={styles.metaText}>·</Text><Text style={styles.metaText}>Table {item.tableNumber}</Text></>}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.itemCount}>{item.items.length} item{item.items.length !== 1 ? 's' : ''}</Text>
        <Text style={styles.total}>₦{item.total.toLocaleString()}</Text>
        <Text style={styles.time}>{fmtTime(item.placedAt)}</Text>
      </View>
    </View>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.banner}>
        <View style={styles.liveDot} />
        <Text style={styles.bannerText}>Live · {orders.length} active order{orders.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        renderItem={renderOrder}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="✅" title="No active orders" subtitle="All orders have been fulfilled." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.espresso },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.sageGreen },
  bannerText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  metaRow: { flexDirection: 'row', gap: 6 },
  metaText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemCount: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textLight, flex: 1 },
  total: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  time: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textLight },
});
