import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, ScrollView, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { getMenuByBranch, type MenuItem } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import Toast from 'react-native-toast-message';

export default function MenuScreen() {
  const { branchId, branchName } = useLocalSearchParams<{ branchId: string; branchName: string }>();
  const navigation = useNavigation();
  const { addItem, items: cartItems } = useCartStore();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  useLayoutEffect(() => {
    if (branchName) navigation.setOptions({ title: branchName });
  }, [branchName]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['menu', branchId],
    queryFn: () => getMenuByBranch(branchId!),
    enabled: !!branchId,
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
    return ['All', ...cats];
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter(i => i.available)
      .filter(i => activeCategory === 'All' || i.category === activeCategory)
      .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, activeCategory, search]);

  const getCartQty = (itemId: string) =>
    cartItems.find(c => c.menuItemId === itemId)?.quantity ?? 0;

  const handleAdd = (item: MenuItem) => {
    addItem(item, branchId!, branchName!);
    Toast.show({ type: 'success', text1: 'Added to cart', text2: item.name, visibilityTime: 1800 });
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    const qty = getCartQty(item.id);
    return (
      <View style={styles.itemCard}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImg} resizeMode="cover" />
        ) : (
          <View style={styles.itemImgPlaceholder}><Text style={styles.itemImgPlaceholderText}>🍽️</Text></View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={styles.itemBottom}>
            <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
            {qty > 0 ? (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => useCartStore.getState().updateQuantity(item.id, qty - 1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{qty}</Text>
                <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => handleAdd(item)}>
                  <Text style={[styles.qtyBtnText, { color: Colors.espresso }]}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)} activeOpacity={0.85}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;
  }

  return (
    <View style={styles.flex}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search menu..." placeholderTextColor={Colors.textLight} />
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catChipText, activeCategory === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="🍽️" title="Nothing here" subtitle="No items match your search." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: Colors.text, paddingVertical: 11, fontSize: 14, fontFamily: Fonts.regular },
  catRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  catChip: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  catChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  catChipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  catChipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },
  list: { padding: 12, gap: 10 },
  itemCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  itemImg: { width: 100, height: 100 },
  itemImgPlaceholder: { width: 100, height: 100, backgroundColor: Colors.muted, justifyContent: 'center', alignItems: 'center' },
  itemImgPlaceholderText: { fontSize: 32 },
  itemInfo: { flex: 1, padding: 12, gap: 4 },
  itemName: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  itemDesc: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  itemPrice: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.amber },
  addBtn: { backgroundColor: Colors.amber, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.espresso },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  qtyBtnAdd: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  qtyBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  qtyNum: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, minWidth: 20, textAlign: 'center' },
});
