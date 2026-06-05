import {
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import { WalletCards } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppEmptyState } from '@/components/empty-state/AppEmptyState';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  AccountModalMode,
  AccountSuccessAction,
} from '@/features/accounts/accounts.types';
import { AccountCard } from '@/features/accounts/components/AccountCard';
import { AccountModal } from '@/features/accounts/components/AccountModal';
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
  money,
  updateAccountName,
} from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
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

export default function AccountsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState<AccountModalMode>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState('');
  const [initialBalanceText, setInitialBalanceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [successAction, setSuccessAction] =
    useState<AccountSuccessAction>('create');

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

  function openDeleteModal(account: Account) {
    setSelectedAccount(account);
    setAccountName(account.name);
    setInitialBalanceText('');
    setModalMode('delete');
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
      setSuccessAction('create');
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
      setSuccessAction('edit');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
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
    <PrivateScreenLayout
      title="Cuentas"
      currentKey="accounts"
    >
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

        {accounts.length === 0 ? (
          <AppEmptyState
            icon={WalletCards}
            title="Aun no tienes cuentas"
            description="Crea una cuenta para organizar tu dinero, registrar movimientos y controlar tu saldo."
            iconBackgroundColor={colors.primary}
            iconSize={38}
            minHeight={220}
            marginTop={12}
          />
        ) : (
          accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          ))
        )}
      </ScrollView>

      <FloatingActionButton
        color="#082B8C"
        onPress={openCreateModal}
      />

      <AccountModal
        mode={modalMode}
        successAction={successAction}
        accountName={accountName}
        initialBalanceText={initialBalanceText}
        saving={saving}
        onChangeAccountName={setAccountName}
        onChangeInitialBalance={handleChangeAmount}
        onClose={closeModal}
        onCreate={handleCreateAccount}
        onUpdate={handleUpdateAccount}
        onCancelDelete={closeModal}
        onDelete={handleDeleteAccount}
      />
    </PrivateScreenLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
