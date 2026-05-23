import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getNotifications, markAllNotificationsRead, deleteNotification, markNotificationRead, type AdminNotification } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return dateStr; }
}

const TYPE_ICON: Record<string, string> = {
  ORDER_STATUS: '📦', PAYMENT: '💳', PROMO: '🎉', SYSTEM: '⚙️', ALERT: '⚠️', default: '🔔',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(0, 50),
  });

  const notifications: AdminNotification[] = data?.content ?? (Array.isArray(data) ? data : []);

  const { mutate: markAllRead } = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const { mutate: deleteOne } = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOne(id) },
    ]);
  };

  const renderItem = ({ item }: { item: AdminNotification }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
      onPress={() => markNotificationRead(item.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.85}
    >
      <View style={styles.notifIcon}>
        <Text style={styles.notifIconText}>{TYPE_ICON[item.type] ?? TYPE_ICON.default}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.notifHeaderRow}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={() => markAllRead(undefined)}><Text style={styles.markAllText}>Mark all read</Text></TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.espresso },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.85)' },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, color: '#fff' },
  markAllText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.amber },
  list: { padding: 12, gap: 8 },
  notifCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.amber, backgroundColor: Colors.amberLight },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.muted, justifyContent: 'center', alignItems: 'center' },
  notifIconText: { fontSize: 20 },
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  notifTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.amber },
  notifMessage: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textLight, marginTop: 5 },
});
