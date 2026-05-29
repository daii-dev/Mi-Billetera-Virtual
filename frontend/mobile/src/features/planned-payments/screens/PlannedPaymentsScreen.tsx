import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  Pencil,
  Trash2,
  Wallet,
  WalletCards,
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

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  createPlannedPayment,
  deletePlannedPayment,
  getPlannedPayments,
  processDuePlannedPayments,
  updatePlannedPayment,
} from '@/features/planned-payments/planned-payments.service';
import {
  PlannedPayment,
} from '@/features/planned-payments/planned-payments.types';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import { renderCategoryIcon } from '@/features/wallet/category.utils';
import {
  getCategoriesByType,
  getUserAccounts,
  money,
} from '@/features/wallet/wallet.service';
import {
  Account,
  Category,
} from '@/features/wallet/wallet.types';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { AppSidebar } from '@/layouts/sidebar/AppSidebar';
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
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

type ModalMode = 'form' | 'edit' | 'delete' | 'success' | null;
type SuccessAction = 'create' | 'edit';

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateFromInput(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export default function PlannedPaymentsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const supabase = useSupabase();

  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const [payments, setPayments] = useState<PlannedPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [profileName, setProfileName] = useState(
    user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Usuario'
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [successAction, setSuccessAction] = useState<SuccessAction>('create');
  const [selectedPayment, setSelectedPayment] = useState<PlannedPayment | null>(null);

  const [paymentName, setPaymentName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey: 'planned-payments',
    onClose: () => setSidebarVisible(false),
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

  const loadData = useCallback(async (showFullLoader = false) => {
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

      const [userAccounts, expenseCategories, plannedPayments] =
        await Promise.all([
          getUserAccounts(supabase, userId),
          getCategoriesByType(supabase, userId, 'expense'),
          getPlannedPayments(supabase, userId),
        ]);

      setAccounts(userAccounts);
      setCategories(expenseCategories);
      setPayments(plannedPayments);

      setProfileName(
        user?.fullName ||
        user?.primaryEmailAddress?.emailAddress ||
        'Usuario'
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudieron cargar los pagos planificados'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoaded, isSignedIn, userId, supabase, user]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData(false);
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesión');
    }
  }

  function getTodayDate() {
    return formatDateForInput(new Date());
  }

  function handleChangeAmount(value: string) {
    setAmountText(sanitizeMoneyInput(value, amountText));
  }

  function handleDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    setShowDatePicker(false);

    if (event.type === 'dismissed' || !selectedDate) {
        return;
    }

    setPaymentDate(formatDateForInput(selectedDate));
  }

  function openCreateModal() {
    setSelectedPayment(null);
    setPaymentName('');
    setAmountText('');
    setSelectedAccountId(accounts[0]?.id ?? '');
    setSelectedCategory(categories[0]?.name ?? '');
    setPaymentDate(getTodayDate());
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setModalMode('form');
  }

  function openEditModal(payment: PlannedPayment) {
    setSelectedPayment(payment);
    setPaymentName(payment.name);
    setAmountText(formatMoneyInput(payment.amount));
    setSelectedAccountId(payment.account_id);
    setSelectedCategory(payment.category_name);
    setPaymentDate(payment.next_payment_date);
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedPayment(null);
    setPaymentName('');
    setAmountText('');
    setSelectedAccountId('');
    setSelectedCategory('');
    setPaymentDate('');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setShowDatePicker(false);
    setSaving(false);
  }

  function validateForm(): {
    cleanName: string;
    amount: number;
    accountId: string;
    category: string;
    date: string;
  } | null {
    const cleanName = paymentName.trim();
    const cleanAmountText = amountText.trim();
    const accountId = selectedAccountId;
    const category = selectedCategory.trim();
    const date = paymentDate.trim();

    if (!cleanName) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del pago');
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
      Alert.alert('Categoría requerida', 'Selecciona una categoría de gasto');
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DD');
      return null;
    }

    return {
      cleanName,
      amount,
      accountId,
      category,
      date,
    };
  }

  async function handleCreatePayment() {
    if (!userId) return;

    const form = validateForm();
    if (!form) return;

    try {
      setSaving(true);

      await createPlannedPayment(supabase, {
        clerkUserId: userId,
        accountId: form.accountId,
        name: form.cleanName,
        amount: form.amount,
        categoryName: form.category,
        nextPaymentDate: form.date,
      });

      await loadData(false);

      setSuccessAction('create');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo guardar el pago');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePayment() {
    if (!userId || !selectedPayment) return;

    const form = validateForm();
    if (!form) return;

    try {
      setSaving(true);

      await updatePlannedPayment(supabase, selectedPayment.id, {
        clerkUserId: userId,
        accountId: form.accountId,
        name: form.cleanName,
        amount: form.amount,
        categoryName: form.category,
        nextPaymentDate: form.date,
      });

      await loadData(false);

      setSuccessAction('edit');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo actualizar el pago');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment() {
    if (!userId || !selectedPayment) return;

    try {
      setSaving(true);

      await deletePlannedPayment(supabase, selectedPayment.id, userId);

      await loadData(false);
      closeModal();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo eliminar el pago');
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const selectedCategoryData = categories.find(
    (category) => category.name === selectedCategory
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando pagos planificados...</Text>
      </View>
    );
  }

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

          <Text style={styles.topTitle}>Pagos Planificados</Text>
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
        {payments.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <CalendarClock size={42} color="#FFFFFF" />
            </View>

            <Text style={styles.emptyTitle}>
              Aun no tienes pagos planificados
            </Text>

            <Text style={styles.emptyDescription}>
              Programa tu gasto con nombre, monto y fecha de pago.
            </Text>
          </View>
        ) : (
          payments.map((payment) => {
            const category = categories.find(
              (item) => item.name === payment.category_name
            );

            return (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{payment.name}</Text>

                  <View style={styles.paymentDetailRow}>
                    <WalletCards size={15} color={theme.colors.textSecondary} />
                    <Text style={styles.paymentSubtitle}>
                        Cuenta: {payment.account?.name ?? 'Cuenta'}
                    </Text>
                  </View>

                  <View style={styles.paymentDetailRow}>
                    {category
                        ? renderCategoryIcon(category.icon, 15, category.color)
                        : <CalendarClock size={15} color={theme.colors.textSecondary} />}

                    <Text style={styles.paymentSubtitle}>
                        Categoría: {payment.category_name}
                    </Text>
                  </View>

                  <View style={styles.paymentDetailRow}>
                    <CalendarClock size={15} color={theme.colors.textSecondary} />
                    <Text style={styles.paymentDate}>
                        Fecha de pago: {payment.next_payment_date}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentRight}>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => openEditModal(payment)}
                      hitSlop={10}
                      style={styles.iconButton}
                    >
                      <Pencil size={18} color={theme.colors.primary} />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setSelectedPayment(payment);
                        setModalMode('delete');
                      }}
                      hitSlop={10}
                      style={styles.iconButton}
                    >
                      <Trash2 size={18} color={colors.expense} />
                    </Pressable>
                  </View>

                  <Text style={styles.paymentAmount}>
                    -{money(payment.amount)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <FloatingActionButton
        color="#28A9D6"
        onPress={openCreateModal}
      />

      <PlannedPaymentModal
        mode={modalMode}
        successAction={successAction}
        styles={styles}
        paymentName={paymentName}
        amountText={amountText}
        paymentDate={paymentDate}
        showDatePicker={showDatePicker}
        selectedAccountName={selectedAccount?.name ?? ''}
        selectedCategory={selectedCategory}
        selectedCategoryData={selectedCategoryData ?? null}
        accounts={accounts}
        categories={categories}
        showAccountOptions={showAccountOptions}
        showCategoryOptions={showCategoryOptions}
        saving={saving}
        onChangeName={setPaymentName}
        onChangeAmount={handleChangeAmount}
        onOpenDatePicker={() => setShowDatePicker(true)}
        onDatePickerChange={handleDatePickerChange}
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
        onClose={closeModal}
        onCreate={handleCreatePayment}
        onUpdate={handleUpdatePayment}
        onGoDelete={() => setModalMode('delete')}
        onCancelDelete={closeModal}
        onDelete={handleDeletePayment}
      />

      <AppSidebar
        visible={sidebarVisible}
        userName={profileName}
        selectedKey="planned-payments"
        visualMode={isDarkMode}
        onToggleVisualMode={setDarkMode}
        onClose={() => setSidebarVisible(false)}
        onSelectItem={handleSelectSidebarItem}
      />
    </View>
  );
}

type PlannedPaymentModalProps = {
  mode: ModalMode;
  successAction: SuccessAction;
  styles: ReturnType<typeof createStyles>;
  paymentName: string;
  amountText: string;
  paymentDate: string;
  showDatePicker: boolean;
  selectedAccountName: string;
  selectedCategory: string;
  selectedCategoryData: Category | null;
  accounts: Account[];
  categories: Category[];
  showAccountOptions: boolean;
  showCategoryOptions: boolean;
  saving: boolean;
  onChangeName: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onOpenDatePicker: () => void;
  onDatePickerChange: (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => void;
  onSelectAccount: (accountId: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleAccountOptions: () => void;
  onToggleCategoryOptions: () => void;
  onClose: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  onGoDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

function PlannedPaymentModal({
  mode,
  successAction,
  styles,
  paymentName,
  amountText,
  paymentDate,
  showDatePicker,
  selectedAccountName,
  selectedCategory,
  selectedCategoryData,
  accounts,
  categories,
  showAccountOptions,
  showCategoryOptions,
  saving,
  onChangeName,
  onChangeAmount,
  onOpenDatePicker,
  onDatePickerChange,
  onSelectAccount,
  onSelectCategory,
  onToggleAccountOptions,
  onToggleCategoryOptions,
  onClose,
  onCreate,
  onUpdate,
  onGoDelete,
  onCancelDelete,
  onDelete,
}: PlannedPaymentModalProps) {
  if (!mode) return null;

  const isCreate = mode === 'form';
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';
  const isSuccess = mode === 'success';

  const successTitle = successAction === 'edit'
    ? 'Editar Pago'
    : 'Nuevo Pago';

  const successMessage = successAction === 'edit'
    ? 'Pago editado correctamente'
    : 'Pago guardado correctamente';

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
              {isCreate
                ? 'Nuevo Pago'
                : isEdit
                  ? 'Editar Pago'
                  : isDelete
                    ? 'Eliminar Pago Planificado'
                    : successTitle}
            </Text>
          </View>

          {(isCreate || isEdit) && (
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nombre Pago</Text>
              <TextInput
                value={paymentName}
                onChangeText={onChangeName}
                placeholder="Ej. Spotify"
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
                    {selectedAccountName || 'Selecciona una cuenta'}
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
                  {selectedCategoryData
                    ? renderCategoryIcon(
                        selectedCategoryData.icon,
                        20,
                        selectedCategoryData.color
                        )
                    : <Text style={styles.categoryFallbackIcon}>♟</Text>}

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
                        {renderCategoryIcon(category.icon, 18, category.color)}
                        <Text style={styles.optionText}>{category.name}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Fecha programada</Text>

              <Pressable
                style={styles.dateInputBox}
                onPress={onOpenDatePicker}
              >
                <Text
                    style={[
                        styles.dateText,
                        !paymentDate && styles.datePlaceholder,
                    ]}
                >
                    {paymentDate || 'Selecciona una fecha'}
                </Text>

                <CalendarDays size={21} color="#6B7280" />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                    value={getDateFromInput(paymentDate)}
                    mode="date"
                    display="calendar"
                    minimumDate={new Date()}
                    onChange={onDatePickerChange}
                />
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
                  onPress={isEdit ? onUpdate : onCreate}
                  disabled={saving}
                >
                  <Text style={styles.modalButtonText}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {isDelete && (
            <View style={styles.deleteContent}>
              <Text style={styles.deleteText}>
                ¿Estas seguro que quieres eliminar este pago planificado?
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

          {isSuccess && (
            <View style={styles.successContent}>
              <Text style={styles.successText}>
                ♡ {successMessage}
              </Text>
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
      height: 94,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 14,
      paddingTop: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topTitleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    topTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },
    content: {
      padding: 12,
      paddingBottom: 110,
    },
    emptyCard: {
      marginTop: 24,
      minHeight: 185,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 26,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    emptyIconBox: {
      width: 58,
      height: 58,
      borderRadius: 30,
      backgroundColor: '#28A9D6',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 18,
    },
    emptyDescription: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 20,
    },
    paymentCard: {
      minHeight: 100,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 12,
      flexDirection: 'row',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    paymentInfo: {
      flex: 1,
    },
    paymentTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
      marginBottom: 7,
    },
    paymentSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    paymentDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    paymentDate: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    paymentRight: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginLeft: 8,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 4,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
    },
    paymentAmount: {
      color: '#28A9D6',
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
      minHeight: 54,
      backgroundColor: colors.primary,
      paddingHorizontal: 22,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
      flex: 1,
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
      height: 42,
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
      height: 42,
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
      height: 42,
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
    categoryFallbackIcon: {
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
      maxHeight: 150,
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
    dateInputBox: {
      height: 42,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    dateText: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 15,
    },
    datePlaceholder: {
        color: '#A8A8A8',
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
