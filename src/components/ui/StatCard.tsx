import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/colors';

interface Props {
  title: string;
  value: string;
  change?: number;
  icon: string;
  accentColor?: string;
}

export function StatCard({ title, value, change, icon, accentColor = Colors.amber }: Props) {
  const hasChange = change !== undefined && change !== null;
  const positive = (change ?? 0) >= 0;
  return (
    <View style={[styles.card, { borderTopColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: `${accentColor}18` }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        {hasChange && (
          <View style={[styles.badge, { backgroundColor: positive ? '#F0FDF4' : '#FEF2F2' }]}>
            <Text style={[styles.badgeText, { color: positive ? Colors.sageGreen : Colors.error }]}>
              {positive ? '+' : ''}{change!.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 3,
    flex: 1, minWidth: 140, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 20 },
  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: Fonts.semiBold },
  value: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.espresso },
  title: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.textMuted },
});
