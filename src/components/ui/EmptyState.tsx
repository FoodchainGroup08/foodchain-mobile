import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/colors';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={styles.btn} onPress={action.onPress} activeOpacity={0.85}>
          <Text style={styles.btnText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.espresso, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btn: { backgroundColor: Colors.amber, borderRadius: Radius.md, paddingVertical: 13, paddingHorizontal: 28 },
  btnText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.espresso },
});
