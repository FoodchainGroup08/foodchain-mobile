import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radius } from '@/constants/colors';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: '🍽️', title: 'Full Menu, Always Fresh', body: 'Browse every item and price before you order.' },
  { icon: '📦', title: 'Live Order Tracking', body: 'Follow your order from the kitchen to your door.' },
  { icon: '⚡', title: 'Quick Checkout', body: 'Cart, address, payment — done in under a minute.' },
];

export default function LandingScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>🍽️</Text>
        </View>
        <Text style={styles.brand}>FoodChain</Text>
        <Text style={styles.tagline}>Your favourite meals, delivered fast</Text>

        <View style={styles.aiPreview}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiHeaderText}>✨ AI Food Assistant</Text>
          </View>
          <View style={styles.aiBody}>
            {[
              { name: 'Jollof Rice Combo', price: '₦3,500', reason: 'Hearty and savory — matches your appetite' },
              { name: 'Grilled Chicken Wrap', price: '₦2,800', reason: 'Light, protein-rich, great for a healthy mood' },
            ].map((s, i) => (
              <View key={i} style={styles.aiSuggestion}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiSugName}>{s.name}</Text>
                  <Text style={styles.aiSugReason}>{s.reason}</Text>
                </View>
                <Text style={styles.aiSugPrice}>{s.price}</Text>
              </View>
            ))}
          </View>
          <View style={styles.aiDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.aiDot, i === 0 && styles.aiDotActive]} />
            ))}
          </View>
        </View>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/(auth)/register')} activeOpacity={0.85}>
          <Text style={styles.ctaPrimaryText}>Get Started — It's Free</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
          <Text style={styles.ctaSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>FoodChain · Connecting kitchens to customers</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingBottom: 48 },

  hero: { alignItems: 'center', paddingTop: 72, paddingBottom: 32, paddingHorizontal: 24, backgroundColor: Colors.espresso },
  logoWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.amber, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoIcon: { fontSize: 36 },
  brand: { fontSize: 32, fontFamily: Fonts.bold, color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 15, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.7)', marginTop: 6, marginBottom: 28, textAlign: 'center' },

  aiPreview: { width: width - 48, backgroundColor: '#fff', borderRadius: Radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: Colors.amberLight, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.2)' },
  aiHeaderText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso },
  aiBody: { padding: 12, gap: 10 },
  aiSuggestion: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  aiSugName: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso },
  aiSugReason: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  aiSugPrice: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.amber },
  aiDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 12 },
  aiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.muted },
  aiDotActive: { backgroundColor: Colors.amber, width: 16 },

  features: { padding: 20, gap: 12 },
  featureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border },
  featureIcon: { fontSize: 26, marginTop: 2 },
  featureTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  featureBody: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 3, lineHeight: 17 },

  ctaWrap: { paddingHorizontal: 20, gap: 12, marginTop: 4 },
  ctaPrimary: { backgroundColor: Colors.amber, borderRadius: Radius.lg, paddingVertical: 17, alignItems: 'center', shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  ctaPrimaryText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  ctaSecondary: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center' },
  ctaSecondaryText: { fontSize: 15, fontFamily: Fonts.medium, color: Colors.espresso },

  footer: { textAlign: 'center', fontSize: 11, fontFamily: Fonts.regular, color: Colors.textLight, marginTop: 24 },
});
