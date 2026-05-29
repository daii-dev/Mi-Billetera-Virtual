import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  getCompletedSavingsGoals,
} from '@/features/savings-goals/savings-goals.service';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import { MovementCard } from '@/features/wallet/components/MovementCard';
import { MovementForm } from '@/features/wallet/components/MovementForm';
import {
  buildCategoryFilterKey,
  getMovementFilterLabel,
  movementMatchesCategoryFilter,
} from '@/features/wallet/movement-filter.utils';
import { MovementFilterModal } from '@/features/wallet/MovementFilterModal';
import {
  createManualMovement,
  deleteManualMovement,
  getMovementsByType,
  getUserAccounts,
  registerExpenseFromGoal,
  updateManualMovement,
} from '@/features/wallet/wallet.service';
import {
  Account,
  Category,
  ManualMovementType,
  Movement,
} from '@/features/wallet/wallet.types';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useAuth } from '@clerk/expo';

type ModalMode = 'form' | 'edit' | 'delete' | 'success' | null;
const registerPigImages = {
  income: require('../../../assets/chanchito-ingreso.png'),
  expense: require('../../../assets/chanchito-gasto.png'),
};

type MovementManagerScreenProps = {
  type: ManualMovementType;
  title: string;
  listTitle: string;
  registerButtonText: string;
  registerTitle: string;
  editTitle: string;
  deleteTitle: string;
  deleteMessage: string;
  successTitle: string;
  successMessage: string;
  headerColor: string;
  buttonColor: string;
  placeholder: string;
  categories: Category[];

  showHeader?: boolean;
  showRegisterButton?: boolean;
  showFloatingButton?: boolean;
  contentHeader?: ReactNode;
};

