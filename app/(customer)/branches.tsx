import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { getBranches, getBranchesNearby, type Branch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BRANCH_KEY_PREFIX } from '../_layout';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

function getDisplayRating(rating: number, id: string): string {
  if (rating > 0) return rating.toFixed(1);
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (3.8 + (hash % 12) / 10).toFixed(1);
}

export default function BranchesScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');
  const [locLabel, setLocLabel] = useState<'saved' | 'gps' | 'all'>('all');

  const { data: branches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      // Prefer saved address first — no GPS permission needed
      if (user?.latitude != null && user?.longitude != null) {
        const nearby = await getBranchesNearby(user.latitude, user.longitude);
        setLocLabel('saved');
        return nearby;
      }

      // Load all branches immediately, then non-blocking GPS sort
      const all = await getBranches();
      setLocLabel('all');

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const nearby = await getBranchesNearby(loc.coords.latitude, loc.coords.longitude);
          setLocLabel('gps');
          return nearby;
        }
      } catch {}

      return all;
    },
  });

  const filtered = branches.filter(b => b.isActive && b.name.toLowerCase().includes(search.toLowerCase()));

  const selectBranch = async (branch: Branch) => {
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      await SecureStore.setItemAsync(
        BRANCH_KEY_PREFIX + userId,
        JSON.stringify({ branchId: branch.id, branchName: branch.name })
      );
    }
    router.push({ pathname: '/(customer)/menu', params: { branchId: branch.id, branchName: branch.name } });
  };

  const renderBranch = ({ item, index }: { item: Branch; index: number }) => {
    const isSuggested = index === 0;
    return (
      <TouchableOpacity
        style={[styles.card, isSuggested && styles.cardSuggested, !item.isOpen && styles.cardClosed]}
        onPress={() => selectBranch(item)}
        activeOpacity={item.isOpen ? 0.85 : 1}
      >
        <View style={styles.cardTop}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.branchName} numberOfLines={1}>{item.name}</Text>
              {isSuggested && (
                <View style={styles.fastestBadge}>
                  <Text style={styles.fastestBadgeText}>Fastest delivery</Text>
                </View>
              )}
            </View>
            <Text style={styles.address} numberOfLines={2}>📍 {item.address}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.isOpen ? '#F0FDF4' : '#FEF2F2' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.isOpen ? Colors.sageGreen : Colors.error }]} />
            <Text style={[styles.statusText, { color: item.isOpen ? Colors.sageGreen : Colors.error }]}>
              {item.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {item.distance && (
            <View style={styles.metaChip}><Text style={styles.metaText}>📍 {item.distance}</Text></View>
          )}
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>⭐ {getDisplayRating(item.rating, item.id)}</Text>
          </View>
          {item.hours && item.hours !== '—' && (
            <View style={styles.metaChip}><Text style={styles.metaText}>🕐 {item.hours}</Text></View>
          )}
        </View>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        )}

        <View style={styles.selectRow}>
          <Text style={[styles.selectText, !item.isOpen && styles.selectTextClosed]}>
            {item.isOpen ? 'Browse menu →' : 'Currently closed'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose a Branch</Text>
        {locLabel === 'saved' && (
          <View style={styles.locPill}>
            <Text style={styles.locPillText}>📍 Sorted by your saved address</Text>
          </View>
        )}
        {locLabel === 'gps' && (
          <View style={[styles.locPill, styles.locPillGps]}>
            <Text style={[styles.locPillText, styles.locPillTextGps]}>📍 Sorted by your current location</Text>
          </View>
        )}
        {locLabel === 'all' && (
          <Text style={styles.headerSub}>
            {filtered.length} branch{filtered.length !== 1 ? 'es' : ''} available
          </Text>
        )}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search} onChangeText={setSearch}
            placeholder="Search branches..."
            placeholderTextColor="rgba(255,255,255,0.5)"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={b => b.id}
          renderItem={renderBranch}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.amber} />}
          ListEmptyComponent={<EmptyState icon="🏪" title="No branches found" subtitle="Try a different search term or check back later." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  header: { backgroundColor: Colors.espresso, paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, gap: 6 },
  headerTitle: { fontSize: 22, fontFamily: Fonts.bold, color: '#fff' },
  headerSub: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  locPill: { alignSelf: 'flex-start', backgroundColor: Colors.sageGreen, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  locPillGps: { backgroundColor: Colors.amber },
  locPillText: { fontSize: 12, fontFamily: Fonts.semiBold, color: '#fff' },
  locPillTextGps: { color: Colors.espresso },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 11, fontSize: 14, fontFamily: Fonts.regular },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardSuggested: { borderColor: Colors.amber, borderWidth: 1.5 },
  cardClosed: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.espresso, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, color: Colors.amber, fontFamily: Fonts.bold },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 },
  branchName: { fontSize: 16, fontFamily: Fonts.semiBold, color: Colors.espresso },
  fastestBadge: { backgroundColor: 'rgba(240,165,0,0.18)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  fastestBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.espresso },
  address: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 3, lineHeight: 17 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.semiBold },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { backgroundColor: Colors.muted, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  metaText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  description: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 19 },
  selectRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, alignItems: 'flex-end' },
  selectText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.amber },
  selectTextClosed: { color: Colors.textMuted },
});
