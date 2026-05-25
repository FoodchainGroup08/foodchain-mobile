import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import {
  placeOrder, initializePaystackPayment, verifyPaystackPayment,
} from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';
import Toast from 'react-native-toast-message';

type OrderType = 'delivery' | 'dine-in' | 'takeaway';
type PaymentMethod = 'cash' | 'card' | 'transfer';

interface OrderTypeOption {
  key: OrderType;
  label: string;
  sub: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

interface PaymentOption {
  key: PaymentMethod;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const ORDER_TYPES: OrderTypeOption[] = [
  { key: 'delivery', label: 'Delivery', sub: 'Delivered to you', icon: 'bicycle-outline' },
  { key: 'takeaway', label: 'Pickup', sub: 'Collect at branch', icon: 'bag-handle-outline' },
  { key: 'dine-in', label: 'Dine In', sub: 'Eat at restaurant', icon: 'restaurant-outline' },
];

const PAYMENT_OPTIONS: PaymentOption[] = [
  { key: 'card', label: 'Card (Paystack)', icon: 'card-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'transfer', label: 'Bank Transfer', icon: 'swap-horizontal-outline' },
];

const DELIVERY_FEE = 500;

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, branchId, branchName, subtotal, clearCart } = useCartStore();

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.addressLine ?? '');
  const [tableNumber, setTableNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyFailed, setVerifyFailed] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const sub = subtotal();
  const deliveryFee = orderType === 'delivery' ? DELIVERY_FEE : 0;
  const total = sub + deliveryFee;

