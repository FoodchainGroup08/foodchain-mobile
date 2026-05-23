import { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getActiveOrders, type Order } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Received', CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing', READY: 'Ready', PICKED_UP: 'On the way', SERVED: 'Served',
};

function statusColor(status: string): string {
  switch (status) {
    case 'RECEIVED': return Colors.statusReceived;
    case 'CONFIRMED': case 'PREPARING': return Colors.statusPreparing;
    default: return Colors.statusReady;
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['activeOrders', user?.id],
    queryFn: () => getActiveOrders(user?.id),
    refetchInterval: 30_000,
  });

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/(customer)/order/[id]', params: { id: item.id } })} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.branchName}>{item.branchName}</Text>
          <Text style={styles.orderMeta}>{item.items.length} item{item.items.length !== 1 ? 's' : ''} · {item.orderType?.replace('-', ' ')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}18` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.orderTotal}>₦{item.total.toLocaleString()}</Text>
        <Text style={styles.trackLink}>Track order →</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <FlatList
      data={orders}
      keyExtractor={o => o.id}
      renderItem={renderOrder}
      contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
      ListEmptyComponent={
        <EmptyState icon="📋" title="No active orders" subtitle="Your current orders will appear here." action={{ label: 'Browse Menu', onPress: () => router.push('/(customer)/branches') }} />
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  branchName: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.espresso },
  orderMeta: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, textTransform: 'capitalize' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.text },
  trackLink: { color: Colors.amber, fontSize: 13, fontFamily: Fonts.semiBold },
});
