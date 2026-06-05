import { CalendarClock } from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

export function PlannedPaymentEmptyState() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconBox}>
        <CalendarClock size={42} color="#FFFFFF" />
      </View>

      <Text style={styles.emptyTitle}>
        Aun no tienes pagos planificados
      </Text>

      <Text style={styles.emptyDescription}>
        Programa tu gasto con nombre, monto y fecha de pago.
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    emptyCard: {
      marginTop: 24,
      minHeight: 185,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 26,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    emptyIconBox: {
      width: 58,
      height: 58,
      borderRadius: 30,
      backgroundColor: '#28A9D6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 18,
    },
    emptyDescription: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}