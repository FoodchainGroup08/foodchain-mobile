import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { postForgotPassword } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { Alert.alert('Missing email', 'Please enter your email address.'); return; }
    setLoading(true);
    try {
      await postForgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      Alert.alert('Error', 'Could not send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>📧</Text>
        <Text style={styles.successTitle}>Check your inbox</Text>
        <Text style={styles.successBody}>We've sent a password reset link to {email}. Check your email and follow the instructions.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Forgot your password?</Text>
      <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={Colors.textLight} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={Colors.espresso} /> : <Text style={styles.btnText}>Send Reset Link</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, paddingTop: 32 },
  title: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: 28, lineHeight: 21 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  btn: { backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  btnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.background },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 12 },
  successBody: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
