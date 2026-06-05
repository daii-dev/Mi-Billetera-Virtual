import { ShieldCheck } from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

type SuccessFeedbackContentProps = {
  message: string;
  color?: string;
};

export function SuccessFeedbackContent({
  message,
  color = colors.secondary,
}: SuccessFeedbackContentProps) {
  return (
    <View style={styles.container}>
      <ShieldCheck size={26} color={color} strokeWidth={2.8} />

      <Text style={[styles.message, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
});
