import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  LogOut,
  Menu,
  MoreVertical,
  Plus,
  Trash2,
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
import {
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import {
  createAccount,
  deleteAccount,
  getAccountsTotal,
  getUserAccounts,
  getUserProfile,
  money,
  updateAccountName,
} from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
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

type AccountModalMode = 'create' | 'success' | 'edit' | 'delete' | null;

export default function AccountsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const supabase = useSupabase();

  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profileName, setProfileName] = useState('Usuario');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<SidebarRouteKey>('accounts');

  const [modalMode, setModalMode] = useState<AccountModalMode>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [accountName, setAccountName] = useState('');
  const [initialBalanceText, setInitialBalanceText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey: 'accounts',
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

  async function loadAccounts(showFullLoader = false) {
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
      const profile = await getUserProfile(supabase, userId);

      const fallbackName =
        user?.fullName ||
        user?.primaryEmailAddress?.emailAddress ||
        'Usuario';

      setProfileName(profile?.full_name || fallbackName);
      setAccounts(userAccounts);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudieron cargar las cuentas'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isLoaded) {
      loadAccounts(true);
    }
  }, [isLoaded, isSignedIn, userId]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAccounts(false);
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesión');
    }
  }

  function openCreateModal() {
    setAccountName('');
    setInitialBalanceText('');
    setSelectedAccount(null);
    setModalMode('create');
  }

  function openEditModal(account: Account) {
    setSelectedAccount(account);
    setAccountName(account.name);
    setInitialBalanceText('');
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedAccount(null);
    setAccountName('');
    setInitialBalanceText('');
    setSaving(false);
  }

  function handleChangeAmount(value: string) {
    setInitialBalanceText(sanitizeMoneyInput(value, initialBalanceText));
  }

  async function handleCreateAccount() {
    if (!userId) return;

    const cleanName = accountName.trim();
    const cleanInitialBalanceText = initialBalanceText.trim() || '0';

    if (!cleanName) {
      Alert.alert('Campo requerido', 'Ingresa el nombre de la cuenta');
      return;
    }

    if (!isValidMoneyInput(cleanInitialBalanceText)) {
        Alert.alert(
            'Monto inválido',
            'Usa coma decimal y máximo dos decimales. Ejemplo: 120,50'
        );
        return;
    }

    const initialBalance = parseMoneyInput(cleanInitialBalanceText);

    if (initialBalance < 0) {
    Alert.alert('Monto inválido', 'El saldo inicial no puede ser negativo');
    return;
    }

    const duplicatedName = accounts.some(
      (account) => account.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicatedName) {
      Alert.alert(
        'Cuenta duplicada',
        'Ya existe una cuenta con ese nombre'
      );
      return;
    }

    try {
      setSaving(true);

      await createAccount(
        supabase,
        userId,
        cleanName,
        initialBalance
      );

      await loadAccounts(false);

      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo crear la cuenta'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateAccount() {
    if (!selectedAccount) return;

    const cleanName = accountName.trim();

    if (!cleanName) {
      Alert.alert('Campo requerido', 'Ingresa el nombre de la cuenta');
      return;
    }

    const duplicatedName = accounts.some(
      (account) =>
        account.id !== selectedAccount.id &&
        account.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicatedName) {
      Alert.alert(
        'Cuenta duplicada',
        'Ya existe otra cuenta con ese nombre'
      );
      return;
    }

    try {
      setSaving(true);

      await updateAccountName(
        supabase,
        selectedAccount.id,
        cleanName
      );

      await loadAccounts(false);
      closeModal();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo editar la cuenta'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!selectedAccount) return;

    try {
      setSaving(true);

      await deleteAccount(supabase, selectedAccount.id);

      await loadAccounts(false);
      closeModal();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo eliminar la cuenta'
      );
    } finally {
      setSaving(false);
    }
  }

  const balanceTotal = getAccountsTotal(accounts);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando tus cuentas...</Text>
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

          <Text style={styles.topTitle}>Cuentas</Text>
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
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Balance Total</Text>
            <Text style={styles.accountsCount}>
              {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
            </Text>
          </View>

          <Text style={styles.balanceAmount}>{money(balanceTotal)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tus cuentas</Text>

        {accounts.map((account) => (
          <View key={account.id} style={styles.accountCard}>
            <View style={styles.accountIcon}>
              <Wallet size={24} color="#FFFFFF" />
            </View>

            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountBalance}>
                {money(account.current_balance)}
              </Text>
            </View>

            <Pressable
              onPress={() => openEditModal(account)}
              hitSlop={10}
              style={styles.moreButton}
            >
              <MoreVertical size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={styles.floatingButton}
        onPress={openCreateModal}
      >
        <Plus size={32} color="#FFFFFF" />
      </Pressable>

      <AccountModal
        mode={modalMode}
        styles={styles}
        accountName={accountName}
        initialBalanceText={initialBalanceText}
        saving={saving}
        onChangeAccountName={setAccountName}
        onChangeInitialBalance={handleChangeAmount}
        onClose={closeModal}
        onCreate={handleCreateAccount}
        onUpdate={handleUpdateAccount}
        onGoDelete={() => setModalMode('delete')}
        onCancelDelete={closeModal}
        onDelete={handleDeleteAccount}
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

type AccountModalProps = {
  mode: AccountModalMode;
  styles: ReturnType<typeof createStyles>;
  accountName: string;
  initialBalanceText: string;
  saving: boolean;
  onChangeAccountName: (value: string) => void;
  onChangeInitialBalance: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  onGoDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

function AccountModal({
  mode,
  styles,
  accountName,
  initialBalanceText,
  saving,
  onChangeAccountName,
  onChangeInitialBalance,
  onClose,
  onCreate,
  onUpdate,
  onGoDelete,
  onCancelDelete,
  onDelete,
}: AccountModalProps) {
  if (!mode) {
    return null;
  }

  const isCreate = mode === 'create';
  const isSuccess = mode === 'success';
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';

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
              {isCreate || isSuccess
                ? 'Nueva Cuenta'
                : isEdit
                  ? 'Editar Cuenta'
                  : 'Eliminar Cuenta'}
            </Text>

            {isEdit && (
              <Pressable onPress={onGoDelete} hitSlop={10}>
                <Trash2 size={27} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {isCreate && (
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nombre de la cuenta</Text>
              <TextInput
                value={accountName}
                onChangeText={onChangeAccountName}
                placeholder="Ej. Emprendimiento"
                placeholderTextColor="#A8A8A8"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Saldo inicial</Text>
              <View style={styles.amountInputBox}>
                <Text style={styles.amountPrefix}>Bs.</Text>
                <TextInput
                  value={initialBalanceText}
                  onChangeText={onChangeInitialBalance}
                  placeholder="0,00"
                  placeholderTextColor="#A8A8A8"
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                />
              </View>

              <View style={styles.modalButtonsRow}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.createButton]}
                  onPress={onCreate}
                  disabled={saving}
                >
                  <Text style={styles.modalButtonText}>
                    {saving ? 'Guardando...' : 'Crear'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {isSuccess && (
            <View style={styles.successContent}>
              <Text style={styles.successText}>
                ♡ Cuenta guardada correctamente
              </Text>
            </View>
          )}

          {isEdit && (
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nombre de la cuenta</Text>
              <TextInput
                value={accountName}
                onChangeText={onChangeAccountName}
                placeholder="Nombre de la cuenta"
                placeholderTextColor="#A8A8A8"
                style={styles.input}
              />

              <View style={styles.modalButtonsRow}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.createButton]}
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

          {isDelete && (
            <View style={styles.deleteContent}>
              <Text style={styles.deleteText}>
                ¿Estas seguro que quieres eliminar la cuenta con todos sus registros y objetos relacionados?
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
      height: 80,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 18,
      paddingTop: 32,
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
      padding: 14,
      paddingBottom: 120,
    },
    balanceCard: {
      backgroundColor: theme.mode === 'dark' ? '#172554' : '#082B8C',
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 20,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 5,
      elevation: 6,
    },
    balanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceLabel: {
      color: '#C7D2FE',
      fontSize: 14,
      fontWeight: '900',
    },
    accountsCount: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    balanceAmount: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '900',
      marginTop: 8,
    },
    sectionTitle: {
      marginTop: 24,
      marginBottom: 10,
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    accountCard: {
      minHeight: 66,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    accountIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: '#D9D9D9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountInfo: {
      flex: 1,
      marginLeft: 14,
    },
    accountName: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    accountBalance: {
      marginTop: 6,
      color: theme.colors.textSecondary,
      fontSize: 15,
      fontWeight: '900',
    },
    moreButton: {
      padding: 4,
    },
    floatingButton: {
      position: 'absolute',
      right: 28,
      bottom: 74,
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 4,
      elevation: 5,
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
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '900',
    },
    modalContent: {
      paddingHorizontal: 28,
      paddingTop: 20,
      paddingBottom: 18,
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 6,
    },
    input: {
      height: 46,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      fontSize: 16,
      marginBottom: 12,
    },
    amountInputBox: {
      height: 46,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginBottom: 18,
    },
    amountPrefix: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '900',
      marginRight: 12,
    },
    amountInput: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
      marginTop: 4,
    },
    modalButton: {
      width: 108,
      height: 42,
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
    createButton: {
      backgroundColor: colors.secondary,
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 14,
    },
    successContent: {
      paddingHorizontal: 22,
      paddingVertical: 26,
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
