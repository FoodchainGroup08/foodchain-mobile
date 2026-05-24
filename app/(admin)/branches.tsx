import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ScrollView, Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBranches, createBranch, updateBranch, patchBranchStatus,
  getBranchHours, setBranchHours, type Branch, type BranchHour,
} from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type HourEntry = { dayOfWeek: number; openTime: string; closeTime: string; closed: boolean };

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_HOURS: HourEntry[] = [
  { dayOfWeek: 0, openTime: '08:00', closeTime: '22:00', closed: false },
  { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00', closed: false },
  { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00', closed: false },
  { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00', closed: false },
  { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00', closed: false },
  { dayOfWeek: 5, openTime: '10:00', closeTime: '20:00', closed: false },
  { dayOfWeek: 6, openTime: '00:00', closeTime: '00:00', closed: true },
];

function hoursFromApi(apiHours: BranchHour[]): HourEntry[] {
  if (!apiHours.length) return DEFAULT_HOURS.map(h => ({ ...h }));
  return DEFAULT_HOURS.map(def => {
    const found = apiHours.find(h => h.dayOfWeek === def.dayOfWeek);
    return found
      ? { dayOfWeek: found.dayOfWeek, openTime: found.openTime, closeTime: found.closeTime, closed: found.closed }
      : { ...def };
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BranchesScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalBranch, setModalBranch] = useState<Branch | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleAdd = () => {
    setModalBranch(null);
    setShowModal(true);
  };

  const handleEdit = (branch: Branch) => {
    setModalBranch(branch);
    setShowModal(true);
  };

  const handleToggleStatus = (branch: Branch) => {
    const action = branch.isActive ? 'deactivate' : 'activate';
    Alert.alert(
      branch.isActive ? 'Deactivate Branch' : 'Activate Branch',
      `Are you sure you want to ${action} ${branch.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => toggleStatus.mutate({ id: branch.id, isActive: !branch.isActive }) },
      ]
    );
  };

  const renderBranch = ({ item }: { item: Branch }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{item.name}</Text>
          <Text style={styles.branchAddress} numberOfLines={1}>{item.address}</Text>
          {item.phone ? <Text style={styles.branchPhone}>📞 {item.phone}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.statusText, { color: item.isActive ? '#16A34A' : '#DC2626' }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>⭐ {item.rating.toFixed(1)}</Text>
        <Text style={styles.metaText}>{item.isOpen ? '🟢 Open' : '🔴 Closed'}</Text>
        {item.hours && item.hours !== '—' && <Text style={styles.metaText}>🕐 {item.hours}</Text>}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)} activeOpacity={0.8}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, item.isActive ? styles.toggleBtnDeactivate : styles.toggleBtnActivate]}
          onPress={() => handleToggleStatus(item)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, item.isActive ? styles.toggleBtnTextDeactivate : styles.toggleBtnTextActivate]}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
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
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
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

      <BranchFormModal
        visible={showModal}
        branch={modalBranch}
        onClose={() => setShowModal(false)}
        onSaved={() => {
          setShowModal(false);
          qc.invalidateQueries({ queryKey: ['adminBranches'] });
        }}
      />
    </View>
  );
}

// ─── Branch Form Modal ────────────────────────────────────────────────────────

function BranchFormModal({
  visible, branch, onClose, onSaved,
}: {
  visible: boolean;
  branch: Branch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = branch != null;

  const [activeTab, setActiveTab] = useState<'info' | 'hours'>('info');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [hours, setHours] = useState<HourEntry[]>(DEFAULT_HOURS.map(h => ({ ...h })));
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when the modal opens
  const onShow = async () => {
    setActiveTab('info');
    if (branch) {
      setName(branch.name);
      setAddress(branch.address ?? '');
      setPhone(branch.phone ?? '');
      setDescription(branch.description ?? '');
      setManagerId(branch.managerId ?? '');
      setLatitude(branch.latitude != null ? String(branch.latitude) : '');
      setLongitude(branch.longitude != null ? String(branch.longitude) : '');
      setIsActive(branch.isActive);
      setHours(DEFAULT_HOURS.map(h => ({ ...h })));
      try {
        const apiHours = await getBranchHours(branch.id);
        setHours(hoursFromApi(apiHours));
      } catch {}
    } else {
      setName(''); setAddress(''); setPhone(''); setDescription('');
      setManagerId(''); setLatitude(''); setLongitude(''); setIsActive(true);
      setHours(DEFAULT_HOURS.map(h => ({ ...h })));
    }
    setIsGeolocating(false);
    setIsSaving(false);
  };

  const handleGeocode = async () => {
    if (!address.trim()) { Alert.alert('Missing address', 'Enter an address first.'); return; }
    setIsGeolocating(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data[0]) {
        setLatitude(String(parseFloat(data[0].lat).toFixed(6)));
        setLongitude(String(parseFloat(data[0].lon).toFixed(6)));
        Alert.alert('Coordinates found', `${parseFloat(data[0].lat).toFixed(4)}, ${parseFloat(data[0].lon).toFixed(4)}`);
      } else {
        Alert.alert('Not found', 'Try a more specific address.');
      }
    } catch {
      Alert.alert('Error', 'Geocoding failed — enter coordinates manually.');
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Branch name is required.'); return; }
    setIsSaving(true);
    try {
      const payload = {
        name,
        address,
        phone: phone || undefined,
        description: description || undefined,
        managerId: managerId || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        isActive,
      };

      let branchId: string;
      if (isEdit && branch) {
        await updateBranch(branch.id, payload);
        branchId = branch.id;
      } else {
        const created = await createBranch(payload);
        branchId = created.id;
      }

      try {
        await setBranchHours(branchId, hours.map(({ dayOfWeek, openTime, closeTime, closed }) => ({ dayOfWeek, openTime, closeTime, closed })));
      } catch {
        Alert.alert('Warning', 'Branch saved but failed to save hours — try editing the branch to retry.');
      }

      onSaved();
    } catch {
      Alert.alert('Error', isEdit ? 'Failed to update branch.' : 'Failed to create branch.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateHour = (index: number, patch: Partial<HourEntry>) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, ...patch } : h));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onShow={onShow}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Branch' : 'New Branch'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Branch Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'hours' && styles.tabActive]}
            onPress={() => setActiveTab('hours')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'hours' && styles.tabTextActive]}>Operating Hours</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {activeTab === 'info' ? (
            <>
              <View style={styles.row}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Branch Name *</Text>
                  <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Victoria Island" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+2348012345678" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Address</Text>
                <View style={styles.addressRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={address} onChangeText={setAddress}
                    placeholder="10 Adeola Odeku Street, Lagos"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.geocodeBtn, isGeolocating && styles.geocodeBtnDisabled]}
                    onPress={handleGeocode}
                    disabled={isGeolocating}
                    activeOpacity={0.8}
                  >
                    {isGeolocating
                      ? <ActivityIndicator size="small" color={Colors.espresso} />
                      : <Text style={styles.geocodeBtnText}>Find</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldHint}>Tap Find to auto-detect coordinates from address</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Latitude</Text>
                  <TextInput style={styles.input} value={latitude} onChangeText={setLatitude} placeholder="6.4281" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </View>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Longitude</Text>
                  <TextInput style={styles.input} value={longitude} onChangeText={setLongitude} placeholder="3.4219" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Flagship branch" placeholderTextColor={Colors.textMuted} />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Manager ID</Text>
                <TextInput style={[styles.input, styles.inputMono]} value={managerId} onChangeText={setManagerId} placeholder="UUID of the manager user" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
              </View>

              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.fieldLabel}>Active Status</Text>
                  <Text style={styles.fieldHint}>Branch is {isActive ? 'active' : 'inactive'}</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: Colors.border, true: Colors.sageGreen }}
                  thumbColor="#fff"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.hoursHint}>
                Set opening and closing times for each day. Toggle Closed for days the branch doesn't operate.
              </Text>
              {hours.map((h, i) => (
                <View key={h.dayOfWeek} style={[styles.hourRow, h.closed && styles.hourRowClosed]}>
                  <Text style={styles.dayName}>{DAY_NAMES[i]}</Text>
                  <TextInput
                    style={[styles.timeInput, h.closed && styles.timeInputDisabled]}
                    value={h.openTime}
                    onChangeText={v => updateHour(i, { openTime: v })}
                    editable={!h.closed}
                    placeholder="08:00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={styles.timeSep}>–</Text>
                  <TextInput
                    style={[styles.timeInput, h.closed && styles.timeInputDisabled]}
                    value={h.closeTime}
                    onChangeText={v => updateHour(i, { closeTime: v })}
                    editable={!h.closed}
                    placeholder="22:00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                  <View style={styles.closedToggle}>
                    <Switch
                      value={h.closed}
                      onValueChange={v => updateHour(i, { closed: v })}
                      trackColor={{ false: Colors.border, true: Colors.error }}
                      thumbColor="#fff"
                    />
                    <Text style={styles.closedLabel}>Closed</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          {activeTab === 'info' && (
            <TouchableOpacity style={styles.hoursBtn} onPress={() => setActiveTab('hours')} activeOpacity={0.8}>
              <Text style={styles.hoursBtnText}>Set Hours</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Create Branch'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },

  // List
  topBar: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  search: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  addBtn: { backgroundColor: Colors.espresso, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  list: { padding: 16, gap: 10 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  branchName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  branchAddress: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  branchPhone: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
  statusBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.bold },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  editBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso },
  toggleBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 8, borderWidth: 1, alignItems: 'center' },
  toggleBtnActivate: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  toggleBtnDeactivate: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  toggleBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  toggleBtnTextActivate: { color: '#16A34A' },
  toggleBtnTextDeactivate: { color: '#DC2626' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.espresso },
  modalClose: { fontSize: 20, color: Colors.textMuted },

  tabBar: { flexDirection: 'row', margin: 16, marginBottom: 4, backgroundColor: 'rgba(59,35,20,0.08)', borderRadius: Radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  tabTextActive: { color: Colors.espresso, fontFamily: Fonts.semiBold },

  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },

  row: { flexDirection: 'row', gap: 10 },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text },
  fieldHint: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  inputMono: { fontFamily: Fonts.regular, fontSize: 13 },
  addressRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  geocodeBtn: { backgroundColor: Colors.muted, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center', alignItems: 'center', minWidth: 60 },
  geocodeBtnDisabled: { opacity: 0.5 },
  geocodeBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14 },

  // Hours tab
  hoursHint: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 10 },
  hourRowClosed: { opacity: 0.5 },
  dayName: { width: 72, fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.espresso },
  timeInput: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, fontFamily: Fonts.regular, color: Colors.text, textAlign: 'center' },
  timeInputDisabled: { backgroundColor: 'transparent', borderColor: 'transparent', color: Colors.textMuted },
  timeSep: { fontSize: 14, color: Colors.textMuted },
  closedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  closedLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted },

  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  hoursBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  hoursBtnText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.espresso },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: Radius.md, backgroundColor: Colors.espresso, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: 14, fontFamily: Fonts.semiBold, color: '#fff' },
});
