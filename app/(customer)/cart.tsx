import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/stores/cartStore';
import { Colors, Fonts, Radius } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';

const DELIVERY_FEE = 500;

export default function CartScreen() {
  const router = useRouter();
  const { items, branchName, updateQuantity, removeItem, subtotal, clearCart } = useCartStore();
  const sub = subtotal();

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <EmptyState icon="🛒" title="Your cart is empty" subtitle="Browse the menu and add some items." action={{ label: 'Browse Menu', onPress: () => router.push('/(customer)/branches') }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity onPress={clearCart}><Text style={styles.clearText}>Clear</Text></TouchableOpacity>
      </View>

      {branchName && (
        <View style={styles.branchBanner}><Text style={styles.branchBannerText}>📍 {branchName}</Text></View>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.menuItemId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₦{item.price.toLocaleString()}</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)}>
                <Text style={styles.qtyBtnText}>{item.quantity === 1 ? '🗑' : '−'}</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{item.quantity}</Text>
              <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd]} onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)}>
                <Text style={[styles.qtyBtnText, { color: Colors.espresso }]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lineTotal}>₦{(item.price * item.quantity).toLocaleString()}</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.summary}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryVal}>₦{sub.toLocaleString()}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery fee</Text><Text style={styles.summaryVal}>₦{DELIVERY_FEE.toLocaleString()}</Text></View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Estimated Total</Text>
              <Text style={styles.totalVal}>₦{(sub + DELIVERY_FEE).toLocaleString()}</Text>
            </View>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/(customer)/checkout')}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Text style={styles.checkoutBtnSub}>₦{(sub + DELIVERY_FEE).toLocaleString()}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.espresso },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.85)' },
  headerTitle: { fontSize: 17, fontFamily: Fonts.bold, color: '#fff' },
  clearText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.amber },
  branchBanner: { backgroundColor: Colors.amberLight, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(240,165,0,0.2)' },
  branchBannerText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.espresso },
  list: { padding: 16, gap: 10 },
  itemRow: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
  itemPrice: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  qtyBtnAdd: { backgroundColor: Colors.amber, borderColor: Colors.amber },
  qtyBtnText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso },
  qtyNum: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, minWidth: 22, textAlign: 'center' },
  lineTotal: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, minWidth: 80, textAlign: 'right' },
  summary: { backgroundColor: Colors.surface, margin: 16, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted },
  summaryVal: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text },
  totalRow: { paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.espresso },
  totalVal: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.amber },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  checkoutBtn: { backgroundColor: Colors.amber, borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: Colors.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  checkoutBtnText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.espresso },
  checkoutBtnSub: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.espresso },
});
