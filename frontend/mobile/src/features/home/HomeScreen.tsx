import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeBalanceCard } from '@/features/home/components/HomeBalanceCard';
import { HomeMovementCard } from '@/features/home/components/HomeMovementCard';
import {
  HomeMovementModal,
  HomeMovementModalMode,
} from '@/features/home/components/HomeMovementModal';
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
  updateManualMovement,
} from '@/features/wallet/wallet.service';
import {
  Account,
  Category,
  ManualMovementType,
  Movement,
  MovementType,
} from '@/features/wallet/wallet.types';
import { useProfileName } from '@/hooks/useProfileName';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { useSidebarSwipe } from '@/hooks/useSidebarSwipe';
import { AppHeader } from '@/layouts/header/AppHeader';
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
} from '@clerk/expo';

export default function HomeScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
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
  const { profileName } = useProfileName();
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

  const sidebarSwipeHandlers = useSidebarSwipe({
    onOpen: () => setSidebarVisible(true),
  });

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
        {...sidebarSwipeHandlers}
      >
        <AppHeader
          title="Inicio"
          onOpenSidebar={() => setSidebarVisible(true)}
          onLogout={handleLogout}
        />

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

  function createStyles(theme: AppTheme) {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
