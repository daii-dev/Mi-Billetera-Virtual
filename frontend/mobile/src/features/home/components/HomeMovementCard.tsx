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

type HomeMovementCardProps = {
  movement: Movement;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
};

function isManualMovementType(type: Movement['type']): type is ManualMovementType {
  return type === 'income' || type === 'expense';
}

export function HomeMovementCard({
  movement,
  onEdit,
  onDelete,
}: HomeMovementCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const isIncome = movement.type === 'income';

  const accountName =
    movement.savings_goal_account_names ||
    movement.account?.name ||
    'Cuenta';

  const sign = isIncome ? '+' : '-';

  const isPlannedPaymentMovement = Boolean(movement.planned_payment_id);

  const canEdit =
    movement.source === 'manual' &&
    isManualMovementType(movement.type) &&
    !isPlannedPaymentMovement;

  const canDelete =
    isManualMovementType(movement.type) &&
    (
      movement.source === 'manual' ||
      isPlannedPaymentMovement
    );

  const categoryIcon = movement.category_icon || 'Wallet';
  const categoryColor = movement.category_color || '#D9D9D9';

  return (
    <View style={styles.movementCard}>
      <View style={[styles.movementIcon, { backgroundColor: categoryColor }]}>
        {renderCategoryIcon(categoryIcon, 26, '#FFFFFF')}
      </View>

      <View style={styles.movementInfo}>
        <Text style={styles.movementTitle}>{movement.title}</Text>

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

        <View style={styles.movementDetailRow}>
          <CalendarDays size={14} color={theme.colors.textSecondary} />
          <Text style={styles.movementDate}>
            {movement.movement_date}
          </Text>
        </View>
      </View>

      <View style={styles.movementRightBox}>
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
          {sign}{money(movement.amount)}
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
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    movementIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementInfo: {
      flex: 1,
      marginLeft: 12,
    },
    movementTitle: {
      color: theme.colors.text,
      fontWeight: '900',
      fontSize: 16,
    },
    movementDetailRow: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    movementSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    movementDate: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    movementRightBox: {
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
      fontSize: 13,
      fontWeight: '900',
    },
  });
}