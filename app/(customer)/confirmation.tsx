import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmationScreen() {
  const router = useRouter();
  const { orderId, paid } = useLocalSearchParams<{ orderId?: string; paid?: string }>();
  const wasPaidByCard = paid === '1';
  const shortId = orderId?.slice(-8).toUpperCase() ?? '';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Animated success icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconRing}>
            <Ionicons
              name={wasPaidByCard ? 'checkmark-circle' : 'receipt'}
              size={52}
              color={Colors.amber}
            />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>
            {wasPaidByCard ? 'Payment Confirmed!' : 'Order Placed!'}
          </Text>
          <Text style={styles.subtitle}>
            {wasPaidByCard
              ? 'Your payment was successful and the kitchen is now preparing your order.'
              : 'Your order has been received and the kitchen is getting it ready.'}
          </Text>

          {orderId && (
            <View style={styles.orderIdBox}>
              <Text style={styles.orderIdLabel}>Order Reference</Text>
              <Text style={styles.orderId}>#{shortId}</Text>
              {wasPaidByCard && (
                <View style={styles.paidBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.sageGreen} />
                  <Text style={styles.paidBadgeText}>Paid via Paystack</Text>
                </View>
              )}
            </View>
          )}

          {/* Steps */}
          <View style={styles.steps}>
            {[
              { icon: 'checkmark-circle-outline' as const, label: 'Order Received', done: true },
              { icon: 'flame-outline' as const, label: 'Kitchen Preparing', done: false },
              { icon: 'bicycle-outline' as const, label: 'On the Way', done: false },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                  <Ionicons
                    name={step.icon}
                    size={20}
                    color={step.done ? Colors.amber : Colors.textLight}
                  />
                </View>
                {i < 2 && <View style={styles.stepLine} />}
                <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Footer actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => router.push({ pathname: '/(customer)/order/[id]', params: { id: orderId! } })}
          disabled={!orderId}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-outline" size={18} color={Colors.espresso} />
          <Text style={styles.trackBtnText}>Track My Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(customer)/branches')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeBtnText}>Back to Branches</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  iconWrap: { marginBottom: 28 },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FEF3C7',
    borderWidth: 3, borderColor: Colors.amber,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.amber, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  title: {
    fontSize: 26, fontFamily: Fonts.bold, color: Colors.espresso,
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 8,
  },
  orderIdBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    marginBottom: 28, minWidth: 200,
  },
  orderIdLabel: {
    fontSize: 10, fontFamily: Fonts.regular, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  orderId: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso, marginTop: 4 },
  paidBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
  },
  paidBadgeText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.sageGreen },

  steps: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.muted,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  stepDotDone: {
    backgroundColor: Colors.amberLight, borderWidth: 2, borderColor: Colors.amber,
  },
  stepLine: {
    position: 'absolute', top: 21, left: '50%', right: '-50%',
    height: 2, backgroundColor: Colors.border,
  },
  stepLabel: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },
  stepLabelDone: { fontFamily: Fonts.semiBold, color: Colors.espresso },

  footer: {
    padding: 20, gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.amber, borderRadius: Radius.lg, paddingVertical: 16,
    shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  trackBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  homeBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  homeBtnText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.textMuted },
});
