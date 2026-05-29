import {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  LogOut,
  Menu,
  TrendingDown,
  TrendingUp,
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
  View,
} from 'react-native';

import type {
  StatisticsData,
  StatisticsFilters,
  StatisticsPeriodKey,
  StatisticsMovementType,
} from '@/features/statistics/statistics.types';
import {
  getStatisticsData,
} from '@/features/statistics/statistics.service';
import { getStatisticsDateRange as getDateRange } from '@/features/statistics/statisticsPeriods';
import { DonutChart } from '@/features/statistics/components/DonutChart';
import { TrendChart } from '@/features/statistics/components/TrendChart';
import { TopCategories } from '@/features/statistics/components/TopCategories';
import { getReportAccounts } from '@/features/reports/reports.service';
import type { ReportAccount } from '@/features/reports/report.types';
import { getUserProfile } from '@/features/wallet/wallet.service';
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
import { AppButton } from '@/components/ui/AppButton';

const PERIOD_OPTIONS: Array<{
  key: StatisticsPeriodKey;
  label: string;
}> = [
  { key: 'daily', label: 'Diario' },
  { key: 'monthly', label: 'Mensual' },
  { key: 'yearly', label: 'Anual' },
];

const TYPE_OPTIONS: Array<{
  key: StatisticsMovementType;
  label: string;
}> = [
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
];

export function StatisticsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const supabase = useSupabase();
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const [profileName, setProfileName] = useState('Usuario');
  const [accounts, setAccounts] = useState<ReportAccount[]>([]);
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [filters, setFilters] = useState<StatisticsFilters>({
    period: 'monthly',
    type: 'expense',
    accountId: null,
    dateRange: getDateRange('monthly'),
  });

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey: 'statistics',
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
        const shouldOpen = gestureState.dx > 60 || gestureState.vx > 0.5;

        if (shouldOpen) {
          setSidebarVisible(true);
        }
      },
    })
  ).current;

  const loadStatistics = useCallback(async (showFullLoader = false) => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    try {
      if (showFullLoader) {
        setLoading(true);
      }

      setErrorMessage('');

      const [reportAccounts, stats, profile] = await Promise.all([
        getReportAccounts(supabase, userId),
        getStatisticsData(supabase, userId, filters),
        getUserProfile(supabase, userId),
      ]);

      const fallbackName =
        user?.fullName ||
        user?.primaryEmailAddress?.emailAddress ||
        'Usuario';

      setProfileName(profile?.full_name || fallbackName);
      setAccounts(reportAccounts);
      setStatisticsData(stats);
    } catch (error: any) {
      const message = error?.message || 'No se pudieron cargar las estadísticas';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, isLoaded, isSignedIn, supabase, user, userId]);

  useFocusEffect(
    useCallback(() => {
      loadStatistics(true);
    }, [loadStatistics])
  );

  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.key === filters.period)?.label ??
    'Período';

  const selectedTypeLabel =
    TYPE_OPTIONS.find((option) => option.key === filters.type)?.label ??
    'Tipo';

  const selectedAccountLabel =
    accounts.find((account) => account.id === filters.accountId)?.name ??
    'Todas las cuentas';

  async function handleRefresh() {
    setRefreshing(true);
    await loadStatistics(false);
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesión');
    }
  }

  function handleSelectType(type: StatisticsMovementType) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      type,
    }));
  }

  function handleSelectPeriod(period: StatisticsPeriodKey) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      period,
      dateRange: getDateRange(period),
    }));
  }

  function renderTypeButtons() {
    const isIncomeSelected = filters.type === 'income';
    const isExpenseSelected = filters.type === 'expense';

    return (
      <View style={styles.buttonGroup}>
        <Pressable
          style={[
            styles.tabButton,
            isIncomeSelected && styles.incomeTabActive,
          ]}
          onPress={() => handleSelectType('income')}
        >
          <TrendingUp
            size={22}
            color={isIncomeSelected ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              isIncomeSelected && styles.activeTabText,
            ]}
          >
            Ingresos
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tabButton,
            isExpenseSelected && styles.expenseTabActive,
          ]}
          onPress={() => handleSelectType('expense')}
        >
          <TrendingDown
            size={22}
            color={isExpenseSelected ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              isExpenseSelected && styles.activeTabText,
            ]}
          >
            Gastos
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderPeriodButtons() {
    return (
      <View style={styles.buttonGroup}>
        {PERIOD_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            style={[
              styles.periodButton,
              filters.period === option.key && styles.periodButtonActive,
            ]}
            onPress={() => handleSelectPeriod(option.key)}
          >
            <Text
              style={[
                styles.periodButtonText,
                filters.period === option.key && styles.periodButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function handleSelectAccount(accountId: string | null) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      accountId,
    }));
  }

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isSignedIn || !userId) {
    return null;
  }

  return (
    <View style={styles.container} {...openSidebarPanResponder.panHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => setSidebarVisible(true)}
          hitSlop={8}
        >
          <Menu size={28} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Estadísticas</Text>

        <Pressable
          onPress={handleLogout}
          hitSlop={8}
        >
          <LogOut size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Sidebar */}
      <Modal visible={sidebarVisible} transparent animationType="fade">
        <Pressable
          onPress={() => setSidebarVisible(false)}
          style={styles.sidebarOverlay}
        />
        <AppSidebar
          onSelectItem={handleSelectSidebarItem}
          onLogout={handleLogout}
          profileName={profileName}
        />
      </Modal>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <AppButton title="Reintentar" onPress={() => loadStatistics(true)} />
          </View>
        ) : loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : statisticsData ? (
          <>
            {/* Type & Period Filters */}
            {renderTypeButtons()}
            {renderPeriodButtons()}

            {/* Donut Chart */}
            <DonutChart data={statisticsData} theme={theme} />

            {/* Divider Line */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Trend Chart */}
            <TrendChart
              data={statisticsData}
              theme={theme}
              title={`Tendencia de ${filters.type === 'income' ? 'ingresos' : 'gastos'}`}
            />

            {/* Divider Line */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            {/* Top Categories */}
            <TopCategories data={statisticsData} theme={theme} />

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      height: 92,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 18,
      paddingTop: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '900',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: 14,
      marginVertical: 12,
    },
    tabButton: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    incomeTabActive: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    expenseTabActive: {
      backgroundColor: colors.expense,
      borderColor: colors.expense,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '900',
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    periodButton: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
    },
    divider: {
      height: 1,
      marginVertical: 12,
    },
    sidebarOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    errorContainer: {
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      marginBottom: 16,
      textAlign: 'center',
    },
    bottomSpacing: {
      height: 32,
    },
  });
}
