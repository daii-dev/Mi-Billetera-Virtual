import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  ChevronDown,
  LogOut,
  Menu,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { HomeBalanceCard } from '@/features/home/components/HomeBalanceCard';
import { HomeMovementCard } from '@/features/home/components/HomeMovementCard';
import {
  processDuePlannedPayments,
} from '@/features/planned-payments/planned-payments.service';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import {
  buildCategoryFilterKey,
  getMovementFilterLabel,
  movementMatchesCategoryFilter,
} from '@/features/wallet/movement-filter.utils';
import { MovementFilterModal } from '@/features/wallet/MovementFilterModal';
import {
  deleteManualMovement,
  getAccountsTotal,
  getCategoriesByType,
  getPersonalAccount,
  getRecentMovements,
  getUserAccounts,
  getUserProfile,
  updateManualMovement,
} from '@/features/wallet/wallet.service';
import {
  Account,
  Category,
  ManualMovementType,
  Movement,
  MovementType,
} from '@/features/wallet/wallet.types';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { AppSidebar } from '@/layouts/sidebar/AppSidebar';
import { SidebarRouteKey } from '@/lib/sidebarNavigation';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import {
  useAuth,
  useClerk,
  useUser,
} from '@clerk/expo';

type HomeMovementModalMode = 'edit' | 'delete' | 'success' | null;

