import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { postResetPassword } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (!token) { Alert.alert('Invalid link', 'This reset link is invalid or expired.'); return; }
    if (password.length < 8) { Alert.alert('Weak password', 'Password must be at least 8 characters.'); return; }
    if (password !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      await postResetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not reset password. The link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Password reset!</Text>
        <Text style={styles.successBody}>Your password has been updated. You can now sign in with your new password.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.btnText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>Choose a strong password for your account.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.passRow}>
          <TextInput style={[styles.input, styles.passInput]} value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={Colors.textLight} secureTextEntry={!showPass} />
          <TouchableOpacity style={styles.passToggle} onPress={() => setShowPass(v => !v)}>
            <Text style={styles.passToggleText}>{showPass ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" placeholderTextColor={Colors.textLight} secureTextEntry={!showPass} />
        <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={Colors.espresso} /> : <Text style={styles.btnText}>Reset Password</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, paddingTop: 32 },
  title: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: 28 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  passRow: { position: 'relative' },
  passInput: { paddingRight: 70 },
  passToggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  passToggleText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.amber },
  btn: { backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  btnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.background },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 12 },
  successBody: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
