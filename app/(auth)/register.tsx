import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) { Alert.alert('Missing fields', 'Please fill in all fields.'); return; }
    if (password.length < 8) { Alert.alert('Weak Password', 'Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim().toLowerCase(), password);
      if (result === 'verify_email') {
        router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim().toLowerCase() } });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not create your account. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          <View style={styles.logoDiamond} />
          <View style={styles.logoCircle} />
        </View>
        <View>
          <Text style={styles.brand}>Join FoodChain</Text>
          <Text style={styles.tagline}>Create your free account</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" placeholderTextColor={Colors.textLight} autoCapitalize="words" autoComplete="name" />

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={Colors.textLight} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passRow}>
          <TextInput style={[styles.input, styles.passInput]} value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={Colors.textLight} secureTextEntry={!showPass} autoComplete="new-password" />
          <TouchableOpacity style={styles.passToggle} onPress={() => setShowPass(v => !v)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.amber} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>We'll send a verification link to your email.</Text>

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color={Colors.espresso} />
            : <>
                <Text style={styles.submitBtnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.espresso} />
              </>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.footerLink}>Sign in</Text>
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
  logoDiamond: { position: 'absolute', width: 24, height: 24, backgroundColor: Colors.amber, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  logoCircle: { position: 'absolute', width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.espresso },
  brand: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso },
  tagline: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  passRow: { position: 'relative' },
  passInput: { paddingRight: 70 },
  passToggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', padding: 4 },
  hint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 6 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, marginTop: 20 },
  submitBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted },
  footerLink: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.amber },
});
