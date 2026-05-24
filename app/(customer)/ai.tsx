import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getFoodSuggestions, getUserPreferencesV2,
  type ComboSuggestion, type AiRecommendationResponse,
} from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { Colors, Fonts, Radius } from '@/constants/colors';
import Toast from 'react-native-toast-message';

// ─── Constants ────────────────────────────────────────────────────────────────

type Step = 'hunger' | 'budget' | 'mood' | 'loading' | 'results' | 'error';
const STEPS: Step[] = ['hunger', 'budget', 'mood'];

const HUNGER_OPTIONS = [
  { label: 'Light snack', sub: 'Something small to tide me over', appetite: 'light' as const },
  { label: 'Moderately hungry', sub: 'A proper, satisfying meal', appetite: 'moderate' as const },
  { label: 'Very hungry', sub: 'Go big — I need a feast', appetite: 'heavy' as const },
];

const BUDGET_OPTIONS = [
  { label: 'Under ₦5k', max: 5000, unlimited: false },
  { label: '₦5k – ₦10k', max: 10000, unlimited: false },
  { label: '₦10k – ₦15k', max: 15000, unlimited: false },
  { label: '₦15k+', max: undefined, unlimited: true },
];

const MOOD_OPTIONS = ['Spicy', 'Sweet', 'Savory', 'Comfort food'];

// ─── Combo card ───────────────────────────────────────────────────────────────

