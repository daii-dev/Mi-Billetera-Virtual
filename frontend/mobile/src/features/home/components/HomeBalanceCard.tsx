import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { money } from '@/features/wallet/wallet.service';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type HomeBalanceCardProps = {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
};

export function HomeBalanceCard({
  currentBalance,
  totalIncome,
  totalExpense,
}: HomeBalanceCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Saldo Total</Text>
      <Text style={styles.balanceAmount}>{money(currentBalance)}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ingresos:</Text>
          <Text style={styles.incomeText}>{money(totalIncome)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Gastos:</Text>
          <Text style={styles.expenseText}>{money(totalExpense)}</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    balanceCard: {
      backgroundColor: theme.mode === 'dark' ? '#172554' : '#082B8C',
      borderRadius: 16,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 5,
      elevation: 6,
    },
    balanceLabel: {
      color: '#AFC2FF',
      fontSize: 14,
      fontWeight: '800',
    },
    balanceAmount: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '900',
      marginTop: 6,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.summaryCard,
      borderRadius: 8,
      padding: 12,
    },
    summaryLabel: {
      color: '#C7C7C7',
      fontSize: 11,
      fontWeight: '800',
    },
    incomeText: {
      marginTop: 8,
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '900',
    },
    expenseText: {
      marginTop: 8,
      color: colors.expense,
      fontSize: 12,
      fontWeight: '900',
    },
  });
}