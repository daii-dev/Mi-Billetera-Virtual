import {
  Pencil,
  Trash2,
} from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconActionButton } from '@/components/ui/IconActionButton';
import { money } from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type AccountCardProps = {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
};

export function AccountCard({
  account,
  onEdit,
  onDelete,
}: AccountCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{account.name}</Text>

        <Text style={styles.accountBalance}>
          {money(account.current_balance)}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <IconActionButton onPress={() => onEdit(account)}>
          <Pencil size={18} color={theme.colors.primary} />
        </IconActionButton>

        <IconActionButton onPress={() => onDelete(account)}>
          <Trash2 size={18} color={colors.expense} />
        </IconActionButton>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    accountCard: {
      minHeight: 74,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    accountInfo: {
      flex: 1,
      paddingRight: 12,
    },
    accountName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    accountBalance: {
      marginTop: 7,
      color: theme.colors.textSecondary,
      fontSize: 15,
      fontWeight: '900',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  });
}