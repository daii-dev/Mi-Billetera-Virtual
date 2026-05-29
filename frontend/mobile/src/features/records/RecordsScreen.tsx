import {
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import {
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
    <PrivateScreenLayout
      title="Registros"
      currentKey="records"
    >
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
    </PrivateScreenLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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