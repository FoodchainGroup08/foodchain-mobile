import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Fonts, Radius } from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

function routeForRole(role: string | undefined): string {
  if (role === 'Kitchen Staff') return '/(kitchen)/';
  if (role === 'Branch Manager') return '/(manager)/';
  if (role === 'Admin') return '/(admin)/';
  return '/(customer)/branches';
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = (response as any).authentication?.idToken
        ?? (response as any).params?.id_token;
      const accessToken = (response as any).authentication?.accessToken;
      const credential = idToken ?? accessToken;
      if (credential) {
        handleGoogleCredential(credential);
      } else {
        Alert.alert('Google Sign-In Failed', 'Could not retrieve credentials from Google.');
        setGoogleLoading(false);
      }
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-In Failed', response.error?.message ?? 'An error occurred.');
      setGoogleLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
      const { user } = useAuthStore.getState();
      router.replace(routeForRole(user?.role) as any);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Google sign-in failed. Please try again.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
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
      {/* ── Logo & Brand ── */}
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          <View style={styles.logoDiamond} />
          <View style={styles.logoCircle} />
        </View>
        <View>
          <Text style={styles.brand}>FoodChain</Text>
          <Text style={styles.tagline}>Sign in to your account</Text>
        </View>
      </View>

      {/* ── Google Sign-In ── */}
      {GOOGLE_WEB_CLIENT_ID ? (
        <TouchableOpacity
          style={[styles.googleBtn, (googleLoading || !request) && styles.googleBtnDisabled]}
          onPress={() => { setGoogleLoading(true); promptAsync(); }}
          disabled={googleLoading || !request}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <>
              <View style={styles.googleLogoBox}>
                <GoogleLogo size={20} />
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {GOOGLE_WEB_CLIENT_ID ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : null}

      {/* ── Email / Password Form ── */}
      <View style={styles.card}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon, styles.passInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.textLight}
            secureTextEntry={!showPass}
            autoComplete="password"
          />
          <TouchableOpacity style={styles.passToggle} onPress={() => setShowPass(v => !v)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.amber} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={Colors.espresso} />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.espresso} />
            </>
          )}
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
  container: { padding: 24, paddingTop: 40 },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32 },
  logoBox: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.espresso,
    justifyContent: 'center', alignItems: 'center',
  },
  logoDiamond: {
    position: 'absolute', width: 24, height: 24, backgroundColor: Colors.amber,
    transform: [{ rotate: '45deg' }], borderRadius: 3,
  },
  logoCircle: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.background,
  },
  brand: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso },
  tagline: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleLogoBox: {
    width: 24, height: 24, justifyContent: 'center', alignItems: 'center',
  },
  googleBtnText: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.text },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 12, marginBottom: 6 },
  inputRow: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: 14, zIndex: 1 },
  input: {
    flex: 1, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: Fonts.regular, color: Colors.text,
  },
  inputWithIcon: { paddingLeft: 42 },
  passInput: { paddingRight: 48 },
  passToggle: { position: 'absolute', right: 14, padding: 4 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.amber },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 15, marginTop: 20,
  },
  submitBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted },
  footerLink: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.amber },
});
