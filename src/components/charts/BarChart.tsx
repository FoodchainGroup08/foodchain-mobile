import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/colors';

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
  formatLabel?: (l: string) => string;
}

export function BarChart({ data, color = Colors.amber, height = 160, formatValue, formatLabel }: Props) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {data.map((d, i) => {
        const pct = d.value / max;
        const barH = Math.max(pct * height, 4);
        return (
          <View key={i} style={[styles.col, { height: height + 48 }]}>
            <Text style={styles.valueLabel} numberOfLines={1}>
              {formatValue ? formatValue(d.value) : d.value}
            </Text>
            <View style={[styles.barWrap, { height }]}>
              <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
            </View>
            <Text style={styles.xLabel} numberOfLines={1}>
              {formatLabel ? formatLabel(d.label) : d.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 4 },
  col: { width: 44, alignItems: 'center', justifyContent: 'flex-end' },
  valueLabel: { fontSize: 9, fontFamily: Fonts.medium, color: Colors.textMuted, marginBottom: 4, maxWidth: 44, textAlign: 'center' },
  barWrap: { justifyContent: 'flex-end', width: 28 },
  bar: { width: 28, borderRadius: 4 },
  xLabel: { fontSize: 9, fontFamily: Fonts.regular, color: Colors.textLight, marginTop: 6, maxWidth: 44, textAlign: 'center' },
});
