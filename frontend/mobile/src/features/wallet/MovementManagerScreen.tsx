import {
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  MoreVertical,
  PiggyBank,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createManualMovement,
  deleteManualMovement,
  getMovementsByType,
  getUserAccounts,
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

type ModalMode = 'form' | 'edit' | 'delete' | 'success' | null;

type MovementManagerScreenProps = {
  type: MovementType;
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
  categories: string[];
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
}: MovementManagerScreenProps) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const supabase = useSupabase();

  const { theme } = useAppTheme();
  const styles = createStyles(theme, headerColor, buttonColor);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

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

      const userAccounts = await getUserAccounts(supabase, userId);
      const userMovements = await getMovementsByType(supabase, userId, type);

      setAccounts(userAccounts);
      setMovements(userMovements);
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

  function normalizeAmount(value: string): number {
    const normalized = value.replace(',', '.').trim();
    return Number(normalized || 0);
  }

  function handleChangeAmount(value: string) {
    const clean = value.replace(/[^0-9.,]/g, '');
    setAmountText(clean);
  }

  function getDefaultAccountId() {
    return accounts[0]?.id ?? '';
  }

  function getDefaultCategory() {
    return categories[0] ?? 'Otro';
  }

  function openCreateModal() {
    setSelectedMovement(null);
    setDescription('');
    setAmountText('');
    setSelectedAccountId(getDefaultAccountId());
    setSelectedCategory(getDefaultCategory());
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setModalMode('form');
  }

  function openEditModal(movement: Movement) {
    if (movement.source !== 'manual') {
      return;
    }

    setSelectedMovement(movement);
    setDescription(movement.title);
    setAmountText(String(movement.amount));
    setSelectedAccountId(movement.account_id);
    setSelectedCategory(movement.category_name || getDefaultCategory());
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedMovement(null);
    setDescription('');
    setAmountText('');
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setSaving(false);
  }

  function validateForm(): {
    cleanDescription: string;
    amount: number;
    accountId: string;
    category: string;
  } | null {
    const cleanDescription = description.trim();
    const amount = normalizeAmount(amountText);
    const accountId = selectedAccountId;
    const category = selectedCategory.trim();

    if (!cleanDescription) {
      Alert.alert('Campo requerido', 'Ingresa una descripción');
      return null;
    }

    if (Number.isNaN(amount) || amount <= 0) {
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

  async function handleCreateMovement() {
    if (!userId) return;

    const form = validateForm();

    if (!form) return;

    try {
      setSaving(true);

      await createManualMovement(supabase, {
        clerkUserId: userId,
        accountId: form.accountId,
        type,
        title: form.cleanDescription,
        amount: form.amount,
        categoryName: form.category,
      });

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

  const isIncome = type === 'income';
  const amountSign = isIncome ? '+' : '-';

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
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={31} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.topTitle}>{title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Pressable
          style={styles.registerButton}
          onPress={openCreateModal}
        >
          <Text style={styles.registerButtonText}>{registerButtonText}</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>{listTitle}</Text>

        {movements.length === 0 ? (
          <Text style={styles.emptyText}>
            Todavía no tienes movimientos registrados.
          </Text>
        ) : (
          movements.map((movement) => {
            const accountName = movement.account?.name ?? 'Cuenta';
            const canEdit = movement.source === 'manual';

            return (
              <View key={movement.id} style={styles.movementCard}>
                <View style={styles.movementIcon}>
                  <Wallet size={25} color="#FFFFFF" />
                </View>

                <View style={styles.movementInfo}>
                  <Text style={styles.movementTitle}>
                    {movement.title}
                  </Text>

                  <Text style={styles.movementSubtitle}>
                    💼 {accountName}
                  </Text>

                  {movement.category_name && (
                    <Text style={styles.movementSubtitle}>
                      ♟ {movement.category_name}
                    </Text>
                  )}

                  <Text style={styles.movementDate}>
                    📅 {movement.movement_date}
                  </Text>
                </View>

                <View style={styles.amountBox}>
                  {canEdit && (
                    <Pressable
                      onPress={() => openEditModal(movement)}
                      hitSlop={10}
                      style={styles.moreButton}
                    >
                      <MoreVertical size={23} color={theme.colors.textSecondary} />
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
                    {amountSign}{money(movement.amount)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <MovementModal
        mode={modalMode}
        styles={styles}
        type={type}
        successAction={successAction}
        registerTitle={registerTitle}
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
        accounts={accounts}
        categories={categories}
        showAccountOptions={showAccountOptions}
        showCategoryOptions={showCategoryOptions}
        saving={saving}
        onChangeDescription={setDescription}
        onChangeAmount={handleChangeAmount}
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
        onCreate={handleCreateMovement}
        onUpdate={handleUpdateMovement}
        onGoDelete={() => setModalMode('delete')}
        onCancelDelete={() => setModalMode('edit')}
        onDelete={handleDeleteMovement}
      />
    </View>
  );
}

type MovementModalProps = {
  mode: ModalMode;
  styles: ReturnType<typeof createStyles>;
  type: MovementType;
  successAction: 'create' | 'edit';
  registerTitle: string;
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
  accounts: Account[];
  categories: string[];
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
  accounts,
  categories,
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
          <View style={styles.registerPageContent}>
            <Text style={styles.registerPageTitle}>{registerTitle}</Text>

            <View style={styles.pigBox}>
              <PiggyBank size={90} color={colors.secondary} strokeWidth={2.6} />
            </View>

            <View style={styles.formCard}>
              <MovementForm
                styles={styles}
                placeholder={placeholder}
                description={description}
                amountText={amountText}
                selectedAccountName={selectedAccountName}
                selectedCategory={selectedCategory}
                accounts={accounts}
                categories={categories}
                showAccountOptions={showAccountOptions}
                showCategoryOptions={showCategoryOptions}
                saving={saving}
                onChangeDescription={onChangeDescription}
                onChangeAmount={onChangeAmount}
                onSelectAccount={onSelectAccount}
                onSelectCategory={onSelectCategory}
                onToggleAccountOptions={onToggleAccountOptions}
                onToggleCategoryOptions={onToggleCategoryOptions}
                onClose={onClose}
                onSave={onCreate}
                saveText="Guardar"
              />
            </View>
          </View>
        ) : (
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit ? editTitle : isDelete ? deleteTitle : finalSuccessTitle}
              </Text>

              {isEdit && (
                <Pressable onPress={onGoDelete} hitSlop={10}>
                  <Trash2 size={27} color="#FFFFFF" />
                </Pressable>
              )}
            </View>

            {isEdit && (
              <View style={styles.modalContent}>
                <MovementForm
                  styles={styles}
                  placeholder={placeholder}
                  description={description}
                  amountText={amountText}
                  selectedAccountName={selectedAccountName}
                  selectedCategory={selectedCategory}
                  accounts={accounts}
                  categories={categories}
                  showAccountOptions={showAccountOptions}
                  showCategoryOptions={showCategoryOptions}
                  saving={saving}
                  onChangeDescription={onChangeDescription}
                  onChangeAmount={onChangeAmount}
                  onSelectAccount={onSelectAccount}
                  onSelectCategory={onSelectCategory}
                  onToggleAccountOptions={onToggleAccountOptions}
                  onToggleCategoryOptions={onToggleCategoryOptions}
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

type MovementFormProps = {
  styles: ReturnType<typeof createStyles>;
  placeholder: string;
  description: string;
  amountText: string;
  selectedAccountName: string;
  selectedCategory: string;
  accounts: Account[];
  categories: string[];
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
  onSave: () => void;
  saveText: string;
};

function MovementForm({
  styles,
  placeholder,
  description,
  amountText,
  selectedAccountName,
  selectedCategory,
  accounts,
  categories,
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
  onSave,
  saveText,
}: MovementFormProps) {
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
          placeholder="0.00"
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
      height: 70,
      backgroundColor: headerColor,
      paddingHorizontal: 12,
      paddingTop: 25,
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
      paddingBottom: 80,
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
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 12,
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
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    movementIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: '#D9D9D9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementInfo: {
      flex: 1,
      marginLeft: 14,
    },
    movementTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    movementSubtitle: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    movementDate: {
      marginTop: 3,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    amountBox: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      minHeight: 64,
    },
    moreButton: {
      padding: 2,
    },
    movementAmount: {
      fontSize: 12,
      fontWeight: '900',
    },
    fullFormPage: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    registerPageContent: {
      flex: 1,
      alignItems: 'center',
    },
    registerPageTitle: {
      width: '100%',
      height: 70,
      paddingTop: 28,
      backgroundColor: headerColor,
      color: '#FFFFFF',
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '900',
    },
    pigBox: {
      width: 130,
      height: 110,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 4,
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
      color: colors.primary,
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