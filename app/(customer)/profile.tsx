import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/authStore';
import {
  updateProfile, getUserPreferencesV2, saveUserPreferencesV2,
  type SavePreferencesV2Request,
} from '@/services/api';
import { BRANCH_KEY_PREFIX } from '../_layout';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Preference option constants ──────────────────────────────────────────────

const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Halal',
  'Kosher', 'Nut-Free', 'Low-Carb', 'Keto',
];

const HEALTH_GOALS = [
  'Weight Loss', 'Muscle Gain', 'Heart Health', 'Diabetic-Friendly',
  'High Protein', 'Low Sodium', 'Balanced Diet',
];

const FOOD_ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat',
  'Soy', 'Shellfish', 'Fish', 'Sesame',
];

const CUISINE_PREFERENCES = [
  'Nigerian', 'West African', 'Mediterranean', 'Asian', 'Italian',
  'Mexican', 'American', 'Indian', 'Middle Eastern', 'Fusion',
];

const SPICE_LEVELS = [
  { key: 'none', label: 'None', emoji: '😌' },
  { key: 'mild', label: 'Mild', emoji: '🌶️' },
  { key: 'medium', label: 'Medium', emoji: '🌶️🌶️' },
  { key: 'hot', label: 'Hot', emoji: '🌶️🌶️🌶️' },
  { key: 'extra_hot', label: 'Extra Hot', emoji: '🔥' },
];

const TASTE_PREFERENCES = [
  'Sweet', 'Savory', 'Spicy', 'Sour', 'Umami', 'Bitter', 'Salty',
];

const APPETITE_SIZES = [
  { key: 'light', label: 'Light', emoji: '🥗' },
  { key: 'moderate', label: 'Moderate', emoji: '🍽️' },
  { key: 'heavy', label: 'Heavy', emoji: '🍖' },
];

const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner', 'Brunch', 'Late Night'];

const ORDER_FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'several_week', label: 'Several/week' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const GROUP_SIZES = [
  { key: 'solo', label: 'Solo', emoji: '👤' },
  { key: 'couple', label: 'Couple', emoji: '👫' },
  { key: 'small', label: 'Small (3–4)', emoji: '👨‍👩‍👧' },
  { key: 'large', label: 'Large (5+)', emoji: '👨‍👩‍👧‍👦' },
];