export default function HomeScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const supabase = useSupabase();

  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [homeFilterVisible, setHomeFilterVisible] = useState(false);
  const [selectedHomeFilterAccountId, setSelectedHomeFilterAccountId] = useState('');
  const [selectedHomeFilterCategoryKey, setSelectedHomeFilterCategoryKey] = useState('');
  const [profileName, setProfileName] = useState('Usuario');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<SidebarRouteKey>('home');

  const [movementModalMode, setMovementModalMode] =
    useState<HomeMovementModalMode>(null);

  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  const [movementDescription, setMovementDescription] = useState('');
  const [movementAmountText, setMovementAmountText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  const [savingMovement, setSavingMovement] = useState(false);

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey: 'home',
    onClose: () => setSidebarVisible(false),
    onSelectedKeyChange: setSelectedSidebarItem,
  });

  const openSidebarPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isFromLeftEdge = gestureState.x0 <= 25;
        const isSwipeToRight = gestureState.dx > 12;
        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

        return isFromLeftEdge && isSwipeToRight && isHorizontalSwipe;
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldOpen =
          gestureState.dx > 60 ||
          gestureState.vx > 0.5;

        if (shouldOpen) {
          setSidebarVisible(true);
        }
      },
    })
  ).current;

  async function loadAccount(showFullLoader = false) {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    try {
      if (showFullLoader) {
        setLoading(true);
      }
      await processDuePlannedPayments(supabase);

      const userAccounts = await getUserAccounts(supabase, userId);
      const data = await getPersonalAccount(supabase, userId);
      const recentMovements = await getRecentMovements(supabase, userId, 100);

      if (!data) {
        console.log('No existen cuentas para este usuario');
        router.replace('/initial-balance');
        return;
      }

      if (!data.initial_balance_configured) {
        console.log('La cuenta existe, pero no tiene saldo inicial configurado');
        router.replace('/initial-balance');
        return;
      }

      const profile = await getUserProfile(supabase, userId);

      const fallbackName =
        user?.fullName ||
        user?.primaryEmailAddress?.emailAddress ||
        'Usuario';

      setProfileName(profile?.full_name || fallbackName);
      setAccount(data);
      setAccounts(userAccounts);
      setMovements(recentMovements);
    } catch (error: any) {
      console.log('ERROR HOME LOAD ACCOUNT:', JSON.stringify(error, null, 2));

      Alert.alert(
        'Error',
        error?.message || 'No se pudo cargar la información de tu billetera'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isLoaded) {
      loadAccount(true);
    }
  }, [isLoaded, isSignedIn, userId]);

  const loadMovementCategories = useCallback(async () => {
    if (!isLoaded || !userId) return;

    try {
      const [incomeData, expenseData] = await Promise.all([
        getCategoriesByType(supabase, userId, 'income'),
        getCategoriesByType(supabase, userId, 'expense'),
      ]);

      setIncomeCategories(incomeData);
      setExpenseCategories(expenseData);
    } catch (error) {
      console.error('ERROR HOME LOAD CATEGORIES:', error);
    }
  }, [supabase, userId, isLoaded]);

  useEffect(() => {
    if (isLoaded && userId) {
      loadMovementCategories();
    }
  }, [isLoaded, userId, loadMovementCategories]);

  useEffect(() => {
    if (!selectedHomeFilterAccountId) return;

    const accountExists = accounts.some(
      (account) => account.id === selectedHomeFilterAccountId
    );

    if (!accountExists) {
      setSelectedHomeFilterAccountId('');
    }
  }, [accounts, selectedHomeFilterAccountId]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAccount(false);
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesión');
    }
  }

  function isManualMovementType(type: MovementType): type is ManualMovementType {
    return type === 'income' || type === 'expense';
  }

  function getLocalCategoriesByType(type: ManualMovementType) {
    return type === 'income' ? incomeCategories : expenseCategories;
  }

  function handleChangeMovementAmount(value: string) {
    setMovementAmountText(sanitizeMoneyInput(value, movementAmountText));
  }

  function openMovementEditModal(movement: Movement) {
    if (movement.source !== 'manual' || !isManualMovementType(movement.type)) {
      return;
    }

    const categories = getLocalCategoriesByType(movement.type);

    setSelectedMovement(movement);
    setMovementDescription(movement.title);
    setMovementAmountText(formatMoneyInput(movement.amount));
    setSelectedAccountId(movement.account_id);
    setSelectedCategory(movement.category_name || categories[0]?.name || 'Otro');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setMovementModalMode('edit');
  }

  function closeMovementModal() {
    setMovementModalMode(null);
    setSelectedMovement(null);
    setMovementDescription('');
    setMovementAmountText('');
    setSelectedAccountId('');
    setSelectedCategory('');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setSavingMovement(false);
  }

  function validateMovementForm(): {
    cleanDescription: string;
    amount: number;
    accountId: string;
    category: string;
  } | null {
    const cleanDescription = movementDescription.trim();
    const cleanAmountText = movementAmountText.trim();
    const accountId = selectedAccountId;
    const category = selectedCategory.trim();

    if (!cleanDescription) {
      Alert.alert('Campo requerido', 'Ingresa una descripción');
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

    return {
      cleanDescription,
      amount,
      accountId,
      category,
    };
  }

  async function handleUpdateMovementFromHome() {
    if (!userId || !selectedMovement || !isManualMovementType(selectedMovement.type)) return;

    const form = validateMovementForm();

    if (!form) return;

    try {
      setSavingMovement(true);

      await updateManualMovement(supabase, selectedMovement.id, {
        clerkUserId: userId,
        accountId: form.accountId,
        type: selectedMovement.type,
        title: form.cleanDescription,
        amount: form.amount,
        categoryName: form.category,
      });

      await loadAccount(false);

      setMovementModalMode('success');

      setTimeout(() => {
        closeMovementModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo actualizar el movimiento'
      );
    } finally {
      setSavingMovement(false);
    }
  }

  async function handleDeleteMovementFromHome() {
    if (!selectedMovement) return;

    try {
      setSavingMovement(true);

      await deleteManualMovement(supabase, selectedMovement.id);

      await loadAccount(false);
      closeMovementModal();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo eliminar el movimiento'
      );
    } finally {
      setSavingMovement(false);
    }
  }

  if (loading && !account) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando tu billetera...</Text>
        </View>
      );
    }

    const currentBalance = getAccountsTotal(accounts);

    const totalIncome = movements
      .filter((movement) => movement.type === 'income')
      .reduce((total, movement) => total + Number(movement.amount ?? 0), 0);

    const totalExpense = movements
      .filter((movement) => movement.type === 'expense')
      .reduce((total, movement) => total + Number(movement.amount ?? 0), 0);

    const selectedHomeFilterAccount = accounts.find(
      (account) => account.id === selectedHomeFilterAccountId
    );

    const homeFilterCategories = [
      ...incomeCategories,
      ...expenseCategories,
    ];

    const selectedHomeFilterCategory = homeFilterCategories.find(
      (category) =>
        buildCategoryFilterKey(category.type, category.name) === selectedHomeFilterCategoryKey
    );

    const hasHomeFilters = Boolean(
      selectedHomeFilterAccountId ||
      selectedHomeFilterCategoryKey
    );

    const homeFilterButtonLabel = getMovementFilterLabel(
      selectedHomeFilterAccount?.name,
      selectedHomeFilterCategory?.name
    );

    const filteredHomeMovements = movements.filter((movement) => {
      const matchesAccount =
        !selectedHomeFilterAccountId ||
        movement.account_id === selectedHomeFilterAccountId;

      const matchesCategory = movementMatchesCategoryFilter(
        movement,
        selectedHomeFilterCategoryKey
      );

      return matchesAccount && matchesCategory;
    });

    return (
      <View
        style={styles.container}
        {...openSidebarPanResponder.panHandlers}
      >
        <View style={styles.topBar}>
          <View style={styles.topTitleBox}>
            <Pressable
              onPress={() => setSidebarVisible(true)}
              hitSlop={10}
            >
              <Menu size={28} color="#FFFFFF" />
            </Pressable>

            <Text style={styles.topTitle}>Inicio</Text>
          </View>

          <Pressable onPress={handleLogout} hitSlop={10}>
            <LogOut size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <HomeBalanceCard
            currentBalance={currentBalance}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Movimientos recientes</Text>

            <Pressable
              style={[
                styles.filterButton,
                hasHomeFilters && styles.filterButtonActive,
              ]}
              onPress={() => setHomeFilterVisible(true)}
            >
              <SlidersHorizontal
                size={16}
                color={hasHomeFilters ? colors.primary : theme.colors.text}
              />

              <Text
                style={[
                  styles.filterButtonText,
                  hasHomeFilters && styles.filterButtonTextActive,
                ]}
                numberOfLines={1}
              >
                {homeFilterButtonLabel}
              </Text>
            </Pressable>
          </View>

          {filteredHomeMovements.length === 0 ? (
            <Text style={styles.emptyText}>
              {hasHomeFilters
                ? 'No hay movimientos con los filtros seleccionados.'
                : 'Todavía no tienes movimientos registrados.'}
            </Text>
          ) : (
            filteredHomeMovements.map((movement) => (
              <HomeMovementCard
                key={movement.id}
                movement={movement}
                onEdit={openMovementEditModal}
                onDelete={(movementToDelete) => {
                  setSelectedMovement(movementToDelete);
                  setMovementModalMode('delete');
                }}
              />
            ))
          )}
        </ScrollView>

        <MovementFilterModal
          visible={homeFilterVisible}
          accounts={accounts}
          categories={homeFilterCategories}
          selectedAccountId={selectedHomeFilterAccountId}
          selectedCategoryKey={selectedHomeFilterCategoryKey}
          title="Filtrar movimientos"
          onSelectAccount={setSelectedHomeFilterAccountId}
          onSelectCategory={setSelectedHomeFilterCategoryKey}
          onClear={() => {
            setSelectedHomeFilterAccountId('');
            setSelectedHomeFilterCategoryKey('');
          }}
          onClose={() => setHomeFilterVisible(false)}
        />

        <HomeMovementModal
          mode={movementModalMode}
          styles={styles}
          selectedMovement={selectedMovement}
          accounts={accounts}
          description={movementDescription}
          amountText={movementAmountText}
          selectedAccountId={selectedAccountId}
          selectedCategory={selectedCategory}
          availableCategories={
            selectedMovement && isManualMovementType(selectedMovement.type)
              ? getLocalCategoriesByType(selectedMovement.type)
              : []
          }
          showAccountOptions={showAccountOptions}
          showCategoryOptions={showCategoryOptions}
          saving={savingMovement}
          onChangeDescription={setMovementDescription}
          onChangeAmount={handleChangeMovementAmount}
          onSelectAccount={(accountId) => {
            setSelectedAccountId(accountId);
            setShowAccountOptions(false);
          }}
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            setShowCategoryOptions(false);
          }}
          onToggleAccountOptions={() =>
            setShowAccountOptions(!showAccountOptions)
          }
          onToggleCategoryOptions={() =>
            setShowCategoryOptions(!showCategoryOptions)
          }
          onClose={closeMovementModal}
          onUpdate={handleUpdateMovementFromHome}
          onGoDelete={() => setMovementModalMode('delete')}
          onCancelDelete={closeMovementModal}
          onDelete={handleDeleteMovementFromHome}
        />

        <AppSidebar
          visible={sidebarVisible}
          userName={profileName}
          selectedKey={selectedSidebarItem}
          visualMode={isDarkMode}
          onToggleVisualMode={setDarkMode}
          onClose={() => setSidebarVisible(false)}
          onSelectItem={handleSelectSidebarItem}
        />
      </View>
    );
  }

  type HomeMovementModalProps = {
    mode: HomeMovementModalMode;
    styles: ReturnType<typeof createStyles>;
    selectedMovement: Movement | null;
    accounts: Account[];
    description: string;
    amountText: string;
    selectedAccountId: string;
    selectedCategory: string;
    availableCategories: Category[];
    showAccountOptions: boolean;
    showCategoryOptions: boolean;
    saving: boolean;
    onChangeDescription: (value: string) => void;
    onChangeAmount: (value: string) => void;
    onSelectAccount: (accountId: string) => void;
    onSelectCategory: (category: string) => void;
    onToggleAccountOptions: () => void;
    onToggleCategoryOptions: () => void;
    onClose: () => void;
    onUpdate: () => void;
    onGoDelete: () => void;
    onCancelDelete: () => void;
    onDelete: () => void;
  };

  function HomeMovementModal({
    mode,
    styles,
    selectedMovement,
    accounts,
    description,
    amountText,
    selectedAccountId,
    selectedCategory,
    availableCategories,
    showAccountOptions,
    showCategoryOptions,
    saving,
    onChangeDescription,
    onChangeAmount,
    onSelectAccount,
    onSelectCategory,
    onToggleAccountOptions,
    onToggleCategoryOptions,
    onClose,
    onUpdate,
    onGoDelete,
    onCancelDelete,
    onDelete,
  }: HomeMovementModalProps) {
    if (!mode || !selectedMovement) {
      return null;
    }

    const isIncome = selectedMovement.type === 'income';
    const isEdit = mode === 'edit';
    const isDelete = mode === 'delete';
    const isSuccess = mode === 'success';

    const categories = availableCategories;

    const selectedAccount = accounts.find(
      (account) => account.id === selectedAccountId
    );

    const editTitle = isIncome ? 'Editar Ingreso' : 'Editar Gasto';
    const deleteTitle = isIncome ? 'Eliminar Ingreso' : 'Eliminar gasto';
    const successTitle = isIncome ? 'Editar Ingreso' : 'Editar Gasto';

    const successMessage = isIncome
      ? 'Ingreso editado correctamente'
      : 'Gasto editado correctamente';

    const deleteMessage = isIncome
      ? '¿Estas seguro que quieres eliminar este ingreso?'
      : '¿Estas seguro que quieres eliminar este gasto?';

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit ? editTitle : isDelete ? deleteTitle : successTitle}
              </Text>
            </View>

            {isEdit && (
              <View style={styles.modalContent}>
                <Text style={styles.inputLabel}>Descripcion</Text>
                <TextInput
                  value={description}
                  onChangeText={onChangeDescription}
                  placeholder={isIncome ? 'Ej. Sueldo' : 'Ej. Compra de viveres'}
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
                    style={styles.amountInput}
                  />
                </View>

                <Text style={styles.inputLabel}>Seleccionar Cuenta</Text>
                <Pressable
                  style={styles.selectorBox}
                  onPress={onToggleAccountOptions}
                >
                  <View style={styles.selectorLeft}>
                    <Wallet size={22} color="#4B5563" />
                    <Text style={styles.selectorText}>
                      {selectedAccount?.name || 'Selecciona una cuenta'}
                    </Text>
                  </View>

                  <ChevronDown size={20} color="#6B7280" />
                </Pressable>

                {showAccountOptions && (
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
                    <Text style={styles.categoryIcon}>♟</Text>
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
                        <Text style={styles.optionText}>{category.name}</Text>
                      </Pressable>
                    ))}
                  </View>
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
                    onPress={onUpdate}
                    disabled={saving}
                  >
                    <Text style={styles.modalButtonText}>
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {isSuccess && (
              <View style={styles.successContent}>
                <Text style={styles.successText}>
                  ♡ {successMessage}
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
        </View>
      </Modal>
    );
  }

  function createStyles(theme: AppTheme) {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      topBar: {
        height: 92,
        backgroundColor: theme.colors.sidebarHeader,
        paddingHorizontal: 18,
        paddingTop: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      topTitleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      },
      topTitle: {
        color: '#FFFFFF',
        fontSize: 25,
        fontWeight: '900',
      },
      content: {
        padding: 16,
        paddingBottom: 40,
      },
      sectionHeader: {
        marginTop: 24,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      },
      sectionTitle: {
        flex: 1,
        fontSize: 18,
        color: theme.colors.text,
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
        borderColor: '#5BBEEA',
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
      categoryIcon: {
        fontSize: 21,
        color: '#4B5563',
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
        backgroundColor: colors.secondary,
      },
      modalButtonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 14,
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
    });
  }
