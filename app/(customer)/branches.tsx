import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getBranches, getBranchesNearby, type Branch } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';

function getDisplayRating(rating: number, id: string): string {
  if (rating > 0) return rating.toFixed(1);
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (3.8 + (hash % 12) / 10).toFixed(1);
}

export default function BranchesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [locLabel, setLocLabel] = useState<'all'|'gps'>('all');

  const { data: branches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const all = await getBranches();
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

  const renderBranch = ({ item }: { item: Branch }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(customer)/menu', params: { branchId: item.id, branchName: item.name } })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchName}>{item.name}</Text>
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
        <Text style={styles.selectText}>Browse menu →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose a Branch</Text>
        <Text style={styles.headerSub}>
          {locLabel === 'gps' ? '📍 Sorted by your location' : `${filtered.length} branch${filtered.length !== 1 ? 'es' : ''} available`}
        </Text>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search} onChangeText={setSearch}
            placeholder="Search branches..."
            placeholderTextColor={Colors.textLight}
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
  header: { backgroundColor: Colors.espresso, paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20, gap: 4 },
  headerTitle: { fontSize: 22, fontFamily: Fonts.bold, color: '#fff' },
  headerSub: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 11, fontSize: 14, fontFamily: Fonts.regular },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.espresso, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, color: Colors.amber, fontFamily: Fonts.bold },
  branchName: { fontSize: 16, fontFamily: Fonts.semiBold, color: Colors.espresso, flex: 1 },
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
});
