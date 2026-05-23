import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { placeOrder } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';

type OrderType = 'delivery'|'dine-in'|'takeaway';
type PaymentMethod = 'cash'|'card'|'transfer';

const ORDER_TYPES: { key: OrderType; label: string; icon: string }[] = [
  { key: 'delivery', label: 'Delivery', icon: '🛵' },
  { key: 'dine-in', label: 'Dine In', icon: '🪑' },
  { key: 'takeaway', label: 'Takeaway', icon: '🥡' },
];

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'card', label: 'Card', icon: '💳' },
  { key: 'transfer', label: 'Transfer', icon: '🏦' },
];

const DELIVERY_FEE = 500;

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, branchId, branchName, subtotal, clearCart } = useCartStore();

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.addressLine ?? '');
  const [tableNumber, setTableNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const sub = subtotal();
  const total = sub + (orderType === 'delivery' ? DELIVERY_FEE : 0);

  const handlePlaceOrder = async () => {
    if (!branchId || items.length === 0) return;
    if (orderType === 'delivery' && !deliveryAddress.trim()) { Alert.alert('Missing address', 'Please enter a delivery address.'); return; }
    if (orderType === 'dine-in' && !tableNumber.trim()) { Alert.alert('Missing table', 'Please enter your table number.'); return; }
    setLoading(true);
    try {
      const order = await placeOrder({
        branchId,
        branchName: branchName ?? undefined,
        orderType,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        tableNumber: orderType === 'dine-in' ? tableNumber.trim() : undefined,
        customerName: user?.name,
        customerEmail: user?.email,
        phoneNumber: phone.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map(i => ({ menuItemId: i.menuItemId, menuItemName: i.name, quantity: i.quantity, unitPrice: i.price })),
      });
      clearCart();
      router.replace({ pathname: '/(customer)/confirmation', params: { orderId: order.id } });
    } catch (err: any) {
      Alert.alert('Order Failed', err?.response?.data?.message ?? 'Could not place your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Order type */}
        <Text style={styles.sectionTitle}>Order Type</Text>
        <View style={styles.segmentRow}>
          {ORDER_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.segment, orderType === t.key && styles.segmentActive]}
              onPress={() => setOrderType(t.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.segmentIcon}>{t.icon}</Text>
              <Text style={[styles.segmentText, orderType === t.key && styles.segmentTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Conditional fields */}
        {orderType === 'delivery' && (
          <>
            <Text style={styles.label}>Delivery Address *</Text>
            <TextInput style={[styles.input, styles.textArea]} value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Enter your delivery address" placeholderTextColor={Colors.textLight} multiline numberOfLines={2} />
          </>
        )}
        {orderType === 'dine-in' && (
          <>
            <Text style={styles.label}>Table Number *</Text>
            <TextInput style={styles.input} value={tableNumber} onChangeText={setTableNumber} placeholder="e.g. 5" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
          </>
        )}

        <Text style={styles.label}>Phone Number (optional)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" />

        <Text style={styles.label}>Special Instructions (optional)</Text>
        <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Allergies, extra sauce, etc." placeholderTextColor={Colors.textLight} multiline numberOfLines={2} />

        {/* Payment */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.paymentChip, paymentMethod === p.key && styles.paymentChipActive]}
              onPress={() => setPaymentMethod(p.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.paymentIcon}>{p.icon}</Text>
              <Text style={[styles.paymentLabel, paymentMethod === p.key && styles.paymentLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {items.map(i => (
            <View key={i.menuItemId} style={styles.summaryRow}>
              <Text style={styles.summaryItemName}>{i.quantity}× {i.name}</Text>
              <Text style={styles.summaryItemPrice}>₦{(i.price * i.quantity).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryVal}>₦{sub.toLocaleString()}</Text></View>
          {orderType === 'delivery' && (
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery fee</Text><Text style={styles.summaryVal}>₦{DELIVERY_FEE.toLocaleString()}</Text></View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>₦{total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.placeBtn} onPress={handlePlaceOrder} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={Colors.espresso} /> : (
            <>
              <Text style={styles.placeBtnText}>Place Order</Text>
              <Text style={styles.placeBtnSub}>₦{total.toLocaleString()}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.espresso },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.85)' },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, color: '#fff' },
  container: { padding: 16, gap: 6, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segment: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md },
  segmentActive: { borderColor: Colors.espresso, backgroundColor: Colors.espresso },
  segmentIcon: { fontSize: 20 },
  segmentText: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  segmentTextActive: { color: '#fff' },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  paymentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  paymentChip: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md },
  paymentChipActive: { borderColor: Colors.amber, backgroundColor: Colors.amberLight },
  paymentIcon: { fontSize: 22 },
  paymentLabel: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textMuted },
  paymentLabelActive: { color: Colors.espresso, fontFamily: Fonts.semiBold },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, marginTop: 16, gap: 8 },
  summaryTitle: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItemName: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text, flex: 1 },
  summaryItemPrice: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  summaryLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  summaryVal: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text },
  totalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  totalVal: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.amber },
  placeBtn: { backgroundColor: Colors.amber, borderRadius: Radius.lg, paddingVertical: 17, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  placeBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  placeBtnSub: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
});
