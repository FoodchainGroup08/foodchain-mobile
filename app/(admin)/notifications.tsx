import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, type AdminNotification,
} from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

const TYPE_ICONS: Record<string, string> = {
  ORDER_STATUS: '🛒', PROMOTION: '🎁', SYSTEM: '⚙️',
  PAYMENT: '💰', DELIVERY: '🛵', GENERAL: '📢',
};

function typeIcon(type: string): string {
  return TYPE_ICONS[type] ?? '🔔';
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function AdminNotificationsScreen() {
  const qc = useQueryClient();

  const { data: raw, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: () => getNotifications(0, 50),
  });

  const notifications: AdminNotification[] = raw?.content ?? (Array.isArray(raw) ? raw : []);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotifications'] }),
    onError: () => Alert.alert('Error', 'Could not delete notification.'),
  });

  const renderItem = ({ item }: { item: AdminNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => { if (!item.isRead) markRead.mutate(item.id); }}
      onLongPress={() => {
        Alert.alert('Delete Notification', 'Remove this notification?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(item.id) },
        ]);
      }}
      activeOpacity={0.85}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{typeIcon(item.type)}</Text>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.time}>{fmtTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type.replace(/_/g, ' ')}</Text>
          </View>
          {item.status && item.status !== 'DELIVERED' && (
            <Text style={styles.statusText}>{item.status}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {unreadCount > 0 ? `${unreadCount} Unread` : 'All caught up'}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
            activeOpacity={0.8}
          >
            {markAll.isPending
              ? <ActivityIndicator size="small" color={Colors.amber} />
              : <Text style={styles.markAllText}>Mark All Read</Text>}
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={n => String(n.id)}
        renderItem={renderItem}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="🔔" title="No notifications" subtitle="You're all caught up!" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  headerTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.text },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber },
  markAllText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.espresso },
  list: { padding: 16, gap: 8 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardUnread: { borderColor: Colors.amber, backgroundColor: '#FFFBF0' },
  iconBox: { position: 'relative', width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 22 },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.amber },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { flex: 1, fontSize: 13, fontFamily: Fonts.medium, color: Colors.text, marginRight: 8 },
  titleUnread: { fontFamily: Fonts.bold, color: Colors.espresso },
  time: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, flexShrink: 0 },
  message: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typeBadge: { backgroundColor: Colors.background, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { fontSize: 10, fontFamily: Fonts.medium, color: Colors.textMuted },
  statusText: { fontSize: 10, fontFamily: Fonts.medium, color: Colors.textMuted },
});