  const validate = (): boolean => {
    if (!branchId || items.length === 0) return false;
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      Alert.alert('Missing address', 'Please enter a delivery address.');
      return false;
    }
    if (orderType === 'dine-in' && !tableNumber.trim()) {
      Alert.alert('Missing table', 'Please enter your table number.');
      return false;
    }
    return true;
  };

  const runVerify = async (reference: string, orderId: string) => {
    setVerifying(true);
    setVerifyFailed(false);
    try {
      const result = await verifyPaystackPayment(reference);
      if (result.success) {
        clearCart();
        router.replace({
          pathname: '/(customer)/confirmation',
          params: { orderId, paid: '1' },
        });
      } else {
        setVerifyFailed(true);
      }
    } catch {
      setVerifyFailed(true);
    } finally {
      setVerifying(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const order = await placeOrder({
        branchId: branchId!,
        branchName: branchName ?? undefined,
        orderType,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        tableNumber: orderType === 'dine-in' ? tableNumber.trim() : undefined,
        customerName: user?.name,
        customerEmail: user?.email,
        phoneNumber: phone.trim() || undefined,
        paymentMethod: paymentMethod === 'card' ? 'PAYSTACK' : paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          menuItemName: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
      });

      if (paymentMethod === 'card') {
        // Paystack flow
        const payInit = await initializePaystackPayment({
          orderId: order.id,
          email: user?.email ?? '',
          amount: total,
          callbackUrl: 'foodchain://payment-callback',
        });
        setPendingRef(payInit.reference);
        setPendingOrderId(order.id);
        setLoading(false);

        // Open Paystack in an auth session so it auto-closes when the deep link fires
        const result = await WebBrowser.openAuthSessionAsync(
          payInit.authorizationUrl,
          'foodchain://',
        );

        // Extract reference from the redirect URL if Paystack appended it
        let ref = payInit.reference;
        if (result.type === 'success' && result.url) {
          try {
            const params = new URL(result.url).searchParams;
            ref = params.get('reference') || params.get('trxref') || ref;
          } catch {}
        }

        // Verify — works whether the browser closed via deep link or manually
        await runVerify(ref, order.id);
      } else {
        // Cash / transfer — goes straight to kitchen
        clearCart();
        router.replace({
          pathname: '/(customer)/confirmation',
          params: { orderId: order.id },
        });
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert(
        'Order Failed',
        err?.response?.data?.message ?? 'Could not place your order. Please try again.'
      );
    }
  };

  const isSubmitting = loading || verifying;
  const submitLabel = () => {
    if (loading) return 'Placing order…';
    if (verifying) return 'Verifying payment…';
    if (paymentMethod === 'card') return `Pay ₦${total.toLocaleString()} with Paystack`;
    return `Place Order · ₦${total.toLocaleString()}`;
  };

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.espresso} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Order Type */}
        <Text style={styles.sectionLabel}>Order Type</Text>
        <View style={styles.typeRow}>
          {ORDER_TYPES.map(t => {
            const active = orderType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeCard, active && styles.typeCardActive]}
                onPress={() => setOrderType(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={22}
                  color={active ? Colors.amber : Colors.textMuted}
                />
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.label}</Text>
                <Text style={[styles.typeSub, active && styles.typeSubActive]}>{t.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Delivery Address */}
        {orderType === 'delivery' && (
          <>
            <Text style={styles.fieldLabel}>Delivery Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter your delivery address"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={2}
            />
          </>
        )}

        {/* Table Number */}
        {orderType === 'dine-in' && (
          <>
            <Text style={styles.fieldLabel}>Table Number *</Text>
            <TextInput
              style={styles.input}
              value={tableNumber}
              onChangeText={setTableNumber}
              placeholder="e.g. 5"
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
            />
          </>
        )}

        {/* Pickup info */}
        {orderType === 'takeaway' && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.amber} />
            <Text style={styles.infoBannerText}>
              Your order will be ready for collection at <Text style={styles.infoBold}>{branchName}</Text>
            </Text>
          </View>
        )}

        {/* Phone */}
        <Text style={styles.fieldLabel}>Phone Number (optional)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="call-outline" size={16} color={Colors.textLight} />
          <TextInput
            style={styles.inputInner}
            value={phone}
            onChangeText={setPhone}
            placeholder="+234 800 000 0000"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
          />
        </View>

        {/* Notes */}
        <Text style={styles.fieldLabel}>Special Instructions (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Allergies, extra sauce, no onions…"
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={2}
        />

        {/* Payment Method */}
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentList}>
          {PAYMENT_OPTIONS.map(p => {
            const active = paymentMethod === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.paymentRow, active && styles.paymentRowActive]}
                onPress={() => setPaymentMethod(p.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.paymentIconBox, active && styles.paymentIconBoxActive]}>
                  <Ionicons name={p.icon} size={18} color={active ? Colors.espresso : Colors.textMuted} />
                </View>
                <Text style={[styles.paymentLabel, active && styles.paymentLabelActive]}>{p.label}</Text>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {paymentMethod === 'card' && (
          <View style={styles.paystackNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.sageGreen} />
            <Text style={styles.paystackNoteText}>
              You'll be redirected to Paystack to complete payment securely. The app will return automatically when done.
            </Text>
          </View>
        )}

        {/* Order Summary */}
        <Text style={styles.sectionLabel}>Order Summary</Text>
        <View style={styles.summaryCard}>
          {items.map(i => (
            <View key={i.menuItemId} style={styles.summaryRow}>
              <Text style={styles.summaryItemName}>{i.quantity}× {i.name}</Text>
              <Text style={styles.summaryItemPrice}>₦{(i.price * i.quantity).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>₦{sub.toLocaleString()}</Text>
          </View>
          {orderType === 'delivery' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryVal}>₦{DELIVERY_FEE.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>₦{total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Verify failed state */}
        {verifyFailed && (
          <View style={styles.verifyFailCard}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyFailTitle}>Payment not confirmed</Text>
              <Text style={styles.verifyFailSub}>
                We couldn't confirm your payment. If you completed it, tap below to retry verification.
              </Text>
            </View>
          </View>
        )}

        {verifyFailed && pendingRef && pendingOrderId && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => runVerify(pendingRef, pendingOrderId)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={Colors.espresso} />
            <Text style={styles.retryBtnText}>Check Payment Status</Text>
          </TouchableOpacity>
        )}

        {/* Place Order button */}
        <TouchableOpacity
          style={[styles.placeBtn, isSubmitting && styles.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.espresso} size="small" />
              <Text style={styles.placeBtnText}>{submitLabel()}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.placeBtnText}>
                {paymentMethod === 'card' ? 'Pay with Paystack' : 'Place Order'}
              </Text>
              <Text style={styles.placeBtnTotal}>₦{total.toLocaleString()}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Verifying overlay */}
      <Modal visible={verifying} transparent animationType="fade">
        <View style={styles.verifyOverlay}>
          <View style={styles.verifyCard}>
            <ActivityIndicator size="large" color={Colors.amber} />
            <Text style={styles.verifyTitle}>Verifying payment…</Text>
            <Text style={styles.verifySub}>Please wait while we confirm your payment with Paystack.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.espresso },

  container: { padding: 16, gap: 6, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10,
  },

  // Order type
  typeRow: { flexDirection: 'row', gap: 8 },
  typeCard: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  typeCardActive: { borderColor: Colors.amber, backgroundColor: 'rgba(240,165,0,0.06)' },
  typeLabel: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.textMuted },
  typeLabelActive: { color: Colors.espresso },
  typeSub: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.textLight, textAlign: 'center' },
  typeSubActive: { color: Colors.textMuted },

  // Fields
  fieldLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.text, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: Fonts.regular, color: Colors.text,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14,
  },
  inputInner: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(240,165,0,0.08)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(240,165,0,0.2)',
    padding: 12, marginTop: 8,
  },
  infoBannerText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.espresso, flex: 1, lineHeight: 18 },
  infoBold: { fontFamily: Fonts.semiBold },

  // Payment
  paymentList: { gap: 8 },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 14,
  },
  paymentRowActive: { borderColor: Colors.amber, backgroundColor: 'rgba(240,165,0,0.05)' },
  paymentIconBox: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: Colors.muted, justifyContent: 'center', alignItems: 'center',
  },
  paymentIconBoxActive: { backgroundColor: 'rgba(240,165,0,0.15)' },
  paymentLabel: { flex: 1, fontSize: 14, fontFamily: Fonts.medium, color: Colors.textMuted },
  paymentLabelActive: { color: Colors.espresso, fontFamily: Fonts.semiBold },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: Colors.amber },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.amber },

  paystackNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(76,175,125,0.25)',
    padding: 12, marginTop: 4,
  },
  paystackNoteText: {
    flex: 1, fontSize: 12, fontFamily: Fonts.regular, color: Colors.text, lineHeight: 17,
  },

  // Summary
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItemName: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text, flex: 1 },
  summaryItemPrice: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 2 },
  summaryLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  summaryVal: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text },
  totalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  totalVal: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.amber },

  // Verify failed
  verifyFailCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(212,24,61,0.06)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(212,24,61,0.2)',
    padding: 12, marginTop: 12,
  },
  verifyFailTitle: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.error },
  verifyFailSub: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.text, lineHeight: 17, marginTop: 2 },

  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.espresso, borderRadius: Radius.md,
    paddingVertical: 12, marginTop: 8,
  },
  retryBtnText: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },

  // Place button
  placeBtn: {
    backgroundColor: Colors.amber, borderRadius: Radius.lg,
    paddingVertical: 17, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20,
    shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  placeBtnDisabled: { opacity: 0.7, shadowOpacity: 0 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  placeBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  placeBtnTotal: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },

  // Verify overlay
  verifyOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  verifyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl ?? 20,
    padding: 32, alignItems: 'center', gap: 14, width: '100%',
  },
  verifyTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.espresso },
  verifySub: {
    fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
});