export function MovementManagerScreen({
  type,
  title,
  listTitle,
  registerButtonText,
  registerTitle,
  editTitle,
  deleteTitle,
  deleteMessage,
  successTitle,
  successMessage,
  headerColor,
  buttonColor,
  placeholder,
  categories,
  showHeader = true,
  showRegisterButton = true,
  showFloatingButton = false,
  contentHeader,
}: MovementManagerScreenProps) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const supabase = useSupabase();

  const { theme } = useAppTheme();
  const styles = createStyles(theme, headerColor, buttonColor);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [completedGoals, setCompletedGoals] = useState<SavingsGoal[]>([]);

  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilterAccountId, setSelectedFilterAccountId] = useState('');
  const [selectedFilterCategoryKey, setSelectedFilterCategoryKey] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
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

  const [saving, setSaving] = useState(false);
  const [openedParamEditId, setOpenedParamEditId] = useState<string | null>(null);

  const [successAction, setSuccessAction] = useState<'create' | 'edit'>('create');

  async function loadData(showFullLoader = false) {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    try {
      if (showFullLoader) {
        setLoading(true);
      }

      const [userAccounts, userMovements, userCompletedGoals] = await Promise.all([
        getUserAccounts(supabase, userId),
        getMovementsByType(supabase, userId, type),
        type === 'expense'
          ? getCompletedSavingsGoals(supabase, userId)
          : Promise.resolve([]),
      ]);

      setAccounts(userAccounts);
      setMovements(userMovements);
      setCompletedGoals(userCompletedGoals);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudieron cargar los movimientos'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isLoaded) {
      loadData(true);
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!selectedFilterAccountId) return;

    const accountExists = accounts.some(
      (account) => account.id === selectedFilterAccountId
    );

    if (!accountExists) {
      setSelectedFilterAccountId('');
    }
  }, [accounts, selectedFilterAccountId]);

  useEffect(() => {
    if (!editId || openedParamEditId === editId || movements.length === 0) {
      return;
    }

    const movementToEdit = movements.find((movement) => movement.id === editId);

    if (movementToEdit && movementToEdit.source === 'manual') {
      openEditModal(movementToEdit);
      setOpenedParamEditId(editId);
    }
  }, [editId, movements, openedParamEditId]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData(false);
  }

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
    setSaving(false);
  }

  function handleToggleSavingsGoal(enabled: boolean) {
    setUseSavingsGoal(enabled);
    setSelectedGoalId('');
    setShowGoalOptions(false);
    setShowAccountOptions(false);

    if (enabled) {
      setAmountText('');
      return;
    }

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

  function validateForm(): {
    cleanDescription: string;
    amount: number;
    accountId: string;
    category: string;
    goalId: string | null;
  } | null {
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

  async function handleCreateMovement() {
    if (!userId) return;

    const form = validateForm();

    if (!form) return;

    try {
      setSaving(true);

      if (form.goalId) {
        await registerExpenseFromGoal(supabase, {
          metaId: form.goalId,
          accountId: form.accountId,
          amount: form.amount,
          description: form.cleanDescription,
          categoryName: form.category,
        });
      } else {
        await createManualMovement(supabase, {
          clerkUserId: userId,
          accountId: form.accountId,
          type,
          title: form.cleanDescription,
          amount: form.amount,
          categoryName: form.category,
        });
      }

      await loadData(false);
      setSuccessAction('create');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo guardar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateMovement() {
    if (!userId || !selectedMovement) return;

    const form = validateForm();

    if (!form) return;

    try {
      setSaving(true);

      await updateManualMovement(supabase, selectedMovement.id, {
        clerkUserId: userId,
        accountId: form.accountId,
        type,
        title: form.cleanDescription,
        amount: form.amount,
        categoryName: form.category,
      });

      await loadData(false);
      setSuccessAction('edit');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo actualizar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMovement() {
    if (!selectedMovement) return;

    try {
      setSaving(true);

      await deleteManualMovement(supabase, selectedMovement.id);

      await loadData(false);
      closeModal();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo eliminar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );
  const selectedGoal = completedGoals.find(
    (goal) => goal.id_meta === selectedGoalId
  ) ?? null;

  const isIncome = type === 'income';
  const amountSign = isIncome ? '+' : '-';

  const selectedFilterAccount = accounts.find(
    (account) => account.id === selectedFilterAccountId
  );

  const selectedFilterCategory = categories.find(
    (category) =>
      buildCategoryFilterKey(category.type, category.name) === selectedFilterCategoryKey
  );

  const hasActiveFilters = Boolean(
    selectedFilterAccountId ||
    selectedFilterCategoryKey
  );

  const filterButtonLabel = getMovementFilterLabel(
    selectedFilterAccount?.name,
    selectedFilterCategory?.name
  );

  const filteredMovements = movements.filter((movement) => {
    const matchesAccount =
      !selectedFilterAccountId ||
      movement.account_id === selectedFilterAccountId;

    const matchesCategory = movementMatchesCategoryFilter(
      movement,
      selectedFilterCategoryKey
    );

    return matchesAccount && matchesCategory;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={headerColor} />
        <Text style={styles.loadingText}>Cargando movimientos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft size={31} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.topTitle}>{title}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {contentHeader}

        {showRegisterButton && (
          <Pressable
            style={styles.registerButton}
            onPress={openCreateModal}
          >
            <Text style={styles.registerButtonText}>{registerButtonText}</Text>
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{listTitle}</Text>

          <Pressable
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal
              size={16}
              color={hasActiveFilters ? colors.primary : theme.colors.text}
            />

            <Text
              style={[
                styles.filterButtonText,
                hasActiveFilters && styles.filterButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {filterButtonLabel}
            </Text>
          </Pressable>
        </View>

        {filteredMovements.length === 0 ? (
          <Text style={styles.emptyText}>
            {hasActiveFilters
              ? 'No hay movimientos con los filtros seleccionados.'
              : 'Todavía no tienes movimientos registrados.'}
          </Text>
        ) : (
          filteredMovements.map((movement) => (
            <MovementCard
              key={movement.id}
              movement={movement}
              type={type}
              onEdit={openEditModal}
              onDelete={(movementToDelete) => {
                setSelectedMovement(movementToDelete);
                setModalMode('delete');
              }}
            />
          ))
        )}
      </ScrollView>

      {showFloatingButton && (
        <FloatingActionButton
          color={buttonColor}
          onPress={openCreateModal}
        />
      )}

      <MovementFilterModal
        visible={filterVisible}
        accounts={accounts}
        categories={categories}
        selectedAccountId={selectedFilterAccountId}
        selectedCategoryKey={selectedFilterCategoryKey}
        title="Filtrar movimientos"
        onSelectAccount={setSelectedFilterAccountId}
        onSelectCategory={setSelectedFilterCategoryKey}
        onClear={() => {
          setSelectedFilterAccountId('');
          setSelectedFilterCategoryKey('');
        }}
        onClose={() => setFilterVisible(false)}
      />

      <MovementModal
        mode={modalMode}
        styles={styles}
        type={type}
        successAction={successAction}
        registerTitle={registerTitle}
        buttonColor={buttonColor}
        editTitle={editTitle}
        deleteTitle={deleteTitle}
        deleteMessage={deleteMessage}
        successTitle={successTitle}
        successMessage={successMessage}
        placeholder={placeholder}
        description={description}
        amountText={amountText}
        selectedAccountName={selectedAccount?.name ?? ''}
        selectedCategory={selectedCategory}
        useSavingsGoal={useSavingsGoal}
        accountDisabled={useSavingsGoal}
        selectedGoal={selectedGoal}
        completedGoals={completedGoals}
        accounts={accounts}
        categories={categories}
        showAccountOptions={showAccountOptions}
        showCategoryOptions={showCategoryOptions}
        showGoalOptions={showGoalOptions}
        saving={saving}
        onChangeDescription={setDescription}
        onChangeAmount={handleChangeAmount}
        onToggleSavingsGoal={handleToggleSavingsGoal}
        onSelectGoal={handleSelectGoal}
        onSelectAccount={(accountId) => {
          setSelectedAccountId(accountId);
          setShowAccountOptions(false);
        }}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setShowCategoryOptions(false);
        }}
        onToggleAccountOptions={() => setShowAccountOptions(!showAccountOptions)}
        onToggleCategoryOptions={() => setShowCategoryOptions(!showCategoryOptions)}
        onToggleGoalOptions={() => setShowGoalOptions(!showGoalOptions)}
        onClose={closeModal}
        onCreate={handleCreateMovement}
        onUpdate={handleUpdateMovement}
        onGoDelete={() => setModalMode('delete')}
        onCancelDelete={closeModal}
        onDelete={handleDeleteMovement}
      />
    </View>
  );
}

type MovementModalProps = {
  mode: ModalMode;
  styles: ReturnType<typeof createStyles>;
  type: ManualMovementType;
  successAction: 'create' | 'edit';
  registerTitle: string;
  buttonColor: string;
  editTitle: string;
  deleteTitle: string;
  deleteMessage: string;
  successTitle: string;
  successMessage: string;
  placeholder: string;
  description: string;
  amountText: string;
  selectedAccountName: string;
  selectedCategory: string;
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
  onCreate: () => void;
  onUpdate: () => void;
  onGoDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

function MovementModal({
  mode,
  styles,
  type,
  successAction,
  registerTitle,
  buttonColor,
  editTitle,
  deleteTitle,
  deleteMessage,
  successTitle,
  successMessage,
  placeholder,
  description,
  amountText,
  selectedAccountName,
  selectedCategory,
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
  onCreate,
  onUpdate,
  onGoDelete,
  onCancelDelete,
  onDelete,
}: MovementModalProps) {
  if (!mode) {
    return null;
  }

  const isCreate = mode === 'form';
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';
  const isSuccess = mode === 'success';

  const editSuccessTitle = type === 'income'
    ? 'Editar Ingreso'
    : 'Editar Gasto';

    const editSuccessMessage = type === 'income'
    ? 'Ingreso editado correctamente'
    : 'Gasto editado correctamente';

    const finalSuccessTitle =
    successAction === 'edit'
        ? editSuccessTitle
        : successTitle;

    const finalSuccessMessage =
    successAction === 'edit'
        ? editSuccessMessage
        : successMessage;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={isCreate ? styles.fullFormPage : styles.modalOverlay}>
        {isCreate ? (
          <ScrollView contentContainerStyle={styles.registerPageContent}>
            <Text style={styles.registerPageTitle}>{registerTitle}</Text>

            <View style={styles.pigBox}>
              <Image
                source={registerPigImages[type]}
                style={styles.pigImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.formCard}>
              <MovementForm
                placeholder={placeholder}
                description={description}
                amountText={amountText}
                selectedAccountName={selectedAccountName}
                selectedCategory={selectedCategory}
                type={type}
                useSavingsGoal={useSavingsGoal}
                accountDisabled={useSavingsGoal}
                selectedGoal={selectedGoal}
                completedGoals={completedGoals}
                accounts={accounts}
                categories={categories}
                showAccountOptions={showAccountOptions}
                showCategoryOptions={showCategoryOptions}
                showGoalOptions={showGoalOptions}
                saving={saving}
                saveColor={buttonColor}
                onChangeDescription={onChangeDescription}
                onChangeAmount={onChangeAmount}
                onToggleSavingsGoal={onToggleSavingsGoal}
                onSelectGoal={onSelectGoal}
                onSelectAccount={onSelectAccount}
                onSelectCategory={onSelectCategory}
                onToggleAccountOptions={onToggleAccountOptions}
                onToggleCategoryOptions={onToggleCategoryOptions}
                onToggleGoalOptions={onToggleGoalOptions}
                onClose={onClose}
                onSave={onCreate}
                saveText="Guardar"
              />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit ? editTitle : isDelete ? deleteTitle : finalSuccessTitle}
              </Text>
            </View>

            {isEdit && (
              <View style={styles.modalContent}>
                <MovementForm
                  saveColor={buttonColor}
                  placeholder={placeholder}
                  description={description}
                  amountText={amountText}
                  selectedAccountName={selectedAccountName}
                  selectedCategory={selectedCategory}
                  type={type}
                  useSavingsGoal={false}
                  accountDisabled={false}
                  selectedGoal={null}
                  completedGoals={[]}
                  accounts={accounts}
                  categories={categories}
                  showAccountOptions={showAccountOptions}
                  showCategoryOptions={showCategoryOptions}
                  showGoalOptions={false}
                  saving={saving}
                  onChangeDescription={onChangeDescription}
                  onChangeAmount={onChangeAmount}
                  onToggleSavingsGoal={onToggleSavingsGoal}
                  onSelectGoal={onSelectGoal}
                  onSelectAccount={onSelectAccount}
                  onSelectCategory={onSelectCategory}
                  onToggleAccountOptions={onToggleAccountOptions}
                  onToggleCategoryOptions={onToggleCategoryOptions}
                  onToggleGoalOptions={onToggleGoalOptions}
                  onClose={onClose}
                  onSave={onUpdate}
                  saveText="Guardar"
                />
              </View>
            )}

            {isSuccess && (
              <View style={styles.successContent}>
                <Text style={styles.successText}>
                  ♡ {finalSuccessMessage}
                </Text>
              </View>
            )}

            {isDelete && (
              <View style={styles.deleteContent}>
                <Text style={styles.deleteText}>
                  {deleteMessage}
                </Text>

                <View style={styles.deleteActions}>
                  <Pressable
                    onPress={onCancelDelete}
                    disabled={saving}
                    style={styles.deleteTextButton}
                  >
                    <Text style={styles.deleteOptionText}>No</Text>
                  </Pressable>

                  <Pressable
                    onPress={onDelete}
                    disabled={saving}
                    style={styles.deleteTextButton}
                  >
                    <Text style={styles.deleteOptionText}>
                      {saving ? 'Eliminando...' : 'Si'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

function createStyles(
  theme: AppTheme,
  headerColor: string,
  buttonColor: string
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      height: 92,
      backgroundColor: headerColor,
      paddingHorizontal: 12,
      paddingTop: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    topTitle: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '900',
    },
    content: {
      padding: 14,
      paddingBottom: 120,
    },
    registerButton: {
      alignSelf: 'center',
      width: '82%',
      height: 38,
      borderRadius: 24,
      backgroundColor: buttonColor,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 4,
      elevation: 4,
      marginTop: 10,
      marginBottom: 24,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    sectionHeader: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    filterButton: {
      maxWidth: 150,
      minHeight: 34,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    filterButtonActive: {
      backgroundColor: '#AEE4FF',
      borderColor: '#AEE4FF',
    },
    filterButtonText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '900',
      maxWidth: 98,
    },
    filterButtonTextActive: {
      color: colors.primary,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 16,
    },
    fullFormPage: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    registerPageContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingBottom: 26,
    },
    registerPageTitle: {
      width: '100%',
      height: 92,
      paddingTop: 42,
      backgroundColor: headerColor,
      color: '#FFFFFF',
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '900',
    },
    pigBox: {
      width: 140,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    pigImage: {
      width: 120,
      height: 110,
    },
    formCard: {
      width: '90%',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      paddingHorizontal: 22,
      paddingVertical: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.20,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.62)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    modalBox: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    modalHeader: {
      height: 54,
      backgroundColor: '#082B8C',
      paddingHorizontal: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },
    modalContent: {
      paddingHorizontal: 22,
      paddingTop: 18,
      paddingBottom: 18,
    },
    successContent: {
      paddingHorizontal: 22,
      paddingVertical: 24,
    },
    successText: {
      color: colors.secondary,
      fontSize: 16,
      fontWeight: '700',
    },
    deleteContent: {
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 18,
    },
    deleteText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      lineHeight: 22,
    },
    deleteActions: {
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 44,
    },
    deleteTextButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    deleteOptionText: {
      color: theme.mode === 'dark' ? '#FFFFFF' : colors.primary,
      fontSize: 14,
      fontWeight: '900',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 14,
      color: theme.colors.text,
      fontWeight: '800',
    },
    movementCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
  });
}
