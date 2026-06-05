import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  PlannedPaymentCard,
} from '@/features/planned-payments/components/PlannedPaymentCard';
import {
  PlannedPaymentEmptyState,
} from '@/features/planned-payments/components/PlannedPaymentEmptyState';
import {
  PlannedPaymentModal,
} from '@/features/planned-payments/components/PlannedPaymentModal';
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
  PlannedPaymentModalMode,
  PlannedPaymentSuccessAction,
} from '@/features/planned-payments/planned-payments.ui-types';
import {
  formatDateForInput,
  getTodayDate,
} from '@/features/planned-payments/planned-payments.utils';
import {
  formatMoneyInput,
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import {
  getCategoriesByType,
  getUserAccounts,
} from '@/features/wallet/wallet.service';
import {
  Account,
  Category,
} from '@/features/wallet/wallet.types';
import {
  PrivateScreenLayout,
} from '@/layouts/private-screen/PrivateScreenLayout';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useAuth } from '@clerk/expo';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function PlannedPaymentsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [payments, setPayments] = useState<PlannedPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState<PlannedPaymentModalMode>(null);
  const [successAction, setSuccessAction] =
    useState<PlannedPaymentSuccessAction>("create");
  const [selectedPayment, setSelectedPayment] = useState<PlannedPayment | null>(
    null,
  );
  const [paymentName, setPaymentName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(
    async (showFullLoader = false) => {
      if (!isLoaded) return;

      if (!isSignedIn || !userId) {
        router.replace("/sign-in");
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
            getCategoriesByType(supabase, userId, "expense"),
            getPlannedPayments(supabase, userId),
          ]);

        setAccounts(userAccounts);
        setCategories(expenseCategories);
        setPayments(plannedPayments);
      } catch (error: any) {
        Alert.alert(
          "Error",
          error?.message || "No se pudieron cargar los pagos planificados",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLoaded, isSignedIn, userId, supabase],
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData(false);
  }

  function handleChangeAmount(value: string) {
    setAmountText(sanitizeMoneyInput(value, amountText));
  }

  function handleDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) {
    setShowDatePicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setPaymentDate(formatDateForInput(selectedDate));
  }

  function openCreateModal() {
    setSelectedPayment(null);
    setPaymentName("");
    setAmountText("");
    setSelectedAccountId(accounts[0]?.id ?? "");
    setSelectedCategory(categories[0]?.name ?? "");
    setPaymentDate(getTodayDate());
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setModalMode("form");
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
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedPayment(null);
    setPaymentName("");
    setAmountText("");
    setSelectedAccountId("");
    setSelectedCategory("");
    setPaymentDate("");
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
      Alert.alert("Campo requerido", "Ingresa el nombre del pago");
      return null;
    }

    if (!isValidMoneyInput(cleanAmountText)) {
      Alert.alert(
        "Monto inválido",
        "Usa coma decimal y máximo dos decimales. Ejemplo: 120,50",
      );
      return null;
    }

    const amount = parseMoneyInput(cleanAmountText);

    if (amount <= 0) {
      Alert.alert("Monto inválido", "Ingresa un monto mayor a cero");
      return null;
    }

    if (!accountId) {
      Alert.alert("Cuenta requerida", "Selecciona una cuenta");
      return null;
    }

    if (!category) {
      Alert.alert("Categoría requerida", "Selecciona una categoría de gasto");
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Fecha inválida", "Usa el formato YYYY-MM-DD");
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

      setSuccessAction("create");
      setModalMode("success");

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo guardar el pago");
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

      setSuccessAction("edit");
      setModalMode("success");

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo actualizar el pago");
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
      Alert.alert("Error", error?.message || "No se pudo eliminar el pago");
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  const selectedCategoryData = categories.find(
    (category) => category.name === selectedCategory,
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
    <PrivateScreenLayout
      title="Pagos Planificados"
      currentKey="planned-payments"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {payments.length === 0 ? (
          <PlannedPaymentEmptyState />
        ) : (
          payments.map((payment) => {
            const category = categories.find(
              (item) => item.name === payment.category_name,
            );

            return (
              <PlannedPaymentCard
                key={payment.id}
                payment={payment}
                category={category}
                onEdit={openEditModal}
                onDelete={(paymentToDelete) => {
                  setSelectedPayment(paymentToDelete);
                  setModalMode("delete");
                }}
              />
            );
          })
        )}
      </ScrollView>

      <FloatingActionButton color="#28A9D6" onPress={openCreateModal} />

      <PlannedPaymentModal
        mode={modalMode}
        successAction={successAction}
        paymentName={paymentName}
        amountText={amountText}
        paymentDate={paymentDate}
        showDatePicker={showDatePicker}
        selectedAccountName={selectedAccount?.name ?? ""}
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
        onToggleAccountOptions={() =>
          setShowAccountOptions(!showAccountOptions)
        }
        onToggleCategoryOptions={() =>
          setShowCategoryOptions(!showCategoryOptions)
        }
        onClose={closeModal}
        onCreate={handleCreatePayment}
        onUpdate={handleUpdatePayment}
        onCancelDelete={closeModal}
        onDelete={handleDeletePayment}
      />
    </PrivateScreenLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      padding: 12,
      paddingBottom: 110,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      marginTop: 14,
      color: theme.colors.text,
      fontWeight: "800",
    },
  });
}
