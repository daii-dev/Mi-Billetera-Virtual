import {
  CalendarDays,
  Pencil,
  Tags,
  Trash2,
  WalletCards,
} from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconActionButton } from '@/components/ui/IconActionButton';
import { renderCategoryIcon } from '@/features/wallet/category.utils';
import { money } from '@/features/wallet/wallet.service';
import {
  ManualMovementType,
  Movement,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type MovementCardProps = {
  movement: Movement;
  type: ManualMovementType;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
};

export function MovementCard({
  movement,
  type,
  onEdit,
  onDelete,
}: MovementCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const isIncome = type === 'income';
  const amountSign = isIncome ? '+' : '-';

  const accountName =
    movement.savings_goal_account_names ||
    movement.account?.name ||
    'Cuenta';

  const isPlannedPaymentMovement = Boolean(movement.planned_payment_id);

  const canEdit =
    movement.source === 'manual' &&
    !isPlannedPaymentMovement;

  const canDelete =
    movement.source === 'manual' ||
    isPlannedPaymentMovement;

  const categoryIcon = movement.category_icon || 'Wallet';
  const categoryColor = movement.category_color || '#D9D9D9';

  return (
    <View style={styles.movementCard}>
      <View style={[styles.movementIcon, { backgroundColor: categoryColor }]}>
        {renderCategoryIcon(categoryIcon, 25, '#FFFFFF')}
      </View>

      <View style={styles.movementInfo}>
        <Text style={styles.movementTitle}>
          {movement.title}
        </Text>

        <View style={styles.movementDetailRow}>
          <WalletCards size={14} color={theme.colors.textSecondary} />
          <Text style={styles.movementSubtitle}>
            {accountName}
          </Text>
        </View>

        {movement.category_name && (
          <View style={styles.movementDetailRow}>
            <Tags size={14} color={theme.colors.textSecondary} />
            <Text style={styles.movementSubtitle}>
              {movement.category_name}
            </Text>
          </View>
        )}

        {movement.source === 'savings_goal' && movement.description && (
          <Text style={styles.movementSubtitle}>
            {movement.description}
          </Text>
        )}

        <View style={styles.movementDetailRow}>
          <CalendarDays size={14} color={theme.colors.textSecondary} />
          <Text style={styles.movementDate}>
            {movement.movement_date}
          </Text>
        </View>
      </View>

      <View style={styles.amountBox}>
        {(canEdit || canDelete) && (
          <View style={styles.cardActions}>
            {canEdit && (
              <IconActionButton onPress={() => onEdit(movement)}>
                <Pencil size={18} color={theme.colors.primary} />
              </IconActionButton>
            )}

            {canDelete && (
              <IconActionButton onPress={() => onDelete(movement)}>
                <Trash2 size={18} color={colors.expense} />
              </IconActionButton>
            )}
          </View>
        )}

        <Text
          style={[
            styles.movementAmount,
            {
              color: isIncome ? colors.secondary : colors.expense,
            },
          ]}
        >
          {amountSign}{money(movement.amount)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    movementCard: {
      minHeight: 88,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    movementIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementInfo: {
      flex: 1,
      marginLeft: 14,
    },
    movementTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    movementSubtitle: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    movementDetailRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    movementDate: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    amountBox: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      minHeight: 64,
      marginLeft: 8,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 4,
    },
    movementAmount: {
      fontSize: 12,
      fontWeight: '900',
    },
  });
}