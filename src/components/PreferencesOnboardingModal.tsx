import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveUserPreferencesV2, type SavePreferencesV2Request } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import Toast from 'react-native-toast-message';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Halal', 'Gluten Free',
  'Dairy Free', 'Nut Free', 'No Pork', 'No Seafood',
];

const HEALTH_GOALS = [
  { id: 'no_restrictions', label: 'No restrictions' },
  { id: 'eating_healthy', label: 'Eating healthy' },
  { id: 'low_calorie', label: 'Low calorie' },
  { id: 'high_protein', label: 'High protein' },
  { id: 'weight_loss', label: 'Weight loss' },
];

const ALLERGY_OPTIONS = ['Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Gluten', 'Soy'];

const CUISINE_OPTIONS = [
  'Nigerian', 'Continental', 'Asian', 'Italian', 'Fast Food',
];

const SPICE_OPTIONS = [
  { id: 'none', label: 'None', icon: '💧' },
  { id: 'mild', label: 'Mild', icon: '🌿' },
  { id: 'medium', label: 'Medium', icon: '🌶️' },
  { id: 'hot', label: 'Hot', icon: '🔥' },
  { id: 'extra_hot', label: 'Extra', icon: '🌋' },
];

const TASTE_OPTIONS = ['Savoury', 'Sweet', 'Smoky', 'Tangy', 'Umami'];

const APPETITE_OPTIONS = [
  { id: 'light', label: 'Light', desc: 'Small portions' },
  { id: 'regular', label: 'Regular', desc: 'Standard portions' },
  { id: 'large', label: 'Large', desc: 'Generous portions' },
];

const MEAL_TIME_OPTIONS = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night'];

const ORDER_FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'few_times_week', label: 'Few times/week' },
  { id: 'weekends_only', label: 'Weekends only' },
  { id: 'occasionally', label: 'Occasionally' },
];

const GROUP_SIZE_OPTIONS = [
  { id: 'solo', label: 'Solo' },
  { id: 'two_people', label: 'Couple' },
  { id: 'family', label: 'Family (3–4)' },
  { id: 'large_group', label: 'Large group' },
];

const BUDGET_PRESETS = [
  { label: 'Under ₦5k', value: 4999 },
  { label: '₦5k – ₦10k', value: 10000 },
  { label: '₦10k – ₦20k', value: 20000 },
  { label: 'No limit', value: null },
];

const STEPS = ['Dietary & Health', 'Taste & Flavour', 'Eating Habits'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={s.sectionLabel}>{children}</Text>;
}

