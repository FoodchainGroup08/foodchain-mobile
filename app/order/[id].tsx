import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getOrderById, cancelOrder, type Order } from '@/services/api';
import { Colors, Fonts, Radius } from '@/constants/colors';

const STATUS_STEPS: Array<Order['status']> = ['RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP'];

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Order Received',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  PICKED_UP: 'Picked Up',
  SERVED: 'Served',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_EMOJI: Record<string, string> = {
  RECEIVED: '📥', CONFIRMED: '✅', PREPARING: '👨‍🍳',
  READY: '🍱', PICKED_UP: '🛵', SERVED: '🍽️',
  COMPLETED: '🎉', CANCELLED: '❌',
};

function statusColor(status: string): string {
  switch (status) {
    case 'RECEIVED':              return Colors.statusReceived;
    case 'CONFIRMED':
    case 'PREPARING':             return Colors.statusPreparing;
    case 'READY':
    case 'PICKED_UP':
    case 'SERVED':                return Colors.statusReady;
    case 'COMPLETED':             return Colors.statusCompleted;
    case 'CANCELLED':             return Colors.statusCancelled;
    default:                      return Colors.textMuted;
  }
}

export default function OrderTrackerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try { setOrder(await getOrderById(id)); } catch {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'Keep Order', style: 'cancel' },
      {
        text: 'Cancel Order', style: 'destructive',
        onPress: async () => {
          try { await cancelOrder(id!, undefined, 'Customer cancelled'); fetchOrder(); }
          catch { Alert.alert('Error', 'Could not cancel the order. Please try again.'); }
        },
      },
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.amber} /></View>;
  if (!order) return <View style={styles.centered}><Text style={styles.errorText}>Order not found.</Text></View>;

  const currentIdx = STATUS_STEPS.indexOf(order.status as any);
  const isFinal = ['COMPLETED', 'CANCELLED', 'SERVED'].includes(order.status);
  const canCancel = order.status === 'RECEIVED';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>

      {/* Status hero */}
      <View style={[styles.heroCard, { borderTopColor: statusColor(order.status) }]}>
        <Text style={styles.heroEmoji}>{STATUS_EMOJI[order.status] ?? '📦'}</Text>
        <Text style={[styles.heroStatus, { color: statusColor(order.status) }]}>
          {STATUS_LABEL[order.status] ?? order.status}
        </Text>
        <Text style={styles.heroOrderId}>Order #{order.id.slice(-8).toUpperCase()}</Text>
        {order.estimatedTime && !isFinal && (
          <View style={styles.etaBadge}>
            <Text style={styles.etaText}>⏱ {order.estimatedTime}</Text>
          </View>
        )}
      </View>

      {/* Progress stepper */}
      {!isFinal && (
        <View style={styles.stepsCard}>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <View key={step}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepDot, done && styles.stepDotDone]}>
                    {done && <Text style={styles.stepCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone, active && styles.stepLabelActive]}>
                    {STATUS_LABEL[step]}
                  </Text>
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.stepConnector, i < currentIdx && styles.stepConnectorDone]} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Order info */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Order Details</Text>
        {[
          { label: 'Branch', value: order.branchName },
          { label: 'Type', value: order.orderType?.replace('-', ' '), capitalize: true },
          order.deliveryAddress ? { label: 'Address', value: order.deliveryAddress } : null,
          order.tableNumber ? { label: 'Table', value: String(order.tableNumber) } : null,
          order.paymentMethod ? { label: 'Payment', value: order.paymentMethod } : null,
        ].filter(Boolean).map((r, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{r!.label}</Text>
            <Text style={[styles.infoValue, r!.capitalize && { textTransform: 'capitalize' }]}>{r!.value}</Text>
          </View>
        ))}
      </View>

      {/* Items */}
      <View style={styles.itemsCard}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items.map((item, i) => (
          <View key={`${item.id}-${i}`} style={styles.itemRow}>
            <Text style={styles.itemQty}>{item.quantity}×</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>₦{(item.price * item.quantity).toLocaleString()}</Text>
          </View>
        ))}
        <View style={styles.itemsDivider} />
        <View style={styles.itemRow}>
          <Text style={[styles.itemName, { fontFamily: Fonts.bold, color: Colors.espresso }]}>Total</Text>
          <Text style={[styles.itemPrice, { color: Colors.amber, fontFamily: Fonts.bold, fontSize: 16 }]}>
            ₦{order.total.toLocaleString()}
          </Text>
        </View>
      </View>

      {canCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={fetchOrder}>
        <Text style={styles.refreshButtonText}>↻ Refresh Status</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textMuted, fontSize: 16, fontFamily: Fonts.medium },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroStatus: { fontSize: 22, fontFamily: Fonts.bold, marginBottom: 4 },
  heroOrderId: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  etaBadge: { backgroundColor: Colors.amberLight, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12 },
  etaText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.espresso },

  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.muted,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotDone: { backgroundColor: Colors.sageGreen },
  stepCheck: { color: '#fff', fontSize: 13, fontFamily: Fonts.bold },
  stepConnector: { width: 2, height: 20, backgroundColor: Colors.muted, marginLeft: 13 },
  stepConnectorDone: { backgroundColor: Colors.sageGreen },
  stepLabel: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textLight },
  stepLabelDone: { color: Colors.text, fontFamily: Fonts.medium },
  stepLabelActive: { color: Colors.espresso, fontFamily: Fonts.bold },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted },
  infoValue: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 16 },

  itemsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.textMuted, width: 28 },
  itemName: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.text, flex: 1 },
  itemPrice: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.text },
  itemsDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  cancelButton: {
    borderWidth: 1.5, borderColor: Colors.error,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  cancelButtonText: { color: Colors.error, fontSize: 14, fontFamily: Fonts.semiBold },
  refreshButton: {
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  refreshButtonText: { color: Colors.textMuted, fontSize: 14, fontFamily: Fonts.medium },
});
