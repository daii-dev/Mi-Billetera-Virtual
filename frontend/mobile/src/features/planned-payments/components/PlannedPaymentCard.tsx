import {
  CalendarClock,
  Pencil,
  Trash2,
  WalletCards,
} from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconActionButton } from '@/components/ui/IconActionButton';
import {
  PlannedPayment,
} from '@/features/planned-payments/planned-payments.types';
import { renderCategoryIcon } from '@/features/wallet/category.utils';
import { money } from '@/features/wallet/wallet.service';
import { Category } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type PlannedPaymentCardProps = {
  payment: PlannedPayment;
  category?: Category;
  onEdit: (payment: PlannedPayment) => void;
  onDelete: (payment: PlannedPayment) => void;
};

export function PlannedPaymentCard({
  payment,
  category,
  onEdit,
  onDelete,
}: PlannedPaymentCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentTitle}>{payment.name}</Text>

        <View style={styles.paymentDetailRow}>
          <WalletCards size={15} color={theme.colors.textSecondary} />

          <Text style={styles.paymentSubtitle}>
            Cuenta: {payment.account?.name ?? 'Cuenta'}
          </Text>
        </View>

        <View style={styles.paymentDetailRow}>
          {category
            ? renderCategoryIcon(category.icon, 15, category.color)
            : <CalendarClock size={15} color={theme.colors.textSecondary} />}

          <Text style={styles.paymentSubtitle}>
            Categoría: {payment.category_name}
          </Text>
        </View>

        <View style={styles.paymentDetailRow}>
          <CalendarClock size={15} color={theme.colors.textSecondary} />

          <Text style={styles.paymentDate}>
            Fecha de pago: {payment.next_payment_date}
          </Text>
        </View>
      </View>

      <View style={styles.paymentRight}>
        <View style={styles.cardActions}>
          <IconActionButton onPress={() => onEdit(payment)}>
            <Pencil size={18} color={theme.colors.primary} />
          </IconActionButton>

          <IconActionButton onPress={() => onDelete(payment)}>
            <Trash2 size={18} color={colors.expense} />
          </IconActionButton>
        </View>

        <Text style={styles.paymentAmount}>
          -{money(payment.amount)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    paymentCard: {
      minHeight: 100,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 12,
      flexDirection: 'row',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    paymentInfo: {
      flex: 1,
    },
    paymentTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 7,
    },
    paymentSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    paymentDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    paymentDate: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    paymentRight: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginLeft: 8,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 4,
    },
    paymentAmount: {
      color: '#28A9D6',
      fontSize: 13,
      fontWeight: '900',
    },
  });
}