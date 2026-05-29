import {
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  LogOut,
  Menu,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MovementManagerScreen } from '@/features/wallet/MovementManagerScreen';
import { getCategoriesByType } from '@/features/wallet/wallet.service';
import {
  Category,
  ManualMovementType,
} from '@/features/wallet/wallet.types';
import { useProfileName } from '@/hooks/useProfileName';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { useSidebarSwipe } from '@/hooks/useSidebarSwipe';
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

const recordsConfig = {
  income: {
    listTitle: 'Ingresos recientes',
    registerButtonText: 'Registrar ingreso',
    registerTitle: 'Registrar Ingreso',
    editTitle: 'Editar Ingreso',
    deleteTitle: 'Eliminar Ingreso',
    deleteMessage: '¿Estas seguro que quieres eliminar este ingreso?',
    successTitle: 'Nuevo Ingreso',
    successMessage: 'Ingreso guardado correctamente',
    headerColor: '#058A32',
    buttonColor: colors.secondary,
    placeholder: 'Ej. Sueldo',
  },
  expense: {
    listTitle: 'Gastos recientes',
    registerButtonText: 'Registrar gasto',
    registerTitle: 'Registrar Gasto',
    editTitle: 'Editar Gasto',
    deleteTitle: 'Eliminar gasto',
    deleteMessage: '¿Estas seguro que quieres eliminar este gasto?',
    successTitle: 'Nuevo Gasto',
    successMessage: 'Gasto guardado correctamente',
    headerColor: '#9B241B',
    buttonColor: colors.expense,
    placeholder: 'Ej. Compra de víveres',
  },
};

export default function RecordsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const supabase = useSupabase();
  const params = useLocalSearchParams<{ type?: string }>();

  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const [selectedType, setSelectedType] = useState<ManualMovementType>('income');
  useEffect(() => {
    if (params.type === 'income' || params.type === 'expense') {
        setSelectedType(params.type);
    }
  }, [params.type]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { profileName } = useProfileName();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] =
    useState<SidebarRouteKey>('records');

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey: 'records',
    onClose: () => setSidebarVisible(false),
    onSelectedKeyChange: setSelectedSidebarItem,
  });

  const sidebarSwipeHandlers = useSidebarSwipe({
    onOpen: () => setSidebarVisible(true),
  });

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    async function loadCategories() {
      if (!userId) return;

      try {
        const data = await getCategoriesByType(
          supabase,
          userId,
          selectedType
        );

        setCategories(data);
      } catch (error) {
        console.log('ERROR RECORDS CATEGORIES:', error);
        setCategories([]);
      }
    }

    loadCategories();
  }, [supabase, userId, selectedType]);

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesión');
    }
  }

  function renderTabs() {
    const isIncomeSelected = selectedType === 'income';
    const isExpenseSelected = selectedType === 'expense';

    return (
      <View style={styles.tabsRow}>
        <Pressable
          style={[
            styles.tabButton,
            isIncomeSelected && styles.incomeTabActive,
          ]}
          onPress={() => setSelectedType('income')}
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
          onPress={() => setSelectedType('expense')}
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

  const currentConfig = recordsConfig[selectedType];

  return (
    <View
      style={styles.container}
      {...sidebarSwipeHandlers}
    >
      <View style={styles.topBar}>
        <View style={styles.topTitleBox}>
          <Pressable
            onPress={() => setSidebarVisible(true)}
            hitSlop={10}
          >
            <Menu size={28} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.topTitle}>Registros</Text>
        </View>

        <Pressable onPress={handleLogout} hitSlop={10}>
          <LogOut size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      <MovementManagerScreen
        key={selectedType}
        type={selectedType}
        title="Registros"
        listTitle={currentConfig.listTitle}
        registerButtonText={currentConfig.registerButtonText}
        registerTitle={currentConfig.registerTitle}
        editTitle={currentConfig.editTitle}
        deleteTitle={currentConfig.deleteTitle}
        deleteMessage={currentConfig.deleteMessage}
        successTitle={currentConfig.successTitle}
        successMessage={currentConfig.successMessage}
        headerColor={currentConfig.headerColor}
        buttonColor={currentConfig.buttonColor}
        placeholder={currentConfig.placeholder}
        categories={categories}
        showHeader={false}
        showRegisterButton={false}
        showFloatingButton
        contentHeader={renderTabs()}
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
    tabsRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 8,
      marginBottom: 22,
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
  });
}