function ChipGrid({ options, selected, onToggle }: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={s.chipWrap}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SingleGrid({ options, selected, onSelect }: {
  options: Array<{ id: string; label: string; desc?: string }>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={s.twoColGrid}>
      {options.map(o => {
        const active = selected === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            style={[s.gridCell, active && s.gridCellActive]}
            onPress={() => onSelect(o.id)}
            activeOpacity={0.75}
          >
            <Text style={[s.gridCellText, active && s.gridCellTextActive]}>{o.label}</Text>
            {o.desc ? <Text style={[s.gridCellDesc, active && { color: 'rgba(255,255,255,0.65)' }]}>{o.desc}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PreferencesOnboardingModal({ visible, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [dietary, setDietary] = useState<string[]>([]);
  const [healthGoal, setHealthGoal] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);

  const [cuisines, setCuisines] = useState<string[]>([]);
  const [spice, setSpice] = useState<string | null>(null);
  const [taste, setTaste] = useState<string[]>([]);
  const [dislikedInput, setDislikedInput] = useState('');
  const [disliked, setDisliked] = useState<string[]>([]);

  const [appetite, setAppetite] = useState<string | null>(null);
  const [mealTimes, setMealTimes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null | undefined>(undefined);

  const toggle = (list: string[], setList: (v: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const addDisliked = () => {
    const t = dislikedInput.trim().toLowerCase();
    if (t && !disliked.includes(t)) setDisliked(p => [...p, t]);
    setDislikedInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    const budgetUnlimited = budget === null || budget === undefined;
    const payload: SavePreferencesV2Request = {
      dietaryRestrictions: dietary,
      cuisinePreferences: cuisines,
      spiceLevel: spice,
      budgetUnlimited,
      ...(budgetUnlimited ? {} : { defaultBudget: budget ?? undefined }),
      healthGoal,
      foodAllergies: allergies,
      tastePreferences: taste,
      dislikedIngredients: disliked,
      appetiteSize: appetite,
      usualMealTimes: mealTimes,
      orderFrequency: frequency,
      typicalGroupSize: groupSize,
    };
    try {
      await saveUserPreferencesV2(payload);
      Toast.show({ type: 'success', text1: 'Preferences saved!', text2: "We'll personalise your experience." });
      onClose();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save preferences', text2: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          {/* Drag handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Personalise FoodChain</Text>
              <Text style={s.subtitle}>{STEPS[step]}</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.espresso} />
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={s.progressRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.progressDot, i <= step && s.progressDotActive]} />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={s.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Step 1: Dietary & Health ── */}
            {step === 0 && (
              <>
                <SectionLabel>Dietary Restrictions</SectionLabel>
                <ChipGrid options={DIETARY_OPTIONS} selected={dietary} onToggle={v => toggle(dietary, setDietary, v)} />

                <SectionLabel>Health Goal</SectionLabel>
                <SingleGrid options={HEALTH_GOALS} selected={healthGoal} onSelect={id => setHealthGoal(healthGoal === id ? null : id)} />

                <SectionLabel>Food Allergies</SectionLabel>
                <ChipGrid options={ALLERGY_OPTIONS} selected={allergies} onToggle={v => toggle(allergies, setAllergies, v)} />
              </>
            )}

            {/* ── Step 2: Taste & Flavour ── */}
            {step === 1 && (
              <>
                <SectionLabel>Favourite Cuisines</SectionLabel>
                <ChipGrid options={CUISINE_OPTIONS} selected={cuisines} onToggle={v => toggle(cuisines, setCuisines, v)} />

                <SectionLabel>Spice Tolerance</SectionLabel>
                <View style={s.spiceRow}>
                  {SPICE_OPTIONS.map(o => {
                    const active = spice === o.id;
                    return (
                      <TouchableOpacity
                        key={o.id}
                        style={[s.spiceCell, active && s.spiceCellActive]}
                        onPress={() => setSpice(spice === o.id ? null : o.id)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.spiceIcon}>{o.icon}</Text>
                        <Text style={[s.spiceLabel, active && { color: '#fff' }]}>{o.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <SectionLabel>Taste Preferences</SectionLabel>
                <ChipGrid options={TASTE_OPTIONS} selected={taste} onToggle={v => toggle(taste, setTaste, v)} />

                <SectionLabel>Disliked Ingredients</SectionLabel>
                <View style={s.dislikedRow}>
                  <TextInput
                    style={s.dislikedInput}
                    value={dislikedInput}
                    onChangeText={setDislikedInput}
                    placeholder="e.g. liver, olives…"
                    placeholderTextColor={Colors.textLight}
                    onSubmitEditing={addDisliked}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={s.addBtn} onPress={addDisliked} activeOpacity={0.8}>
                    <Text style={s.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {disliked.length > 0 && (
                  <View style={s.chipWrap}>
                    {disliked.map(item => (
                      <TouchableOpacity
                        key={item}
                        style={s.dislikedChip}
                        onPress={() => setDisliked(p => p.filter(x => x !== item))}
                        activeOpacity={0.75}
                      >
                        <Text style={s.dislikedChipText}>{item}</Text>
                        <Ionicons name="close" size={12} color={Colors.espresso} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ── Step 3: Eating Habits ── */}
            {step === 2 && (
              <>
                <SectionLabel>Appetite Size</SectionLabel>
                <SingleGrid options={APPETITE_OPTIONS} selected={appetite} onSelect={id => setAppetite(appetite === id ? null : id)} />

                <SectionLabel>Usual Meal Times</SectionLabel>
                <ChipGrid options={MEAL_TIME_OPTIONS} selected={mealTimes} onToggle={v => toggle(mealTimes, setMealTimes, v)} />

                <SectionLabel>How Often Do You Order?</SectionLabel>
                <SingleGrid options={ORDER_FREQUENCY_OPTIONS} selected={frequency} onSelect={id => setFrequency(frequency === id ? null : id)} />

                <SectionLabel>Typical Group Size</SectionLabel>
                <SingleGrid options={GROUP_SIZE_OPTIONS} selected={groupSize} onSelect={id => setGroupSize(groupSize === id ? null : id)} />

                <SectionLabel>Typical Budget Per Meal</SectionLabel>
                <View style={s.twoColGrid}>
                  {BUDGET_PRESETS.map(p => {
                    const active = budget === p.value;
                    return (
                      <TouchableOpacity
                        key={String(p.value)}
                        style={[s.gridCell, active && s.budgetCellActive]}
                        onPress={() => setBudget(p.value)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.gridCellText, active && { color: Colors.espresso, fontFamily: Fonts.bold }]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Navigation ── */}
            <View style={s.navSection}>
              {step < 2 ? (
                <TouchableOpacity style={s.nextBtn} onPress={() => setStep(p => p + 1)} activeOpacity={0.85}>
                  <Text style={s.nextBtnText}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.nextBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Text style={s.nextBtnText}>Save Preferences</Text>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </>
                  }
                </TouchableOpacity>
              )}

              <View style={s.secondaryNav}>
                {step > 0 && (
                  <TouchableOpacity style={s.backBtn} onPress={() => setStep(p => p - 1)} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={16} color={Colors.textMuted} />
                    <Text style={s.backBtnText}>Back</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={s.skipBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={s.skipBtnText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(59,35,20,0.18)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  title: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.espresso },
  subtitle: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(59,35,20,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, marginBottom: 4 },
  progressDot: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(59,35,20,0.12)',
  },
  progressDotActive: { backgroundColor: Colors.espresso },
  body: { paddingHorizontal: 24, paddingTop: 8, gap: 6, paddingBottom: 8 },

  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.espresso, backgroundColor: Colors.espresso },
  chipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  chipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },

  twoColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface, flex: 1, minWidth: '45%',
  },
  gridCellActive: { borderColor: Colors.espresso, backgroundColor: Colors.espresso },
  gridCellText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text },
  gridCellTextActive: { color: '#fff' },
  gridCellDesc: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },

  spiceRow: { flexDirection: 'row', gap: 6 },
  spiceCell: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  spiceCellActive: { borderColor: Colors.espresso, backgroundColor: Colors.espresso },
  spiceIcon: { fontSize: 18, marginBottom: 4 },
  spiceLabel: { fontSize: 10, fontFamily: Fonts.medium, color: Colors.textMuted, textAlign: 'center' },

  dislikedRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dislikedInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.text,
  },
  addBtn: {
    backgroundColor: Colors.espresso, borderRadius: Radius.md,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  addBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
  dislikedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  dislikedChipText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.espresso },

  budgetCellActive: { borderColor: Colors.amber, backgroundColor: 'rgba(240,165,0,0.12)' },

  navSection: { marginTop: 24, gap: 8 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.espresso, borderRadius: Radius.md, paddingVertical: 16,
  },
  nextBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: '#fff' },
  secondaryNav: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4 },
  backBtnText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 4 },
  skipBtnText: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(59,35,20,0.45)' },
});
