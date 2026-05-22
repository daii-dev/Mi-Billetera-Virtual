import { useEffect, useState } from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import {
  calculateDaysRemaining,
  calculateRemainingAmount,
} from '@/features/savings-goals/savings-goals.service';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import { money } from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type GoalContributionModalProps = {
  visible: boolean;
  goal: SavingsGoal | null;
  accounts: Account[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (params: {
    cuentaId: string;
    monto: number;
    nota: string | null;
  }) => Promise<void> | void;
};

export function GoalContributionModal({
  visible,
  goal,
  accounts,
  loading = false,
  onClose,
  onConfirm,
}: GoalContributionModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const remainingAmount = goal ? calculateRemainingAmount(goal) : 0;

  useEffect(() => {
    if (visible) {
      const preferredAccount = goal?.cuenta_id
        ? accounts.find((account) => account.id === goal.cuenta_id)
        : accounts[0];

      setSelectedAccountId(preferredAccount?.id ?? accounts[0]?.id ?? '');
      setAmountText('');
      setNote('');
      setError('');
    }
  }, [visible, goal, accounts]);

  function handleAmountChange(value: string) {
    setAmountText(sanitizeMoneyInput(value, amountText));
    setError('');
  }

  async function handleConfirm() {
    const cleanAmount = amountText.trim();

    if (!selectedAccountId) {
      setError('Selecciona una cuenta');
      return;
    }

    if (!cleanAmount) {
      setError('Ingresa el monto del abono');
      return;
    }

    if (!isValidMoneyInput(cleanAmount)) {
      setError('Usa un monto valido. Ejemplo: 120,50');
      return;
    }

    const amount = parseMoneyInput(cleanAmount);
    const daysRemaining = goal ? calculateDaysRemaining(goal.fecha_limite) : 0;

    if (amount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!goal || goal.estado !== 'activa' || daysRemaining < 0) {
      setError('No se pueden registrar abonos en metas completadas o vencidas');
      return;
    }

    if (amount > remainingAmount) {
      setError('El abono no puede superar el monto faltante de la meta');
      return;
    }

    if (selectedAccount && amount > Number(selectedAccount.current_balance ?? 0)) {
      setError('El monto supera el saldo disponible');
      return;
    }

    await onConfirm({
      cuentaId: selectedAccountId,
      monto: amount,
      nota: note.trim() || null,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Abonar a esta meta</Text>
            <Text style={styles.goalName} numberOfLines={2}>
              {goal?.nombre}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Cuenta</Text>
              <View style={styles.accountsList}>
                {accounts.map((account) => {
                  const selected = account.id === selectedAccountId;

                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => {
                        setSelectedAccountId(account.id);
                        setError('');
                      }}
                      style={[
                        styles.accountOption,
                        selected && styles.accountSelected,
                      ]}
                    >
                      <View style={styles.accountInfo}>
                        <Text
                          style={[
                            styles.accountName,
                            selected && styles.accountNameSelected,
                          ]}
                        >
                          {account.name}
                        </Text>
                        <Text
                          style={[
                            styles.accountBalance,
                            selected && styles.accountNameSelected,
                          ]}
                        >
                          Saldo: {money(account.current_balance)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Saldo disponible</Text>
              <Text style={styles.availableBalance}>
                {selectedAccount ? money(selectedAccount.current_balance) : 'Selecciona una cuenta'}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Monto faltante</Text>
              <Text style={styles.remainingAmount}>{money(remainingAmount)}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Monto del abono</Text>
              <AppInput
                value={amountText}
                onChangeText={handleAmountChange}
                placeholder={formatMoneyInput(0)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nota opcional</Text>
              <AppInput
                value={note}
                onChangeText={setNote}
                placeholder="Ej. Transferencia mensual"
                autoCapitalize="sentences"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.actions}>
              <View style={styles.actionButton}>
                <AppButton
                  title="Cancelar"
                  variant="outline"
                  onPress={onClose}
                  disabled={loading}
                />
              </View>
              <View style={styles.actionButton}>
                <AppButton
                  title="Confirmar"
                  onPress={handleConfirm}
                  loading={loading}
                />
              </View>
            </View>
          </ScrollView>
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
      justifyContent: 'flex-end',
    },
    modalCard: {
      maxHeight: '88%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    content: {
      padding: 18,
      paddingBottom: 28,
      gap: 14,
    },
    title: {
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '900',
    },
    goalName: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '800',
    },
    field: {
      gap: 8,
    },
    label: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    accountsList: {
      gap: 8,
    },
    accountOption: {
      minHeight: 58,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    accountSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    accountInfo: {
      gap: 4,
    },
    accountName: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    accountNameSelected: {
      color: '#FFFFFF',
    },
    accountBalance: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    availableBalance: {
      color: colors.secondary,
      fontSize: 18,
      fontWeight: '900',
    },
    remainingAmount: {
      color: colors.expense,
      fontSize: 18,
      fontWeight: '900',
    },
    errorText: {
      color: colors.expense,
      fontSize: 12,
      fontWeight: '800',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    actionButton: {
      flex: 1,
    },
  });
}
