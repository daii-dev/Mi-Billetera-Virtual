import {
  ChevronDown,
  PiggyBank,
  Wallet,
} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import { renderCategoryIcon } from '@/features/wallet/category.utils';
import { money } from '@/features/wallet/wallet.service';
import {
  Account,
  Category,
  ManualMovementType,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type MovementFormProps = {
  placeholder: string;
  description: string;
  amountText: string;
  selectedAccountName: string;
  selectedCategory: string;
  type: ManualMovementType;
  useSavingsGoal: boolean;
  accountDisabled: boolean;
  selectedGoal: SavingsGoal | null;
  completedGoals: SavingsGoal[];
  accounts: Account[];
  categories: Category[];
  showAccountOptions: boolean;
  showCategoryOptions: boolean;
  showGoalOptions: boolean;
  saving: boolean;
  saveText: string;
  saveColor: string;
  onChangeDescription: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onToggleSavingsGoal: (enabled: boolean) => void;
  onSelectGoal: (goal: SavingsGoal) => void;
  onSelectAccount: (accountId: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleAccountOptions: () => void;
  onToggleCategoryOptions: () => void;
  onToggleGoalOptions: () => void;
  onClose: () => void;
  onSave: () => void;
};

export function MovementForm({
  placeholder,
  description,
  amountText,
  selectedAccountName,
  selectedCategory,
  type,
  useSavingsGoal,
  accountDisabled,
  selectedGoal,
  completedGoals,
  accounts,
  categories,
  showAccountOptions,
  showCategoryOptions,
  showGoalOptions,
  saving,
  saveText,
  saveColor,
  onChangeDescription,
  onChangeAmount,
  onToggleSavingsGoal,
  onSelectGoal,
  onSelectAccount,
  onSelectCategory,
  onToggleAccountOptions,
  onToggleCategoryOptions,
  onToggleGoalOptions,
  onClose,
  onSave,
}: MovementFormProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme, saveColor);

  return (
    <>
      <Text style={styles.inputLabel}>Descripcion</Text>
      <TextInput
        value={description}
        onChangeText={onChangeDescription}
        placeholder={placeholder}
        placeholderTextColor="#A8A8A8"
        style={styles.input}
      />

      <Text style={styles.inputLabel}>Ingresar Monto</Text>
      <View style={styles.amountInputBox}>
        <Text style={styles.amountPrefix}>Bs.</Text>

        <TextInput
          value={amountText}
          onChangeText={onChangeAmount}
          placeholder="0,00"
          placeholderTextColor="#A8A8A8"
          keyboardType="decimal-pad"
          editable={!useSavingsGoal}
          style={styles.amountInput}
        />
      </View>

      <Text style={styles.inputLabel}>Seleccionar Cuenta</Text>
      <Pressable
        style={[
          styles.selectorBox,
          accountDisabled && styles.selectorBoxDisabled,
        ]}
        disabled={accountDisabled}
        onPress={accountDisabled ? undefined : onToggleAccountOptions}
      >
        <View style={styles.selectorLeft}>
          <Wallet size={22} color="#4B5563" />

          <Text style={styles.selectorText}>
            {selectedAccountName || 'Selecciona una cuenta'}
          </Text>
        </View>

        <ChevronDown size={20} color="#6B7280" />
      </Pressable>

      {!accountDisabled && showAccountOptions && (
        <View style={styles.optionsBox}>
          {accounts.map((account) => (
            <Pressable
              key={account.id}
              style={styles.optionItem}
              onPress={() => onSelectAccount(account.id)}
            >
              <Text style={styles.optionText}>{account.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.inputLabel}>Categoria</Text>
      <Pressable
        style={styles.selectorBox}
        onPress={onToggleCategoryOptions}
      >
        <View style={styles.selectorLeft}>
          {renderCategoryIcon(
            categories.find((category) => category.name === selectedCategory)?.icon,
            22,
            '#4B5563'
          )}

          <Text style={styles.selectorText}>
            {selectedCategory || 'Selecciona una categoría'}
          </Text>
        </View>

        <ChevronDown size={20} color="#6B7280" />
      </Pressable>

      {showCategoryOptions && (
        <View style={styles.optionsBox}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.optionItem}
              onPress={() => onSelectCategory(category.name)}
            >
              <View style={styles.categoryOptionRow}>
                {renderCategoryIcon(category.icon, 20, '#4B5563')}
                <Text style={styles.optionText}>{category.name}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {type === 'expense' && (
        <>
          <Pressable
            style={styles.goalToggleRow}
            onPress={() => onToggleSavingsGoal(!useSavingsGoal)}
            disabled={saving}
          >
            <View
              style={[
                styles.checkbox,
                useSavingsGoal && styles.checkboxSelected,
              ]}
            >
              {useSavingsGoal && <Text style={styles.checkboxMark}>✓</Text>}
            </View>

            <Text style={styles.goalToggleText}>
              Usar meta de ahorro completada
            </Text>
          </Pressable>

          {useSavingsGoal && (
            <>
              <Text style={styles.inputLabel}>Seleccionar Meta de Ahorro</Text>

              <Pressable
                style={styles.selectorBox}
                onPress={onToggleGoalOptions}
              >
                <View style={styles.selectorLeft}>
                  <PiggyBank size={22} color="#4B5563" />

                  <Text style={styles.selectorText}>
                    {selectedGoal?.nombre || 'Selecciona una meta completada'}
                  </Text>
                </View>

                <ChevronDown size={20} color="#6B7280" />
              </Pressable>

              {showGoalOptions && (
                <View style={styles.optionsBox}>
                  {completedGoals.length === 0 ? (
                    <Text style={styles.emptyOptionText}>
                      No tienes metas completadas disponibles
                    </Text>
                  ) : (
                    completedGoals.map((goal) => (
                      <Pressable
                        key={goal.id_meta}
                        style={styles.optionItem}
                        onPress={() => onSelectGoal(goal)}
                      >
                        <Text style={styles.optionText}>
                          {goal.nombre} · {money(goal.monto_actual)}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              {selectedGoal && (
                <View style={styles.goalSummaryCard}>
                  <Text style={styles.goalSummaryTitle}>
                    {selectedGoal.nombre}
                  </Text>

                  <Text style={styles.goalSummaryText}>
                    Monto ahorrado: {money(selectedGoal.monto_actual)}
                  </Text>

                  <Text style={styles.goalSummaryText}>
                    Fecha limite: {formatGoalDate(selectedGoal.fecha_limite)}
                  </Text>

                  {selectedGoal.contribution_accounts &&
                    selectedGoal.contribution_accounts.length > 0 && (
                      <Text style={styles.goalSummaryText}>
                        Cuentas usadas: {selectedGoal.contribution_accounts
                          .map((account) => account.accountName)
                          .join(', ')}
                      </Text>
                    )}

                  <Text style={styles.goalSummaryNotice}>
                    La cuenta se usará como referencia del movimiento. No se descontará nuevamente el saldo.
                  </Text>
                </View>
              )}
            </>
          )}
        </>
      )}

      <View style={styles.modalButtonsRow}>
        <Pressable
          style={[styles.modalButton, styles.cancelButton]}
          onPress={onClose}
          disabled={saving}
        >
          <Text style={styles.modalButtonText}>Cancelar</Text>
        </Pressable>

        <Pressable
          style={[styles.modalButton, styles.saveButton]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.modalButtonText}>
            {saving ? 'Guardando...' : saveText}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

function formatGoalDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function createStyles(theme: AppTheme, saveColor: string) {
  return StyleSheet.create({
    inputLabel: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 6,
    },
    input: {
      height: 40,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      fontSize: 15,
      marginBottom: 10,
    },
    amountInputBox: {
      height: 40,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginBottom: 10,
    },
    amountPrefix: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      fontWeight: '900',
      marginRight: 12,
    },
    amountInput: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
    },
    selectorBox: {
      height: 40,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    selectorBoxDisabled: {
      opacity: 0.75,
    },
    selectorLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    selectorText: {
      color: theme.colors.textSecondary,
      fontSize: 15,
    },
    optionsBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      marginBottom: 8,
      overflow: 'hidden',
    },
    optionItem: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    categoryOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    emptyOptionText: {
      color: theme.colors.textSecondary,
      paddingVertical: 12,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
    },
    goalToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
      marginBottom: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
    },
    checkboxMark: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    goalToggleText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    goalSummaryCard: {
      borderRadius: 10,
      backgroundColor: theme.colors.summaryCard,
      padding: 12,
      marginBottom: 10,
    },
    goalSummaryTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    goalSummaryText: {
      marginTop: 5,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    goalSummaryNotice: {
      marginTop: 8,
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
      marginTop: 18,
    },
    modalButton: {
      width: 108,
      height: 38,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    cancelButton: {
      backgroundColor: colors.expense,
    },
    saveButton: {
      backgroundColor: saveColor,
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 14,
    },
  });
}