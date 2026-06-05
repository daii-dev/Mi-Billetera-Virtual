import { useState } from 'react';

import { Alert } from 'react-native';

import {
  MovementModalMode,
  ValidMovementForm,
} from '@/features/records/records.types';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import {
  Account,
  Category,
  ManualMovementType,
  Movement,
} from '@/features/wallet/wallet.types';

type UseMovementFormStateParams = {
  type: ManualMovementType;
  accounts: Account[];
  categories: Category[];
  completedGoals: SavingsGoal[];
};

export function useMovementFormState({
  type,
  accounts,
  categories,
  completedGoals,
}: UseMovementFormStateParams) {
  const [modalMode, setModalMode] = useState<MovementModalMode>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [useSavingsGoal, setUseSavingsGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState('');

  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [showGoalOptions, setShowGoalOptions] = useState(false);

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const selectedGoal =
    completedGoals.find((goal) => goal.id_meta === selectedGoalId) ?? null;

  const isIncome = type === 'income';

  function handleChangeAmount(value: string) {
    if (useSavingsGoal && type === 'expense') {
      return;
    }

    setAmountText(sanitizeMoneyInput(value, amountText));
  }

  function getDefaultAccountId() {
    return accounts[0]?.id ?? '';
  }

  function getDefaultCategory() {
    return categories[0]?.name ?? '';
  }

  function openCreateModal() {
    setSelectedMovement(null);
    setDescription('');
    setAmountText('');
    setSelectedAccountId(getDefaultAccountId());
    setSelectedCategory(getDefaultCategory());
    setUseSavingsGoal(false);
    setSelectedGoalId('');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setShowGoalOptions(false);
    setModalMode('form');
  }

  function openEditModal(movement: Movement) {
    if (movement.source !== 'manual') {
      return;
    }

    setSelectedMovement(movement);
    setDescription(movement.title);
    setAmountText(formatMoneyInput(movement.amount));
    setSelectedAccountId(movement.account_id);
    setSelectedCategory(movement.category_name || getDefaultCategory());
    setUseSavingsGoal(false);
    setSelectedGoalId('');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setShowGoalOptions(false);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedMovement(null);
    setDescription('');
    setAmountText('');
    setUseSavingsGoal(false);
    setSelectedGoalId('');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setShowGoalOptions(false);
  }

  function handleToggleSavingsGoal(enabled: boolean) {
    setUseSavingsGoal(enabled);
    setSelectedGoalId('');
    setShowGoalOptions(false);
    setShowAccountOptions(false);
    setAmountText('');
  }

  function getGoalReferenceAccountId(goal: SavingsGoal) {
    if (goal.cuenta_id) {
      return goal.cuenta_id;
    }

    const contributionAccount = goal.contribution_accounts
      ?.slice()
      .sort((first, second) => second.amount - first.amount)[0];

    return contributionAccount?.accountId ?? getDefaultAccountId();
  }

  function handleSelectGoal(goal: SavingsGoal) {
    setSelectedGoalId(goal.id_meta);
    setSelectedAccountId(getGoalReferenceAccountId(goal));
    setAmountText(formatMoneyInput(goal.monto_actual));
    setShowGoalOptions(false);
  }

  function validateForm(): ValidMovementForm | null {
    const cleanDescription = description.trim();
    const cleanAmountText = amountText.trim();
    const accountId = selectedAccountId;
    const category = selectedCategory.trim();

    if (!cleanDescription) {
      Alert.alert('Campo requerido', 'Ingresa una descripción');
      return null;
    }

    if (type === 'expense' && useSavingsGoal && !selectedGoalId) {
      Alert.alert('Meta requerida', 'Selecciona una meta de ahorro completada');
      return null;
    }

    if (!isValidMoneyInput(cleanAmountText)) {
      Alert.alert(
        'Monto inválido',
        'Usa coma decimal y máximo dos decimales. Ejemplo: 120,50'
      );
      return null;
    }

    const amount = parseMoneyInput(cleanAmountText);

    if (amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero');
      return null;
    }

    if (!accountId) {
      Alert.alert('Cuenta requerida', 'Selecciona una cuenta');
      return null;
    }

    if (!category) {
      Alert.alert('Categoría requerida', 'Selecciona una categoría');
      return null;
    }

    if (type === 'expense' && useSavingsGoal) {
      const goalBalance = Number(selectedGoal?.monto_actual ?? 0);

      if (amount > goalBalance) {
        Alert.alert('Fondos insuficientes', 'Saldo insuficiente en la meta de ahorro');
        return null;
      }
    } else if (!isIncome && selectedAccount) {
      const currentBalance = Number(selectedAccount.current_balance ?? 0);

      if (amount > currentBalance) {
        Alert.alert(
          'Fondos insuficientes',
          'No tienes los suficientes fondos para retirar dinero de esta cuenta'
        );
        return null;
      }
    }

    return {
      cleanDescription,
      amount,
      accountId,
      category,
      goalId: type === 'expense' && useSavingsGoal ? selectedGoalId : null,
    };
  }

  return {
    modalMode,
    setModalMode,
    selectedMovement,
    setSelectedMovement,

    description,
    setDescription,
    amountText,
    selectedAccountId,
    setSelectedAccountId,
    selectedCategory,
    setSelectedCategory,
    useSavingsGoal,
    selectedGoalId,

    showAccountOptions,
    setShowAccountOptions,
    showCategoryOptions,
    setShowCategoryOptions,
    showGoalOptions,
    setShowGoalOptions,

    selectedAccount,
    selectedGoal,

    handleChangeAmount,
    openCreateModal,
    openEditModal,
    closeModal,
    handleToggleSavingsGoal,
    handleSelectGoal,
    validateForm,
  };
}