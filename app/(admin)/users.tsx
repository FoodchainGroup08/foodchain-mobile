import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Alert, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers, patchUserStatus, type SystemUser } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

const ROLE_FILTERS = ['All', 'Customer', 'Kitchen Staff', 'Branch Manager', 'Admin'];

const ROLE_COLORS: Record<string, string> = {
  Customer: Colors.amber,
  'Kitchen Staff': Colors.burntOrange,
  'Branch Manager': Colors.sageGreen,
  Admin: Colors.espresso,
};

export default function UsersScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => getAllUsers(),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      patchUserStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
    onError: () => Alert.alert('Error', 'Failed to update user status.'),
  });

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    customers: users.filter(u => u.role === 'Customer').length,
    staff: users.filter(u => u.role !== 'Customer').length,
  };

  const renderUser = ({ item }: { item: SystemUser }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? '#16A34A' : '#DC2626' }]}>
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.roleBadge, { backgroundColor: `${ROLE_COLORS[item.role] ?? Colors.textMuted}18` }]}>
          <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] ?? Colors.textMuted }]}>{item.role}</Text>
        </View>
        {item.branch && <Text style={styles.branchText}>🏪 {item.branch}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.toggleBtn, item.status === 'active' ? styles.deactivateBtn : styles.activateBtn]}
        onPress={() => {
          const next = item.status === 'active' ? 'inactive' : 'active';
          Alert.alert(
            `${next === 'active' ? 'Activate' : 'Deactivate'} User`,
            `${next === 'active' ? 'Activate' : 'Deactivate'} ${item.name}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm', onPress: () => toggleStatus.mutate({ id: item.id, status: next }) },
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleBtnText, item.status === 'active' ? styles.deactivateBtnText : styles.activateBtnText]}>
          {item.status === 'active' ? 'Deactivate' : 'Activate'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      {/* Quick stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Customers', value: stats.customers },
          { label: 'Staff', value: stats.staff },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search users..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Role filter chips */}
      <View style={styles.chipRow}>
        {ROLE_FILTERS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, roleFilter === r && styles.chipActive]}
            onPress={() => setRoleFilter(r)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
              {r === 'All' ? 'All' : r.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        renderItem={renderUser}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="👥" title="No users found" subtitle="Try a different search or filter." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.espresso, paddingVertical: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontFamily: Fonts.bold, color: '#fff' },
  statLabel: { fontSize: 10, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchRow: { padding: 16, paddingBottom: 8 },
  search: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  chipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.espresso, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontFamily: Fonts.bold, color: '#fff' },
  userName: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  userEmail: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontFamily: Fonts.bold },
  branchText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  toggleBtn: { alignSelf: 'flex-start', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  activateBtn: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  deactivateBtn: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  toggleBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  activateBtnText: { color: '#16A34A' },
  deactivateBtnText: { color: '#DC2626' },
});
