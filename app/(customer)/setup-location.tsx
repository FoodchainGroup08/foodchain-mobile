import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile, getBranchesNearby } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BRANCH_KEY_PREFIX } from '../_layout';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function SetupLocationScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuthStore();
  const [address, setAddress] = useState(user?.addressLine ?? '');
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const handleFind = async () => {
    if (!address.trim()) { Alert.alert('Missing address', 'Enter your delivery address first.'); return; }
    setIsGeolocating(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data[0]) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        Alert.alert('Address not found', 'Try a more specific address (include city/state).');
      }
    } catch {
      Alert.alert('Error', 'Could not geocode address. Check your connection.');
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleContinue = async () => {
    if (!address.trim()) { Alert.alert('Missing address', 'Enter your delivery address.'); return; }
    setIsSaving(true);
    try {
      await updateProfile({
        addressLine: address.trim(),
        ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
      });
      await refreshUser();

      const updatedUser = useAuthStore.getState().user;
      const userLat = updatedUser?.latitude ?? lat;
      const userLng = updatedUser?.longitude ?? lng;

      if (userLat != null && userLng != null) {
        try {
          const nearby = await getBranchesNearby(userLat, userLng);
          const nearest = nearby.find(b => b.isActive) ?? nearby[0];
          if (nearest && updatedUser?.id) {
            await SecureStore.setItemAsync(
              BRANCH_KEY_PREFIX + updatedUser.id,
              JSON.stringify({ branchId: nearest.id, branchName: nearest.name })
            );
            router.replace({ pathname: '/(customer)/menu', params: { branchId: nearest.id, branchName: nearest.name } } as any);
            return;
          }
        } catch {}
      }

      // Fallback: let user pick manually
      router.replace('/(customer)/branches');
    } catch {
      Alert.alert('Error', 'Could not save your address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.heroBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={36} color={Colors.amber} />
          </View>
          <Text style={styles.title}>Set Your Delivery Address</Text>
          <Text style={styles.subtitle}>
            We'll use this to find the closest FoodChain branch and get your food to you faster.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Your delivery address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={v => { setAddress(v); setLat(null); setLng(null); }}
            placeholder="e.g. 14 Admiralty Way, Lekki, Lagos"
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={2}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.findBtn, isGeolocating && styles.btnDisabled]}
            onPress={handleFind}
            disabled={isGeolocating}
            activeOpacity={0.8}
          >
            {isGeolocating
              ? <ActivityIndicator size="small" color={Colors.espresso} />
              : <><Ionicons name="search" size={16} color={Colors.espresso} /><Text style={styles.findBtnText}>Verify Address</Text></>}
          </TouchableOpacity>

          {lat != null && lng != null && (
            <View style={styles.coordBox}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.sageGreen} />
              <Text style={styles.coordText}>
                Location confirmed · {lat.toFixed(4)}, {lng.toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, isSaving && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color={Colors.espresso} />
            : <><Text style={styles.continueBtnText}>Continue</Text><Ionicons name="arrow-forward" size={18} color={Colors.espresso} /></>}
        </TouchableOpacity>

        <Text style={styles.hint}>
          You can update your address anytime from Profile → Personal Info.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  heroBox: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(240,165,0,0.12)',
    borderWidth: 2, borderColor: 'rgba(240,165,0,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.espresso, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 21 },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 20,
    borderWidth: 1, borderColor: Colors.border, gap: 12, marginBottom: 20,
  },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.text,
    minHeight: 64, textAlignVertical: 'top',
  },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.muted, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  findBtnText: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  coordBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  coordText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.sageGreen, flex: 1 },

  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 16,
    shadowColor: Colors.amber, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4, marginBottom: 16,
  },
  continueBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  btnDisabled: { opacity: 0.5 },

  hint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },
});
