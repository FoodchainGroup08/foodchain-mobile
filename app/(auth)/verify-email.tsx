import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { postResendVerification } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await postResendVerification(email);
      setResent(true);
    } catch {
      Alert.alert('Error', 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>📧</Text>
      </View>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>
        We sent a verification link to{'\n'}
        <Text style={styles.emailText}>{email || 'your email address'}</Text>
        {'\n\n'}Click the link in the email to activate your account.
      </Text>

      {resent ? (
        <View style={styles.sentBanner}>
          <Text style={styles.sentText}>✓ Verification email resent!</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending || !email}>
          {resending ? <ActivityIndicator color={Colors.espresso} size="small" /> : <Text style={styles.resendText}>Resend verification email</Text>}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.loginBtnText}>Go to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.amberLight, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 44 },
  title: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emailText: { fontFamily: Fonts.semiBold, color: Colors.espresso },
  resendBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 13, paddingHorizontal: 24, marginBottom: 12 },
  resendText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.textMuted },
  sentBanner: { backgroundColor: '#F0FDF4', borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 20, borderLeftWidth: 3, borderLeftColor: Colors.sageGreen, marginBottom: 12 },
  sentText: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.sageGreen },
  loginBtn: { backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, paddingHorizontal: 40, marginTop: 8 },
  loginBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
});
