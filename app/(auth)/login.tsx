import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Fonts, Radius } from '@/constants/colors';

function routeForRole(role: string | undefined): string {
  if (role === 'Kitchen Staff') return '/(kitchen)/';
  if (role === 'Branch Manager') return '/(manager)/';
  if (role === 'Admin') return '/(admin)/';
  return '/(customer)/branches';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert('Missing fields', 'Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      const { user } = useAuthStore.getState();
      router.replace(routeForRole(user?.role) as any);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid email or password.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logoRow}>
        <View style={styles.logoBox}><Text style={styles.logoIcon}>🍽️</Text></View>
        <View>
          <Text style={styles.brand}>FoodChain</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input} value={email} onChangeText={setEmail}
          placeholder="you@example.com" placeholderTextColor={Colors.textLight}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email"
        />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passRow}>
          <TextInput
            style={[styles.input, styles.passInput]} value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor={Colors.textLight}
            secureTextEntry={!showPass} autoComplete="password"
          />
          <TouchableOpacity style={styles.passToggle} onPress={() => setShowPass(v => !v)}>
            <Text style={styles.passToggleText}>{showPass ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={Colors.espresso} /> : <Text style={styles.submitBtnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.footerLink}>Create one</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, paddingTop: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.espresso, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { fontSize: 26 },
  brand: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso },
  tagline: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  passRow: { position: 'relative' },
  passInput: { paddingRight: 70 },
  passToggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  passToggleText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.amber },
  forgotRow: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.amber },
  submitBtn: { backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  submitBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted },
  footerLink: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.amber },
});
