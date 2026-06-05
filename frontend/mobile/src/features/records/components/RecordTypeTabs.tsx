import {
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ManualMovementType } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type RecordTypeTabsProps = {
  selectedType: ManualMovementType;
  onSelectType: (type: ManualMovementType) => void;
};

export function RecordTypeTabs({
  selectedType,
  onSelectType,
}: RecordTypeTabsProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const isIncomeSelected = selectedType === 'income';
  const isExpenseSelected = selectedType === 'expense';

  return (
    <View style={styles.tabsRow}>
      <Pressable
        style={[
          styles.tabButton,
          isIncomeSelected && styles.incomeTabActive,
        ]}
        onPress={() => onSelectType('income')}
      >
        <TrendingUp
          size={22}
          color={isIncomeSelected ? '#FFFFFF' : theme.colors.textSecondary}
        />

        <Text
          style={[
            styles.tabText,
            isIncomeSelected && styles.activeTabText,
          ]}
        >
          Ingresos
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tabButton,
          isExpenseSelected && styles.expenseTabActive,
        ]}
        onPress={() => onSelectType('expense')}
      >
        <TrendingDown
          size={22}
          color={isExpenseSelected ? '#FFFFFF' : theme.colors.textSecondary}
        />

        <Text
          style={[
            styles.tabText,
            isExpenseSelected && styles.activeTabText,
          ]}
        >
          Gastos
        </Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tabsRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 8,
      marginBottom: 22,
    },
    tabButton: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    incomeTabActive: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    expenseTabActive: {
      backgroundColor: colors.expense,
      borderColor: colors.expense,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '900',
    },
    activeTabText: {
      color: '#FFFFFF',
    },
  });
}