// ─── Helper components ────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ChipRow({
  options, selected, onToggle, maxSelect,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  maxSelect?: number;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map(opt => {
        const active = selected.includes(opt);
        const disabled = !active && maxSelect != null && selected.length >= maxSelect;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
            onPress={() => !disabled && onToggle(opt)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SingleSelect<T extends string>({
  options, selected, onSelect,
}: {
  options: Array<{ key: T; label: string; emoji?: string }>;
  selected: T | null;
  onSelect: (val: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map(opt => {
        const active = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.emoji ? `${opt.emoji} ${opt.label}` : opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, logout, refreshUser } = useAuthStore();

  // Personal info
  const [name, setName] = useState(user?.name ?? '');
  const [address, setAddress] = useState(user?.addressLine ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [storedBranchName, setStoredBranchName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    SecureStore.getItemAsync(BRANCH_KEY_PREFIX + user.id).then(raw => {
      if (raw) setStoredBranchName(JSON.parse(raw).branchName ?? null);
    });
  }, [user?.id]);

  // Preferences state
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [healthGoal, setHealthGoal] = useState<string | null>(null);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<string | null>(null);
  const [tastePreferences, setTastePreferences] = useState<string[]>([]);
  const [dislikedIngredients, setDislikedIngredients] = useState('');
  const [appetiteSize, setAppetiteSize] = useState<string | null>(null);
  const [usualMealTimes, setUsualMealTimes] = useState<string[]>([]);
  const [orderFrequency, setOrderFrequency] = useState<string | null>(null);
  const [typicalGroupSize, setTypicalGroupSize] = useState<string | null>(null);
  const [defaultBudget, setDefaultBudget] = useState('');
  const [budgetUnlimited, setBudgetUnlimited] = useState(false);

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['preferencesV2'],
    queryFn: getUserPreferencesV2,
  });

  useEffect(() => {
    if (!prefs) return;
    setDietaryRestrictions(prefs.dietaryRestrictions ?? []);
    setHealthGoal(prefs.healthGoal ?? null);
    setFoodAllergies(prefs.foodAllergies ?? []);
    setCuisinePreferences(prefs.cuisinePreferences ?? []);
    setSpiceLevel(prefs.spiceLevel ?? null);
    setTastePreferences(prefs.tastePreferences ?? []);
    setDislikedIngredients((prefs.dislikedIngredients ?? []).join(', '));
    setAppetiteSize(prefs.appetiteSize ?? null);
    setUsualMealTimes(prefs.usualMealTimes ?? []);
    setOrderFrequency(prefs.orderFrequency ?? null);
    setTypicalGroupSize(prefs.typicalGroupSize ?? null);
    setDefaultBudget(prefs.defaultBudget != null ? String(prefs.defaultBudget) : '');
    setBudgetUnlimited(prefs.budgetUnlimited ?? false);
  }, [prefs]);

  const prefsMutation = useMutation({
    mutationFn: (data: SavePreferencesV2Request) => saveUserPreferencesV2(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferencesV2'] }),
  });

  const handleSaveProfile = async () => {
    setSavingProfile(true); setProfileSaved(false);
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      // Geocode the address to get coordinates for branch proximity
      const trimmedAddress = address.trim();
      if (trimmedAddress) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedAddress)}&format=json&limit=1`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          const data = await res.json();
          if (data[0]) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          }
        } catch {}
      }

      await updateProfile({
        name: name.trim(),
        addressLine: trimmedAddress || undefined,
        ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
      });
      await refreshUser();

      // Address changed → clear stored branch so the user picks the new closest one
      if (user?.id && trimmedAddress !== (user.addressLine ?? '')) {
        await SecureStore.deleteItemAsync(BRANCH_KEY_PREFIX + user.id);
        setStoredBranchName(null);
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeBranch = async () => {
    if (user?.id) await SecureStore.deleteItemAsync(BRANCH_KEY_PREFIX + user.id);
    setStoredBranchName(null);
    router.push('/(customer)/branches');
  };

  const handleSavePreferences = async () => {
    const dislikedArr = dislikedIngredients
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      await prefsMutation.mutateAsync({
        dietaryRestrictions,
        cuisinePreferences,
        spiceLevel,
        healthGoal,
        foodAllergies,
        tastePreferences,
        dislikedIngredients: dislikedArr,
        appetiteSize,
        usualMealTimes,
        orderFrequency,
        typicalGroupSize,
        defaultBudget: defaultBudget ? Number(defaultBudget) : undefined,
        budgetUnlimited,
      });
      Alert.alert('Saved', 'Your food preferences have been updated.');
    } catch {
      Alert.alert('Error', 'Could not save preferences. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (val: string) =>
    setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* ── Avatar header ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>

        {/* ── Quick access ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Access</Text>
          {([
            { icon: 'receipt-outline' as const, label: 'Active Orders', path: '/(customer)/orders' },
            { icon: 'time-outline' as const, label: 'Order History', path: '/(customer)/history' },
            { icon: 'notifications-outline' as const, label: 'Notifications', path: '/(customer)/notifications' },
          ]).map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i === 0 && styles.menuItemFirst]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIconBox}>
                <Ionicons name={item.icon} size={18} color={Colors.amber} />
              </View>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Personal info ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Info</Text>
          {profileSaved && (
            <View style={styles.savedBox}>
              <Text style={styles.savedText}>✓ Profile updated</Text>
            </View>
          )}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input} value={name} onChangeText={setName}
            placeholder="Your name" placeholderTextColor={Colors.textLight}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Default Delivery Address</Text>
          <TextInput
            style={[styles.input, styles.addressInput]} value={address} onChangeText={setAddress}
            placeholder="Enter your address" placeholderTextColor={Colors.textLight}
            multiline numberOfLines={2}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={savingProfile} activeOpacity={0.85}>
            {savingProfile
              ? <ActivityIndicator color={Colors.espresso} />
              : <Text style={styles.saveButtonText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Your Branch ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Branch</Text>
          <View style={styles.branchRow}>
            <View style={styles.branchIconBox}>
              <Ionicons name="storefront-outline" size={20} color={Colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.branchName}>{storedBranchName ?? 'No branch selected'}</Text>
              <Text style={styles.branchSub}>
                {storedBranchName
                  ? 'Your current default branch'
                  : 'Open the branch list to choose one'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.changeBranchBtn} onPress={handleChangeBranch} activeOpacity={0.8}>
            <Ionicons name="swap-horizontal-outline" size={16} color={Colors.espresso} />
            <Text style={styles.changeBranchText}>Change Branch</Text>
          </TouchableOpacity>
          <Text style={styles.branchHint}>
            Updating your address above also resets your branch so we can find the closest one automatically.
          </Text>
        </View>

        {/* ── Food Preferences ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food Preferences</Text>
          {prefsLoading
            ? <ActivityIndicator color={Colors.amber} style={{ marginVertical: 20 }} />
            : (
              <>
                <SectionHeader title="Dietary Restrictions" />
                <ChipRow options={DIETARY_RESTRICTIONS} selected={dietaryRestrictions} onToggle={toggle(setDietaryRestrictions)} />

                <SectionHeader title="Health Goal" />
                <SingleSelect
                  options={HEALTH_GOALS.map(g => ({ key: g, label: g }))}
                  selected={healthGoal}
                  onSelect={v => setHealthGoal(prev => prev === v ? null : v)}
                />

                <SectionHeader title="Food Allergies" />
                <ChipRow options={FOOD_ALLERGIES} selected={foodAllergies} onToggle={toggle(setFoodAllergies)} />

                <SectionHeader title="Cuisine Preferences" />
                <ChipRow options={CUISINE_PREFERENCES} selected={cuisinePreferences} onToggle={toggle(setCuisinePreferences)} />

                <SectionHeader title="Spice Tolerance" />
                <SingleSelect
                  options={SPICE_LEVELS}
                  selected={spiceLevel}
                  onSelect={v => setSpiceLevel(prev => prev === v ? null : v)}
                />

                <SectionHeader title="Taste Preferences" />
                <ChipRow options={TASTE_PREFERENCES} selected={tastePreferences} onToggle={toggle(setTastePreferences)} />

                <SectionHeader title="Disliked Ingredients" />
                <TextInput
                  style={styles.input}
                  value={dislikedIngredients}
                  onChangeText={setDislikedIngredients}
                  placeholder="e.g. onions, mushrooms, cilantro"
                  placeholderTextColor={Colors.textLight}
                />

                <SectionHeader title="Appetite Size" />
                <SingleSelect
                  options={APPETITE_SIZES}
                  selected={appetiteSize}
                  onSelect={v => setAppetiteSize(prev => prev === v ? null : v)}
                />

                <SectionHeader title="Usual Meal Times" />
                <ChipRow options={MEAL_TIMES} selected={usualMealTimes} onToggle={toggle(setUsualMealTimes)} />

                <SectionHeader title="Order Frequency" />
                <SingleSelect
                  options={ORDER_FREQUENCIES}
                  selected={orderFrequency}
                  onSelect={v => setOrderFrequency(prev => prev === v ? null : v)}
                />

                <SectionHeader title="Typical Group Size" />
                <SingleSelect
                  options={GROUP_SIZES}
                  selected={typicalGroupSize}
                  onSelect={v => setTypicalGroupSize(prev => prev === v ? null : v)}
                />

                <SectionHeader title="Budget" />
                <View style={styles.budgetRow}>
                  <View style={styles.budgetInputWrap}>
                    <Text style={styles.budgetSymbol}>₦</Text>
                    <TextInput
                      style={styles.budgetInput}
                      value={budgetUnlimited ? '' : defaultBudget}
                      onChangeText={setDefaultBudget}
                      placeholder="e.g. 5000"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      editable={!budgetUnlimited}
                    />
                  </View>
                  <View style={styles.unlimitedRow}>
                    <Text style={styles.unlimitedLabel}>No limit</Text>
                    <Switch
                      value={budgetUnlimited}
                      onValueChange={v => { setBudgetUnlimited(v); if (v) setDefaultBudget(''); }}
                      trackColor={{ false: Colors.border, true: Colors.amber }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, styles.prefsSaveButton]}
                  onPress={handleSavePreferences}
                  disabled={prefsMutation.isPending}
                  activeOpacity={0.85}
                >
                  {prefsMutation.isPending
                    ? <ActivityIndicator color={Colors.espresso} />
                    : <Text style={styles.saveButtonText}>Save Preferences</Text>}
                </TouchableOpacity>
              </>
            )}
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingBottom: 48 },

  avatarSection: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: Colors.espresso,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.amber,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 34, fontFamily: Fonts.bold, color: Colors.espresso },
  userName: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },
  userEmail: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  roleBadge: {
    marginTop: 8, backgroundColor: 'rgba(240,165,0,0.25)',
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4,
  },
  roleText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.amber },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginHorizontal: 16, marginTop: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardTitle: {
    fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  menuItemFirst: { borderTopWidth: 0 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12,
  },
  menuItemIconBox: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: 'rgba(240,165,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuItemLabel: { flex: 1, fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },

  savedBox: {
    backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: Colors.sageGreen,
    borderRadius: Radius.md, padding: 10, marginBottom: 12,
  },
  savedText: { color: Colors.sageGreen, fontSize: 13, fontFamily: Fonts.semiBold },

  label: {
    fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.text,
    marginBottom: 6, marginTop: 10,
  },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.text,
  },
  addressInput: { minHeight: 64, textAlignVertical: 'top' },

  saveButton: {
    backgroundColor: Colors.amber, borderRadius: Radius.sm,
    paddingVertical: 13, alignItems: 'center', marginTop: 14,
  },
  prefsSaveButton: { marginTop: 20 },
  saveButtonText: { color: Colors.espresso, fontSize: 14, fontFamily: Fonts.bold },

  sectionTitle: {
    fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.text,
    marginTop: 16, marginBottom: 8,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.espresso, backgroundColor: Colors.espresso },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  chipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },

  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  budgetInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 11,
  },
  budgetSymbol: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.textMuted, marginRight: 4 },
  budgetInput: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  unlimitedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unlimitedLabel: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },

  logoutButton: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radius.lg,
    marginHorizontal: 16, marginTop: 20, paddingVertical: 15, alignItems: 'center',
  },
  logoutText: { color: Colors.error, fontSize: 14, fontFamily: Fonts.semiBold },

  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  branchIconBox: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: 'rgba(240,165,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  branchName: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.espresso },
  branchSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  changeBranchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingVertical: 10, marginBottom: 10,
  },
  changeBranchText: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  branchHint: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 16 },
});
