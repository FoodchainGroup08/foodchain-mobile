import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getFoodSuggestions, getBranches, type ComboSuggestion, type Branch } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type MealType = 'breakfast'|'lunch'|'dinner'|'snack'|'dessert';
type Appetite = 'light'|'heavy';

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { key: 'lunch', label: 'Lunch', icon: '🥗' },
  { key: 'dinner', label: 'Dinner', icon: '🍛' },
  { key: 'snack', label: 'Snack', icon: '🍿' },
  { key: 'dessert', label: 'Dessert', icon: '🍰' },
];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Halal', 'Kosher'];

export default function AIScreen() {
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [budget, setBudget] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [appetite, setAppetite] = useState<Appetite>('light');
  const [dietary, setDietary] = useState<string[]>([]);
  const [peopleCount, setPeopleCount] = useState('1');
  const [suggestions, setSuggestions] = useState<ComboSuggestion[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { getBranches } = await import('@/services/api');
      return getBranches();
    },
    enabled: showBranchPicker,
  });

  const toggleDietary = (item: string) =>
    setDietary(prev => prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item]);

  const handleGetSuggestions = async () => {
    if (!selectedBranch) { Alert.alert('Select Branch', 'Please select a branch first.'); return; }
    setLoading(true); setSuggestions([]); setMessage('');
    try {
      const result = await getFoodSuggestions({
        branchId: selectedBranch.id, branchName: selectedBranch.name,
        budget: budget ? Number(budget) : undefined, mealType, appetite,
        dietaryPreferences: dietary.length > 0 ? dietary : undefined,
        peopleCount: Number(peopleCount) || 1, limit: 3,
      });
      setSuggestions(result.suggestions ?? []);
      setMessage(result.message ?? '');
    } catch {
      Alert.alert('Error', 'Could not get suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showBranchPicker) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Choose a Branch</Text>
          <TouchableOpacity onPress={() => setShowBranchPicker(false)}><Text style={styles.pickerCancel}>Cancel</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.pickerList}>
          {loadingBranches ? <ActivityIndicator color={Colors.amber} style={{ marginTop: 40 }} /> :
            branches.filter(b => b.isActive).map(b => (
              <TouchableOpacity key={b.id} style={[styles.branchCard, selectedBranch?.id === b.id && styles.branchCardSelected]} onPress={() => { setSelectedBranch(b); setShowBranchPicker(false); }} activeOpacity={0.8}>
                <Text style={styles.branchCardName}>{b.name}</Text>
                <Text style={styles.branchCardAddr}>{b.address}</Text>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.heroRow}>
        <Text style={styles.heroEmoji}>✨</Text>
        <View>
          <Text style={styles.heroTitle}>AI Food Assistant</Text>
          <Text style={styles.heroSubtitle}>Tell me your mood, I'll pick your meal</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Branch</Text>
      <TouchableOpacity style={styles.branchSelector} onPress={() => setShowBranchPicker(true)} activeOpacity={0.8}>
        <Text style={selectedBranch ? styles.branchSelectedText : styles.branchPlaceholder}>
          {selectedBranch ? `📍 ${selectedBranch.name}` : 'Select a branch'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Meal Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {MEAL_TYPES.map(t => (
          <TouchableOpacity key={t.key} style={[styles.mealChip, mealType === t.key && styles.mealChipActive]} onPress={() => setMealType(t.key)}>
            <Text style={styles.mealChipIcon}>{t.icon}</Text>
            <Text style={[styles.mealChipText, mealType === t.key && styles.mealChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Appetite</Text>
      <View style={styles.twoCol}>
        {([['light', '🥗', 'Light'], ['heavy', '🍖', 'Heavy']] as [Appetite, string, string][]).map(([key, icon, label]) => (
          <TouchableOpacity key={key} style={[styles.segment, appetite === key && styles.segmentActive]} onPress={() => setAppetite(key)} activeOpacity={0.8}>
            <Text style={styles.segmentIcon}>{icon}</Text>
            <Text style={[styles.segmentText, appetite === key && styles.segmentTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Dietary Preferences</Text>
      <View style={styles.dietaryWrap}>
        {DIETARY_OPTIONS.map(d => (
          <TouchableOpacity key={d} style={[styles.dietaryChip, dietary.includes(d) && styles.dietaryChipActive]} onPress={() => toggleDietary(d)}>
            <Text style={[styles.dietaryText, dietary.includes(d) && styles.dietaryTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Budget (₦, optional)</Text>
      <TextInput style={styles.input} value={budget} onChangeText={setBudget} placeholder="e.g. 5000" placeholderTextColor={Colors.textLight} keyboardType="numeric" />

      <Text style={styles.sectionLabel}>Number of People</Text>
      <View style={styles.twoCol}>
        {(['1','2','3','4+'] as string[]).map(n => {
          const val = n === '4+' ? '4' : n;
          return (
            <TouchableOpacity key={n} style={[styles.segment, peopleCount === val && styles.segmentActive]} onPress={() => setPeopleCount(val)}>
              <Text style={[styles.segmentText, peopleCount === val && styles.segmentTextActive]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.suggestBtn} onPress={handleGetSuggestions} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color={Colors.espresso} /> : <Text style={styles.suggestBtnText}>✨  Get AI Suggestions</Text>}
      </TouchableOpacity>

      {message ? <Text style={styles.aiMessage}>{message}</Text> : null}

      {suggestions.map((combo, i) => (
        <View key={i} style={styles.comboCard}>
          <View style={styles.comboHeader}>
            <Text style={styles.comboName}>{combo.comboName}</Text>
            <Text style={styles.comboPrice}>₦{combo.totalPrice.toLocaleString()}</Text>
          </View>
          {combo.wellnessTags?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
              {combo.wellnessTags.map(tag => (
                <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </ScrollView>
          )}
          <Text style={styles.comboReason}>{combo.reason}</Text>
          {combo.items?.map(item => (
            <View key={item.menuItemId} style={styles.comboItemRow}>
              <Text style={styles.comboItemName}>• {item.name}</Text>
              <Text style={styles.comboItemPrice}>₦{item.price.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.espresso },
  heroSubtitle: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6 },
  branchSelector: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  branchSelectedText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.espresso },
  branchPlaceholder: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textLight },
  chevron: { fontSize: 22, color: Colors.textLight },
  chipRow: { flexDirection: 'row', gap: 8 },
  mealChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  mealChipActive: { borderColor: Colors.espresso, backgroundColor: Colors.espresso },
  mealChipIcon: { fontSize: 15 },
  mealChipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  mealChipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },
  twoCol: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 12 },
  segmentActive: { borderColor: Colors.amber, backgroundColor: Colors.amberLight },
  segmentIcon: { fontSize: 18 },
  segmentText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  segmentTextActive: { color: Colors.espresso },
  dietaryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietaryChip: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7 },
  dietaryChipActive: { borderColor: Colors.sageGreen, backgroundColor: '#F0FDF4' },
  dietaryText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  dietaryTextActive: { color: Colors.sageGreen, fontFamily: Fonts.semiBold },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  suggestBtn: { backgroundColor: Colors.amber, borderRadius: Radius.lg, paddingVertical: 17, alignItems: 'center', marginTop: 16, shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  suggestBtnText: { color: Colors.espresso, fontSize: 16, fontFamily: Fonts.bold },
  aiMessage: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 8 },
  comboCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  comboHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  comboName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso, flex: 1, marginRight: 12 },
  comboPrice: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.amber },
  tagsRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#F0FDF4', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.sageGreen },
  comboReason: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 18 },
  comboItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  comboItemName: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text },
  comboItemPrice: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  pickerTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.espresso },
  pickerCancel: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.amber },
  pickerList: { padding: 16, gap: 10 },
  branchCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 16, borderWidth: 1.5, borderColor: Colors.border },
  branchCardSelected: { borderColor: Colors.amber },
  branchCardName: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.espresso },
  branchCardAddr: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 3 },
});
