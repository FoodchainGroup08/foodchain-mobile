import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ScrollView, Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllMenuItems, getCategoriesFull, createMenuItem, updateMenuItem, deleteMenuItem,
  activateMenuItem, deactivateMenuItem, type MenuItem,
} from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';

type Category = { id: string; name: string; displayOrder: number; active: boolean };

export default function MenuCatalogueScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminMenuItems'],
    queryFn: () => getAllMenuItems(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categoriesFull'],
    queryFn: getCategoriesFull,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? deactivateMenuItem(id) : activateMenuItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminMenuItems'] }),
    onError: () => Alert.alert('Error', 'Failed to update item.'),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminMenuItems'] }),
    onError: () => Alert.alert('Error', 'Failed to delete item.'),
  });

  const filtered = items.filter(it => {
    const matchCat = selectedCat ? it.category === selectedCat : true;
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const allCategories = Array.from(new Set(items.map(it => it.category)));

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
      </View>
      {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={styles.cardActions}>
        <View style={styles.activeRow}>
          <Text style={styles.activeLabel}>{item.isActive !== false ? 'Active' : 'Inactive'}</Text>
          <Switch
            value={item.isActive !== false}
            onValueChange={() => toggleActive.mutate({ id: item.id, isActive: item.isActive !== false })}
            trackColor={{ true: Colors.sageGreen, false: Colors.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditingItem(item)} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => Alert.alert('Delete Item', `Delete "${item.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => removeItem.mutate(item.id) },
            ])}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search items..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, selectedCat === null && styles.chipActive]}
          onPress={() => setSelectedCat(null)}
        >
          <Text style={[styles.chipText, selectedCat === null && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {allCategories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCat === cat && styles.chipActive]}
            onPress={() => setSelectedCat(cat)}
          >
            <Text style={[styles.chipText, selectedCat === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={it => it.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
        ListEmptyComponent={<EmptyState icon="🍽️" title="No items found" subtitle="Try a different search or category." />}
      />

      <ItemFormModal
        visible={showCreate || editingItem !== null}
        item={editingItem}
        categories={categories}
        onClose={() => { setShowCreate(false); setEditingItem(null); }}
        onSaved={() => { setShowCreate(false); setEditingItem(null); qc.invalidateQueries({ queryKey: ['adminMenuItems'] }); }}
      />
    </View>
  );
}

function ItemFormModal({ visible, item, categories, onClose, onSaved }: {
  visible: boolean; item: MenuItem | null;
  categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = item !== null;
  const [name, setName] = useState(item?.name ?? '');
  const [desc, setDesc] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [categoryId, setCategoryId] = useState('');

  const create = useMutation({
    mutationFn: () => createMenuItem({ name, description: desc, categoryId, price: parseFloat(price) }),
    onSuccess: onSaved,
    onError: () => Alert.alert('Error', 'Failed to create item.'),
  });

  const update = useMutation({
    mutationFn: () => updateMenuItem(item!.id, { name, description: desc, price: parseFloat(price) }),
    onSuccess: onSaved,
    onError: () => Alert.alert('Error', 'Failed to update item.'),
  });

  const isPending = create.isPending || update.isPending;
  const canSave = name.trim() && price && !isNaN(parseFloat(price)) && (isEdit || categoryId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Item' : 'New Menu Item'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14 }}>
          <View>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor={Colors.textMuted} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, styles.inputMulti]} value={desc} onChangeText={setDesc} placeholder="Short description" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
          </View>
          <View>
            <Text style={styles.fieldLabel}>Price (₦) *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
          </View>
          {!isEdit && (
            <View>
              <Text style={styles.fieldLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, categoryId === c.id && styles.chipActive]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
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
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={() => isEdit ? update.mutate() : create.mutate()}
            disabled={!canSave || isPending}
            activeOpacity={0.8}
          >
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Create Item'}</Text>}
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
  chipScroll: { maxHeight: 44 },
  chipRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  chipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  itemName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  itemCategory: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.amber },
  itemDesc: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeLabel: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber },
  editBtnText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.espresso },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#DC2626' },
  deleteBtnText: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#DC2626' },
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
