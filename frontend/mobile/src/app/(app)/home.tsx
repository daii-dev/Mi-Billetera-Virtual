import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  ChevronDown,
  LogOut,
  Menu,
  MoreVertical,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
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

import { AppSidebar } from '@/components/sidebar/AppSidebar';
import { AccountFilterModal } from '@/features/wallet/AccountFilterModal';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import {
  expenseCategories,
  incomeCategories,
} from '@/features/wallet/movement.constants';
import {
  deleteManualMovement,
  getAccountsTotal,
  getPersonalAccount,
  getRecentMovements,
  getUserAccounts,
  getUserProfile,
  money,
  updateManualMovement,
} from '@/features/wallet/wallet.service';
import {
  Account,
  Movement,
  MovementType,
} from '@/features/wallet/wallet.types';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

import { useAuth } from '@clerk/expo';
import { useClerk } from '@clerk/expo';
import { useUser } from '@clerk/expo';

// Importar la función para renderizar iconos
import { renderCategoryIcon } from '@/features/wallet/category.utils';

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
  const [homeFilterVisible, setHomeFilterVisible] = useState(false);
  const [selectedHomeFilterAccountId, setSelectedHomeFilterAccountId] = useState('');
  const [profileName, setProfileName] = useState('Usuario');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState('home');

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

  function getCategoriesByType(type: MovementType) {
    return type === 'income' ? incomeCategories : expenseCategories;
  }

  function handleChangeMovementAmount(value: string) {
    setMovementAmountText(sanitizeMoneyInput(value, movementAmountText));
  }

  function openMovementEditModal(movement: Movement) {
    if (movement.source !== 'manual') {
      return;
    }

    const categories = getCategoriesByType(movement.type);

    setSelectedMovement(movement);
    setMovementDescription(movement.title);
    setMovementAmountText(formatMoneyInput(movement.amount));
    setSelectedAccountId(movement.account_id);
    setSelectedCategory(movement.category_name || categories[0] || 'Otro');
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
    if (!userId || !selectedMovement) return;

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

  function handleSelectSidebarItem(item: { key: string; label: string }) {
    setSelectedSidebarItem(item.key);

    if (item.key === 'home') {
      setSidebarVisible(false);
      return;
    }

    if (item.key === 'accounts') {
      setSidebarVisible(false);
      router.push('/accounts');
      return;
    }
    
    if (item.key === 'categories') {
      setSidebarVisible(false);
      router.push('/categories');
      return;
    }

    setSidebarVisible(false);

    if (item.key === 'goals') {
      router.push('/goals');
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

  const filteredHomeMovements = selectedHomeFilterAccountId
    ? movements.filter((movement) => movement.account_id === selectedHomeFilterAccountId)
    : movements;

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
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Total</Text>
          <Text style={styles.balanceAmount}>{money(currentBalance)}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ingresos:</Text>
              <Text style={styles.incomeText}>{money(totalIncome)}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Gastos:</Text>
              <Text style={styles.expenseText}>{money(totalExpense)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.incomeButton}
            onPress={() => router.push('/income')}
          >
            <TrendingUp size={25} color="#FFFFFF" />
            <Text style={styles.actionText}>Ingreso</Text>
          </Pressable>

          <Pressable
            style={styles.expenseButton}
            onPress={() => router.push('/expense')}
          >
            <TrendingDown size={25} color="#FFFFFF" />
            <Text style={styles.actionText}>Gasto</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Movimientos recientes</Text>

          <Pressable
            style={[
              styles.filterButton,
              selectedHomeFilterAccountId && styles.filterButtonActive,
            ]}
            onPress={() => setHomeFilterVisible(true)}
          >
            <SlidersHorizontal
              size={16}
              color={selectedHomeFilterAccountId ? colors.primary : theme.colors.text}
            />

            <Text
              style={[
                styles.filterButtonText,
                selectedHomeFilterAccountId && styles.filterButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {selectedHomeFilterAccount?.name ?? 'Filtrar'}
            </Text>
          </Pressable>
        </View>

        {filteredHomeMovements.length === 0 ? (
          <Text style={styles.emptyText}>
            {selectedHomeFilterAccountId
              ? 'No hay movimientos para esta cuenta.'
              : 'Todavía no tienes movimientos registrados.'}
          </Text>
        ) : (
          filteredHomeMovements.map((movement) => {
            const isIncome = movement.type === 'income';
            const accountName = movement.account?.name ?? 'Cuenta';
            const sign = isIncome ? '+' : '-';
            
            // Obtener el icono y color de la categoría con valores por defecto
            const categoryIcon = movement.category_icon || 'Wallet';
            const categoryColor = movement.category_color || '#D9D9D9';

            return (
              <View key={movement.id} style={styles.movementCard}>
                <View style={[styles.movementIcon, { backgroundColor: categoryColor }]}>
                  {renderCategoryIcon(categoryIcon, 26, '#FFFFFF')}
                </View>

                <View style={styles.movementInfo}>
                  <Text style={styles.movementTitle}>{movement.title}</Text>
                  <Text style={styles.movementSubtitle}>
                    💼 {accountName}
                  </Text>

                  {movement.category_name && (
                    <View style={styles.movementCategoryRow}>
                      {renderCategoryIcon(categoryIcon, 14, theme.colors.textSecondary)}
                      <Text style={styles.movementSubtitle}>
                        {movement.category_name}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.movementDate}>
                    📅 {movement.movement_date}
                  </Text>
                </View>

                <View style={styles.movementRightBox}>
                  {movement.source === 'manual' && (
                    <Pressable
                      onPress={() => openMovementEditModal(movement)}
                      hitSlop={10}
                      style={styles.movementMenuButton}
                    >
                      <MoreVertical size={22} color={theme.colors.textSecondary} />
                    </Pressable>
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
          })
        )}
      </ScrollView>

      <AccountFilterModal
        visible={homeFilterVisible}
        accounts={accounts}
        selectedAccountId={selectedHomeFilterAccountId}
        title="Filtrar movimientos"
        onSelectAccount={setSelectedHomeFilterAccountId}
        onClear={() => setSelectedHomeFilterAccountId('')}
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

  const categories = isIncome ? incomeCategories : expenseCategories;

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

            {isEdit && (
              <Pressable onPress={onGoDelete} hitSlop={10}>
                <Trash2 size={27} color="#FFFFFF" />
              </Pressable>
            )}
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
                      key={category}
                      style={styles.optionItem}
                      onPress={() => onSelectCategory(category)}
                    >
                      <Text style={styles.optionText}>{category}</Text>
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
    balanceCard: {
      backgroundColor: theme.mode === 'dark' ? '#172554' : '#082B8C',
      borderRadius: 16,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 5,
      elevation: 6,
    },
    balanceLabel: {
      color: '#AFC2FF',
      fontSize: 14,
      fontWeight: '800',
    },
    balanceAmount: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '900',
      marginTop: 6,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.summaryCard,
      borderRadius: 8,
      padding: 12,
    },
    summaryLabel: {
      color: '#C7C7C7',
      fontSize: 11,
      fontWeight: '800',
    },
    incomeText: {
      marginTop: 8,
      color: colors.secondary,
      fontSize: 12,
      fontWeight: '900',
    },
    expenseText: {
      marginTop: 8,
      color: colors.expense,
      fontSize: 12,
      fontWeight: '900',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 16,
    },
    incomeButton: {
      flex: 1,
      height: 48,
      backgroundColor: colors.secondary,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    expenseButton: {
      flex: 1,
      height: 48,
      backgroundColor: colors.expense,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    actionText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 17,
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
    movementSubtitle: {
      marginTop: 6,
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    movementDate: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    movementAmount: {
      color: colors.secondary,
      fontSize: 13,
      fontWeight: '900',
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
    movementRightBox: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      minHeight: 64,
    },
    movementMenuButton: {
      padding: 2,
    },
    movementCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
  });
}