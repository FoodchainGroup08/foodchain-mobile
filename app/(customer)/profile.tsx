import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { updateProfile } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [address, setAddress] = useState(user?.addressLine ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await updateProfile({ name: name.trim(), addressLine: address.trim() || undefined });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const MENU_ITEMS = [
    { icon: '📋', label: 'Active Orders', onPress: () => router.push('/(customer)/orders') },
    { icon: '🕐', label: 'Order History', onPress: () => router.push('/(customer)/history') },
    { icon: '✨', label: 'AI Food Suggestions', onPress: () => router.push('/(customer)/ai') },
    { icon: '🔔', label: 'Notifications', onPress: () => router.push('/(customer)/notifications') },
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{user?.role}</Text></View>
      </View>

      {saved && (
        <View style={styles.savedBox}>
          <Text style={styles.savedText}>✓ Profile updated</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Info</Text>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textLight} autoCapitalize="words" />
        <Text style={styles.label}>Default Delivery Address</Text>
        <TextInput style={[styles.input, styles.addressInput]} value={address} onChangeText={setAddress} placeholder="Enter your address" placeholderTextColor={Colors.textLight} multiline numberOfLines={2} />
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.espresso} /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Access</Text>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuItem, i === 0 && styles.menuItemFirst]} onPress={item.onPress} activeOpacity={0.7}>
            <Text style={styles.menuItemIcon}>{item.icon}</Text>
            <Text style={styles.menuItemLabel}>{item.label}</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: Colors.espresso },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.amber, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 34, fontFamily: Fonts.bold, color: Colors.espresso },
  userName: { fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },
  userEmail: { fontSize: 13, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  roleBadge: { marginTop: 8, backgroundColor: 'rgba(240,165,0,0.25)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.amber },
  savedBox: { backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: Colors.sageGreen, marginHorizontal: 16, marginTop: 16, borderRadius: Radius.md, padding: 12 },
  savedText: { color: Colors.sageGreen, fontSize: 13, fontFamily: Fonts.semiBold },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardTitle: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  label: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.text, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  addressInput: { minHeight: 64, textAlignVertical: 'top' },
  saveButton: { backgroundColor: Colors.amber, borderRadius: Radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  saveButtonText: { color: Colors.espresso, fontSize: 14, fontFamily: Fonts.bold },
  menuItemFirst: { borderTopWidth: 0 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12 },
  menuItemIcon: { fontSize: 20 },
  menuItemLabel: { flex: 1, fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  menuItemArrow: { fontSize: 22, color: Colors.textLight },
  logoutButton: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: Radius.lg, marginHorizontal: 16, marginTop: 20, paddingVertical: 15, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: 14, fontFamily: Fonts.semiBold },
});
