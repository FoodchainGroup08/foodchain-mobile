import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: IoniconsName; title: string; desc: string }[] = [
  {
    icon: 'restaurant-outline',
    title: 'Browse Menus',
    desc: "Explore dishes from all branches and find exactly what you're craving.",
  },
  {
    icon: 'bicycle-outline',
    title: 'Fast Delivery',
    desc: 'Order delivery, takeaway, or book dine-in at any FoodChain branch.',
  },
  {
    icon: 'star-outline',
    title: 'Smart Picks',
    desc: 'Get personalised meal suggestions tailored to your tastes and mood.',
  },
  {
    icon: 'navigate-outline',
    title: 'Live Tracking',
    desc: 'Follow your order in real-time from the kitchen straight to you.',
  },
];

function FoodChainLogo() {
  return (
    <View style={styles.logoBox}>
      <View style={styles.logoDiamond} />
      <View style={styles.logoCircle} />
    </View>
  );
}

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <FoodChainLogo />
        <Text style={styles.brandName}>FoodChain</Text>
        <Text style={styles.heroTagline}>Great food, seamlessly delivered</Text>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="storefront-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroBadgeText}>Multi-Branch</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="star-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroBadgeText}>Top Rated</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="flash-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroBadgeText}>Fast Service</Text>
          </View>
        </View>
      </View>

      {/* ── Features + CTA ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featuresGrid}>
          {FEATURES.map(f => (
            <View key={f.title} style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Ionicons name={f.icon} size={22} color={Colors.amber} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.espresso} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          <Text style={styles.staffNote}>
            Staff, kitchen & managers — sign in with your assigned credentials
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.espresso },

  hero: {
    paddingTop: 64, paddingBottom: 36, paddingHorizontal: 24, alignItems: 'center',
    backgroundColor: Colors.espresso,
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(240,165,0,0.15)',
    borderWidth: 2, borderColor: 'rgba(240,165,0,0.35)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoDiamond: {
    position: 'absolute', width: 32, height: 32, backgroundColor: Colors.amber,
    transform: [{ rotate: '45deg' }], borderRadius: 4,
  },
  logoCircle: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.espresso,
  },
  brandName: { fontSize: 30, fontFamily: Fonts.bold, color: '#fff', letterSpacing: 0.5 },
  heroTagline: {
    fontSize: 14, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)',
    marginTop: 6, textAlign: 'center',
  },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: { fontSize: 12, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.85)' },

  sheet: { flex: 1, backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },

  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  featureCard: {
    width: (width - 44) / 2,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  featureIconBox: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: 'rgba(240,165,0,0.12)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  featureTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 4 },
  featureDesc: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 16 },

  ctaContainer: { gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 16,
    shadowColor: Colors.amber, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  secondaryBtn: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.espresso,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: Fonts.semiBold, color: Colors.espresso },
  staffNote: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },
});
