import {
  Pressable,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { money } from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { GoalDeletionRefundSummary } from '@/features/savings-goals/savings-goals.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type GoalDeleteRefundModalProps = {
  visible: boolean;
  refundSummary: GoalDeletionRefundSummary | null;
  accounts: Account[];
  selectedAccountId: string;
  accountOptionsVisible: boolean;
  loading: boolean;
  onSelectAccount: (accountId: string) => void;
  onToggleAccountOptions: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function GoalDeleteRefundModal({
  visible,
  refundSummary,
  accounts,
  selectedAccountId,
  accountOptionsVisible,
  loading,
  onSelectAccount,
  onToggleAccountOptions,
  onCancel,
  onConfirm,
}: GoalDeleteRefundModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Eliminar meta</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Hay abonos realizados desde cuentas eliminadas. Selecciona una cuenta activa para recibir ese reembolso.
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total a reembolsar</Text>
                <Text style={styles.summaryValue}>
                  {money(refundSummary?.totalAmount ?? 0)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>A cuentas visibles</Text>
                <Text style={styles.summaryValue}>
                  {money(refundSummary?.visibleRefundAmount ?? 0)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Necesita cuenta alternativa</Text>
                <Text style={styles.summaryValue}>
                  {money(refundSummary?.hiddenRefundAmount ?? 0)}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Cuenta de reembolso</Text>
            <Pressable
              style={styles.selectorBox}
              onPress={onToggleAccountOptions}
              disabled={loading}
            >
              <Text style={styles.selectorText} numberOfLines={1}>
                {selectedAccount?.name || 'Selecciona una cuenta activa'}
              </Text>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </Pressable>

            {accountOptionsVisible && (
              <View style={styles.optionsBox}>
                {accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    style={styles.optionItem}
                    onPress={() => onSelectAccount(account.id)}
                    disabled={loading}
                  >
                    <Text style={styles.optionText}>{account.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.actionText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.confirmButton]}
                onPress={onConfirm}
                disabled={loading}
              >
                <Text style={styles.actionText}>
                  {loading ? 'Eliminando...' : 'Eliminar y devolver'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    modalBox: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      minHeight: 54,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 18,
      justifyContent: 'center',
    },
    title: {
      color: '#FFFFFF',
      fontSize: 21,
      fontWeight: '900',
    },
    content: {
      padding: 18,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    summaryBox: {
      marginTop: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    summaryRow: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    summaryLabel: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    summaryValue: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    inputLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 6,
    },
    selectorBox: {
      minHeight: 42,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    selectorText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    optionsBox: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    optionItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginTop: 18,
    },
    actionButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    cancelButton: {
      backgroundColor: colors.expense,
    },
    confirmButton: {
      backgroundColor: colors.secondary,
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
    },
  });
}
