import {
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  LogOut,
  Menu,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
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

import {
  getPrincipalAccount,
  money,
} from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  useAuth,
  useClerk,
} from '@clerk/expo';

export default function HomeScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const supabase = useSupabase();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      const data = await getPrincipalAccount(supabase, userId);

      if (!data) {
        console.log('No existe cuenta principal para este usuario');
        router.replace('/initial-balance');
        return;
      }

      if (!data.initial_balance_configured) {
        console.log('La cuenta existe, pero no tiene saldo inicial configurado');
        router.replace('/initial-balance');
        return;
      }

      setAccount(data);
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

  if (loading && !account) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando tu billetera...</Text>
      </View>
    );
  }

  const currentBalance = Number(account?.current_balance ?? 0);
  const initialBalance = Number(account?.initial_balance ?? 0);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topTitleBox}>
          <Menu size={28} color="#FFFFFF" />
          <Text style={styles.topTitle}>Inicio</Text>
        </View>

        <Pressable onPress={handleLogout}>
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
              <Text style={styles.incomeText}>{money(initialBalance)}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Gastos:</Text>
              <Text style={styles.expenseText}>{money(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.incomeButton}
          >
            <TrendingUp size={25} color="#FFFFFF" />
            <Text style={styles.actionText}>Ingreso</Text>
          </Pressable>

          <Pressable
            style={styles.expenseButton}
          >
            <TrendingDown size={25} color="#FFFFFF" />
            <Text style={styles.actionText}>Gasto</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Movimientos recientes</Text>

        <View style={styles.movementCard}>
          <View style={styles.movementIcon}>
            <Wallet size={26} color="#FFFFFF" />
          </View>

          <View style={styles.movementInfo}>
            <Text style={styles.movementTitle}>Saldo inicial</Text>
            <Text style={styles.movementSubtitle}>💼 Cuenta principal</Text>
            <Text style={styles.movementDate}>
              📅 {new Date().toISOString().slice(0, 10)}
            </Text>
          </View>

          <Text style={styles.movementAmount}>+{money(initialBalance)}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    height: 80,
    backgroundColor: colors.primary,
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
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: colors.primary,
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
    backgroundColor: '#40388E',
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
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 18,
    color: colors.primary,
    fontWeight: '900',
  },
  movementCard: {
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  movementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  movementTitle: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  movementSubtitle: {
    marginTop: 6,
    color: '#666666',
    fontSize: 13,
  },
  movementDate: {
    marginTop: 4,
    color: '#8B8B8B',
    fontSize: 12,
  },
  movementAmount: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '900',
  },
  note: {
    marginTop: 24,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: colors.primary,
    fontWeight: '800',
  },
});