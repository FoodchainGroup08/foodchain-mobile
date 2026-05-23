import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBranches, createBranch, patchBranchStatus, type Branch } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

export default function BranchesScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: branches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminBranches'],
    queryFn: getBranches,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => patchBranchStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminBranches'] }),
    onError: () => Alert.alert('Error', 'Failed to update branch status.'),
  });

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  const renderBranch = ({ item }: { item: Branch }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{item.name}</Text>
          <Text style={styles.branchAddress} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: item.isActive ? '#16A34A' : '#DC2626' }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        {item.phone && <Text style={styles.metaText}>📞 {item.phone}</Text>}
        <Text style={styles.metaText}>⭐ {item.rating.toFixed(1)}</Text>
        <Text style={styles.metaText}>{item.isOpen ? '🟢 Open' : '🔴 Closed'}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, item.isActive ? styles.toggleBtnDeactivate : styles.toggleBtnActivate]}
        onPress={() => {
          Alert.alert(
            item.isActive ? 'Deactivate Branch' : 'Activate Branch',
            `Are you sure you want to ${item.isActive ? 'deactivate' : 'activate'} ${item.name}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm', onPress: () => toggleStatus.mutate({ id: item.id, isActive: !item.isActive }) },
            ]
          );
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleBtnText, item.isActive ? styles.toggleBtnTextDeactivate : styles.toggleBtnTextActivate]}>
          {item.isActive ? 'Deactivate' : 'Activate'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search branches..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={b => b.id}
        renderItem={renderBranch}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="🏪" title="No branches found" subtitle="Try a different search." />}
      />

      <CreateBranchModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['adminBranches'] }); }} />
    </View>
  );
}

function CreateBranchModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const create = useMutation({
    mutationFn: () => createBranch({ name, address, phone }),
    onSuccess: () => { onCreated(); setName(''); setAddress(''); setPhone(''); },
    onError: () => Alert.alert('Error', 'Failed to create branch.'),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Branch</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14 }}>
          <View>
            <Text style={styles.fieldLabel}>Branch Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Lekki Phase 1" placeholderTextColor={Colors.textMuted} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Address *</Text>
            <TextInput style={[styles.input, styles.inputMulti]} value={address} onChangeText={setAddress} placeholder="Full address" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+234..." placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!name || !address) && styles.saveBtnDisabled]}
            onPress={() => create.mutate()}
            disabled={!name || !address || create.isPending}
            activeOpacity={0.8}
          >
            {create.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Create Branch</Text>}
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
  topBar: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  search: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  addBtn: { backgroundColor: Colors.espresso, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  branchName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  branchAddress: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  toggleBtn: { alignSelf: 'flex-start', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  toggleBtnActivate: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  toggleBtnDeactivate: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  toggleBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  toggleBtnTextActivate: { color: '#16A34A' },
  toggleBtnTextDeactivate: { color: '#DC2626' },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.espresso },
  modalClose: { fontSize: 20, color: Colors.textMuted },
  modalBody: { flex: 1, padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: Radius.md, backgroundColor: Colors.espresso, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#fff' },
});