function ComboCard({ combo, onAddCombo, onAddItem }: {
  combo: ComboSuggestion;
  onAddCombo: (c: ComboSuggestion) => void;
  onAddItem: (id: string, name: string, price: number) => void;
}) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddCombo(combo);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <View style={s.comboCard}>
      <View style={s.comboHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.comboName}>{combo.comboName}</Text>
          <Text style={s.comboPrice}>₦{combo.totalPrice.toLocaleString()}</Text>
        </View>
        {combo.healthScore > 0 && (
          <View style={s.scoreBadge}>
            <Ionicons name="heart" size={11} color={Colors.sageGreen} />
            <Text style={s.scoreText}>{combo.healthScore}</Text>
          </View>
        )}
      </View>

      {combo.wellnessTags?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagsRow}>
          {combo.wellnessTags.map(tag => (
            <View key={tag} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {combo.items?.map(item => (
        <View key={item.menuItemId} style={s.itemRow}>
          <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={s.itemRight}>
            <Text style={s.itemPrice}>₦{item.price.toLocaleString()}</Text>
            <TouchableOpacity
              style={s.addItemBtn}
              onPress={() => onAddItem(item.menuItemId, item.name, item.price)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {combo.reason ? (
        <Text style={s.comboReason}>{combo.reason}</Text>
      ) : null}

      <TouchableOpacity
        style={[s.addComboBtn, added && s.addComboBtnDone]}
        onPress={handleAdd}
        activeOpacity={0.85}
      >
        <Ionicons name={added ? 'checkmark' : 'cart'} size={15} color="#fff" />
        <Text style={s.addComboBtnText}>{added ? 'Added!' : 'Add Combo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HelpMeChooseScreen() {
  const router = useRouter();
  const { branchId, branchName } = useLocalSearchParams<{ branchId: string; branchName: string }>();
  const { addItem, items: cartItems } = useCartStore();

  const [step, setStep] = useState<Step>('hunger');
  const [hunger, setHunger] = useState<typeof HUNGER_OPTIONS[0] | null>(null);
  const [budget, setBudget] = useState<typeof BUDGET_OPTIONS[0] | null>(null);
  const [customBudget, setCustomBudget] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [result, setResult] = useState<AiRecommendationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: savedPrefs } = useQuery({
    queryKey: ['prefsV2'],
    queryFn: getUserPreferencesV2,
    staleTime: 5 * 60 * 1000,
  });

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const stepIdx = STEPS.indexOf(step as any);
  const isQuestionStep = stepIdx !== -1;

  const handleHunger = (opt: typeof HUNGER_OPTIONS[0]) => {
    setHunger(opt);
    setStep('budget');
  };

  const handleBack = () => {
    if (step === 'budget') setStep('hunger');
    else if (step === 'mood') setStep('budget');
    else if (step === 'results' || step === 'error') reset();
  };

  const handleSubmit = async () => {
    if (!branchId || !branchName) return;
    setStep('loading');
    setErrorMsg('');

    const budgetVal = customBudget ? parseFloat(customBudget) : budget?.max;
    const budgetUnlimited = !customBudget && !!budget?.unlimited;

    const moodMap: Record<string, string> = {
      Spicy: 'spicy', Sweet: 'sweet', Savory: 'savory', 'Comfort food': 'comfort',
    };

    try {
      const res = await getFoodSuggestions({
        branchId,
        branchName,
        appetite: hunger?.appetite ?? 'moderate',
        ...(budgetVal !== undefined && { budget: budgetVal }),
        budgetUnlimited,
        moods: moods.map(m => moodMap[m] ?? m.toLowerCase()),
        dietaryRestrictions: savedPrefs?.dietaryRestrictions ?? [],
        cuisinePreferences: savedPrefs?.cuisinePreferences ?? [],
        spiceLevel: savedPrefs?.spiceLevel ?? null,
        limit: 3,
      });

      setResult(res);
      if (res.suggestions?.length > 0) {
        setStep('results');
      } else {
        setErrorMsg(res.message || 'No combos matched your preferences. Try different options.');
        setStep('error');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? "Couldn't get recommendations. Please try again.");
      setStep('error');
    }
  };

  const handleAddItem = (id: string, name: string, price: number) => {
    addItem(
      { id, name, description: '', price, category: '', available: true },
      branchId!, branchName!
    );
    Toast.show({ type: 'success', text1: 'Added to cart', text2: name, visibilityTime: 1500 });
  };

  const handleAddCombo = (combo: ComboSuggestion) => {
    combo.items.forEach(item => handleAddItem(item.menuItemId, item.name, item.price));
    Toast.show({ type: 'success', text1: `"${combo.comboName}" added`, visibilityTime: 1800 });
  };

  const handleAddAll = () => {
    result?.suggestions?.forEach(c =>
      c.items.forEach(item =>
        addItem(
          { id: item.menuItemId, name: item.name, description: '', price: item.price, category: '', available: true },
          branchId!, branchName!
        )
      )
    );
    Toast.show({ type: 'success', text1: 'All combos added to cart' });
  };

  const reset = () => {
    setHunger(null); setBudget(null); setCustomBudget(''); setMoods([]);
    setResult(null); setErrorMsg('');
    setStep('hunger');
  };

  // ── Step content ─────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 'hunger':
        return (
          <View style={s.section}>
            <Text style={s.stepTitle}>How hungry are you?</Text>
            <Text style={s.stepSub}>We'll size the portions just right.</Text>
            <View style={s.hungerOptions}>
              {HUNGER_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.label} style={s.hungerCard} onPress={() => handleHunger(opt)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.hungerLabel}>{opt.label}</Text>
                    <Text style={s.hungerSub}>{opt.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'budget':
        return (
          <View style={s.section}>
            <Text style={s.stepTitle}>{"What's your budget?"}</Text>
            <Text style={s.stepSub}>Optional — we'll stay within range.</Text>
            <View style={s.budgetGrid}>
              {BUDGET_OPTIONS.map(opt => {
                const selected = budget?.label === opt.label && !customBudget;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[s.budgetChip, selected && s.budgetChipActive]}
                    onPress={() => { setBudget(opt); setCustomBudget(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.budgetChipText, selected && s.budgetChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.customRow}>
              <Text style={s.currencySymbol}>₦</Text>
              <TextInput
                style={s.customInput}
                value={customBudget}
                onChangeText={v => { setCustomBudget(v); setBudget(null); }}
                placeholder="Custom amount"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 'mood':
        return (
          <View style={s.section}>
            <Text style={s.stepTitle}>What are you in the mood for?</Text>
            <Text style={s.stepSub}>Pick as many as you like.</Text>
            <View style={s.moodGrid}>
              {MOOD_OPTIONS.map(mood => {
                const on = moods.includes(mood);
                return (
                  <TouchableOpacity
                    key={mood}
                    style={[s.moodChip, on && s.moodChipActive]}
                    onPress={() => setMoods(m => m.includes(mood) ? m.filter(x => x !== mood) : [...m, mood])}
                    activeOpacity={0.8}
                  >
                    {on && <Ionicons name="checkmark" size={14} color="#fff" />}
                    <Text style={[s.moodChipText, on && s.moodChipTextActive]}>{mood}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'loading':
        return (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={Colors.amber} />
            <Text style={s.loadingText}>Finding the best combos for you…</Text>
            <Text style={s.loadingSub}>{branchName}</Text>
          </View>
        );

      case 'results':
        if (!result?.suggestions?.length) return null;
        return (
          <View style={{ gap: 12 }}>
            <Text style={s.resultsLabel}>
              {result.suggestions.length} combo{result.suggestions.length !== 1 ? 's' : ''} picked for you
            </Text>
            {result.suggestions.map((combo, i) => (
              <ComboCard key={i} combo={combo} onAddCombo={handleAddCombo} onAddItem={handleAddItem} />
            ))}
            <TouchableOpacity style={s.addAllBtn} onPress={handleAddAll} activeOpacity={0.85}>
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={s.addAllBtnText}>Add All to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostRow} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="refresh" size={14} color={Colors.textMuted} />
              <Text style={s.ghostRowText}>Try different preferences</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={s.centered}>
            <View style={s.errorIconBox}>
              <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
            </View>
            <Text style={s.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={s.ghostRow} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="refresh" size={14} color={Colors.textMuted} />
              <Text style={s.ghostRowText}>Try again</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  // ── Footer ──────────────────────────────────────────────────────────────────

  const renderFooter = () => {
    if (!isQuestionStep) return null;
    const isLast = step === 'mood';

    return (
      <View style={s.footer}>
        {step !== 'hunger' && (
          <TouchableOpacity style={s.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={16} color={Colors.espresso} />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {step === 'budget' && (
          <TouchableOpacity style={s.skipBtn} onPress={() => setStep('mood')}>
            <Text style={s.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.nextBtn}
          onPress={isLast ? handleSubmit : () => setStep(step === 'budget' ? 'mood' : 'budget')}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>{isLast ? 'Get Recommendations' : 'Next'}</Text>
          <Ionicons name={isLast ? 'sparkles' : 'arrow-forward'} size={14} color={Colors.espresso} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.flex} edges={['bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.espresso} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help Me Choose</Text>
        {isQuestionStep
          ? <Text style={s.stepCounter}>{stepIdx + 1} / {STEPS.length}</Text>
          : <View style={{ width: 40 }} />
        }
      </View>

      {/* Progress dots */}
      {isQuestionStep && (
        <View style={s.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.dot, i <= stepIdx && s.dotActive]} />
          ))}
        </View>
      )}

      {/* Content */}
      <ScrollView style={s.flex} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={s.cartBar}
          onPress={() => router.push('/(customer)/cart' as any)}
          activeOpacity={0.9}
        >
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeText}>{cartCount}</Text>
          </View>
          <Text style={s.cartBarLabel}>View Cart</Text>
          <Text style={s.cartBarTotal}>₦{cartTotal.toLocaleString()}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {renderFooter()}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  stepCounter: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted, minWidth: 40, textAlign: 'right' },

  dotsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.amber },

  scrollContent: { padding: 20, paddingBottom: 24, flexGrow: 1 },

  section: { gap: 16 },
  stepTitle: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.espresso },
  stepSub: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: -8 },

  // Hunger
  hungerOptions: { gap: 10 },
  hungerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  hungerLabel: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.espresso },
  hungerSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },

  // Budget
  budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  budgetChip: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  budgetChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  budgetChipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.espresso },
  budgetChipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },
  customRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  currencySymbol: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  customInput: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },

  // Mood
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  moodChipActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  moodChipText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.espresso },
  moodChipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },

  // Loading
  loadingText: { fontSize: 15, fontFamily: Fonts.medium, color: Colors.espresso, textAlign: 'center' },
  loadingSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },

  // Results
  resultsLabel: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  addAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.espresso, borderRadius: Radius.md, paddingVertical: 14,
  },
  addAllBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
  ghostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  ghostRowText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },

  // Error
  errorIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  errorText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.text, textAlign: 'center', maxWidth: 280, lineHeight: 22 },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4 },
  backBtnText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.espresso },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  skipBtnText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textMuted },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.amber, borderRadius: Radius.md, paddingHorizontal: 18, paddingVertical: 12,
  },
  nextBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.espresso },

  // Sticky cart bar
  cartBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.espresso, paddingHorizontal: 20, paddingVertical: 14,
  },
  cartBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.amber,
    justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.espresso },
  cartBarLabel: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff', flex: 1 },
  cartBarTotal: { fontSize: 13, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.75)' },

  // Combo card
  comboCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  comboHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  comboName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  comboPrice: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.amber, marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0FDF4', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  scoreText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.sageGreen },
  tagsRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  tag: { backgroundColor: '#F0FDF4', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.sageGreen },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(59,35,20,0.04)', borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  itemName: { flex: 1, fontSize: 13, fontFamily: Fonts.medium, color: Colors.espresso, marginRight: 8 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.amber },
  addItemBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.espresso, justifyContent: 'center', alignItems: 'center',
  },
  comboReason: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 18 },
  addComboBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.espresso, borderRadius: Radius.md, paddingVertical: 10,
  },
  addComboBtnDone: { backgroundColor: Colors.sageGreen },
  addComboBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: '#fff' },
});
