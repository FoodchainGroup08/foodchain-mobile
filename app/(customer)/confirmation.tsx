import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, Radius } from '@/constants/colors';

export default function ConfirmationScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const shortId = orderId?.slice(-8).toUpperCase() ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>✅</Text>
      </View>
      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>Your order has been received and is being processed.</Text>
      {orderId && (
        <View style={styles.orderIdBox}>
          <Text style={styles.orderIdLabel}>Order Reference</Text>
          <Text style={styles.orderId}>#{shortId}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.trackBtn}
        onPress={() => router.push({ pathname: '/(customer)/order/[id]', params: { id: orderId! } })}
        disabled={!orderId}
        activeOpacity={0.85}
      >
        <Text style={styles.trackBtnText}>Track Order</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(customer)/branches')}>
        <Text style={styles.homeBtnText}>Back to Branches</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.background },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 52 },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  orderIdBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', marginBottom: 28, minWidth: 200 },
  orderIdLabel: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  orderId: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso, marginTop: 4 },
  trackBtn: { backgroundColor: Colors.amber, borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: 48, shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6, marginBottom: 12, width: '100%', alignItems: 'center' },
  trackBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  homeBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 48, width: '100%', alignItems: 'center' },
  homeBtnText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.textMuted },
});
