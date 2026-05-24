import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getMenuByBranch, type MenuItem } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { Colors, Fonts, Radius } from '@/constants/colors';
import Toast from 'react-native-toast-message';

export default function MenuScreen() {
  const { branchId, branchName } = useLocalSearchParams<{ branchId: string; branchName: string }>();
  const navigation = useNavigation();
  const router = useRouter();
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
          <View style={styles.itemImgPlaceholder}>
            <Ionicons name="restaurant-outline" size={28} color={Colors.textLight} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.description
            ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            : null}
          <View style={styles.itemBottom}>
            <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
            {qty > 0 ? (
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => useCartStore.getState().updateQuantity(item.id, qty - 1)}
                >
                  <Ionicons name="remove" size={14} color={Colors.espresso} />
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{qty}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, styles.qtyBtnAdd]}
                  onPress={() => handleAdd(item)}
                >
                  <Ionicons name="add" size={14} color={Colors.espresso} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={Colors.espresso} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search menu..."
          placeholderTextColor={Colors.textLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category pills */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={c => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.75}
          >
            <Text style={[styles.catChipText, activeCategory === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Help me choose banner */}
      <TouchableOpacity
        style={styles.helpBanner}
        onPress={() => router.push({
          pathname: '/(customer)/ai',
          params: { branchId, branchName },
        } as any)}
        activeOpacity={0.85}
      >
        <View style={styles.helpBannerLeft}>
          <View style={styles.helpIconBox}>
            <Ionicons name="sparkles" size={18} color={Colors.amber} />
          </View>
          <View>
            <Text style={styles.helpBannerTitle}>Not sure what to have?</Text>
            <Text style={styles.helpBannerSub}>Get a personalised combo recommendation</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.espresso} />
      </TouchableOpacity>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.emptyList]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptySub}>
              {search ? 'No items match your search.' : 'No items available in this category.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, margin: 12, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, gap: 8,
  },
  searchInput: {
    flex: 1, color: Colors.text, paddingVertical: 11,
    fontSize: 14, fontFamily: Fonts.regular,
  },

  catRow: {
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2, gap: 8,
    alignItems: 'center',
  },
  catChip: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8,
    flexShrink: 0,
  },
  catChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  catChipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  catChipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },

  helpBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(240,165,0,0.1)', borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: 'rgba(240,165,0,0.3)',
    marginHorizontal: 12, marginBottom: 12, padding: 14,
  },
  helpBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  helpIconBox: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: 'rgba(240,165,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  helpBannerTitle: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso },
  helpBannerSub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },

  list: { paddingHorizontal: 12, paddingBottom: 20, gap: 10 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.semiBold, color: Colors.text },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },

  itemCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    flexDirection: 'row', borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  itemImg: { width: 96, height: 96 },
  itemImgPlaceholder: {
    width: 96, height: 96, backgroundColor: Colors.muted,
    justifyContent: 'center', alignItems: 'center',
  },
  itemInfo: { flex: 1, padding: 12, gap: 3, justifyContent: 'center' },
  itemName: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  itemDesc: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17 },
  itemBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6,
  },
  itemPrice: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.amber },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.amber, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.espresso },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnAdd: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  qtyNum: {
    fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso,
    minWidth: 20, textAlign: 'center',
  },
});
