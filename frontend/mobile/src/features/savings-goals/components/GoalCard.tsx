import {
  Calendar,
  Gift,
  GraduationCap,
  Home,
  Pencil,
  PiggyBank,
  Plane,
  Target,
  Trash2,
} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  calculateDaysRemaining,
  calculateRemainingAmount,
  calculateProgress,
} from '@/features/savings-goals/savings-goals.service';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import { money } from '@/features/wallet/wallet.service';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type GoalCardProps = {
  goal: SavingsGoal;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  onContribute: (goal: SavingsGoal) => void;
};

const iconMap = {
  'piggy-bank': PiggyBank,
  plane: Plane,
  home: Home,
  gift: Gift,
  education: GraduationCap,
  target: Target,
};

export function GoalCard({ goal, onEdit, onDelete, onContribute }: GoalCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const daysRemaining = calculateDaysRemaining(goal.fecha_limite);
  const isCompleted = goal.estado === 'completada';
  const isSpent = goal.estado === 'gastada';
  const isExpired = goal.estado === 'vencida' || (!isCompleted && daysRemaining < 0);
  const canContribute = !isCompleted && !isExpired && !isSpent;
  const accentColor = isExpired ? colors.gray : goal.color || colors.secondary;
  const Icon = iconMap[goal.icono as keyof typeof iconMap] || PiggyBank;
  const progress = calculateProgress(goal.monto_actual, goal.monto_objetivo);
  const remainingAmount = calculateRemainingAmount(goal);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: accentColor }]}>
          <Icon size={24} color="#FFFFFF" />
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.name} numberOfLines={2}>
            {goal.nombre}
          </Text>
          <View style={styles.dateRow}>
            <Calendar size={14} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>
              {formatDate(goal.fecha_limite)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => onEdit(goal)}
            hitSlop={10}
            style={styles.iconButton}
          >
            <Pencil size={18} color={theme.colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => onDelete(goal)}
            hitSlop={10}
            style={styles.iconButton}
          >
            <Trash2 size={18} color={colors.expense} />
          </Pressable>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Ahorrado</Text>
          <Text style={styles.currentAmount}>{money(goal.monto_actual)}</Text>
        </View>
        <View style={styles.targetBox}>
          <Text style={styles.amountLabel}>Objetivo</Text>
          <Text style={styles.targetAmount}>{money(goal.monto_objetivo)}</Text>
        </View>
      </View>

      <View style={styles.remainingBox}>
        <Text style={styles.amountLabel}>Faltante</Text>
        <Text style={styles.remainingAmount}>{money(remainingAmount)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressText}>{progress}% completado</Text>
        <Text style={styles.daysText}>
          {isCompleted
            ? 'Meta alcanzada'
            : isSpent
            ? 'Meta gastada'
            : daysRemaining > 0
            ? `${daysRemaining} dias restantes`
            : 'Fecha limite vencida'}
        </Text>
      </View>

      <View style={[
        styles.statusBadge,
        isCompleted && styles.statusCompleted,
        isExpired && styles.statusExpired,
      ]}>
        <Text style={styles.statusText}>
          {isCompleted ? 'Completada' : isSpent ? 'Gastada' : isExpired ? 'Vencida' : 'Activa'}
        </Text>
      </View>

      <Pressable
        disabled={!canContribute}
        onPress={() => onContribute(goal)}
        style={[
          styles.hu16Button,
          !canContribute && styles.hu16ButtonDisabled,
        ]}
      >
        <Text style={[
          styles.hu16Text,
          canContribute && styles.hu16TextActive,
        ]}>
          {canContribute ? 'Anadir cantidad ahorrada' : 'No disponible para esta meta'}
        </Text>
      </Pressable>
    </View>
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBox: {
      flex: 1,
      marginLeft: 12,
    },
    name: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
    },
    dateText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
      marginLeft: 8,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
    },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 12,
    },
    targetBox: {
      alignItems: 'flex-end',
      flex: 1,
    },
    amountLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    currentAmount: {
      marginTop: 4,
      color: colors.secondary,
      fontSize: 16,
      fontWeight: '900',
    },
    targetAmount: {
      marginTop: 4,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'right',
    },
    remainingBox: {
      marginTop: 12,
      borderRadius: 10,
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    remainingAmount: {
      color: colors.expense,
      fontSize: 15,
      fontWeight: '900',
    },
    progressTrack: {
      height: 9,
      borderRadius: 8,
      backgroundColor: theme.mode === 'dark' ? '#334155' : '#E5E7EB',
      overflow: 'hidden',
      marginTop: 14,
    },
    progressFill: {
      height: '100%',
      borderRadius: 8,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 10,
    },
    progressText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    daysText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'right',
      flex: 1,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      marginTop: 12,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.colors.primary,
    },
    statusCompleted: {
      backgroundColor: colors.secondary,
    },
    statusExpired: {
      backgroundColor: colors.gray,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    hu16Button: {
      height: 38,
      borderRadius: 19,
      marginTop: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.secondary,
    },
    hu16ButtonDisabled: {
      backgroundColor: theme.mode === 'dark' ? '#1E293B' : '#F1F5F9',
      borderColor: theme.colors.border,
      opacity: 0.75,
    },
    hu16Text: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    hu16TextActive: {
      color: '#FFFFFF',
    },
  });
}
