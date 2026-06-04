import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  ArrowLeft,
  SlidersHorizontal,
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

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { MovementCard } from '@/features/records/components/MovementCard';
import { MovementModal } from '@/features/records/components/MovementModal';
import {
  useMovementFilters,
} from '@/features/records/hooks/useMovementFilters';
import {
  useMovementFormState,
} from '@/features/records/hooks/useMovementFormState';
import {
  useMovementManagerData,
} from '@/features/records/hooks/useMovementManagerData';
import { MovementSuccessAction } from '@/features/records/records.types';
import { MovementFilterModal } from '@/features/wallet/MovementFilterModal';
import {
  createManualMovement,
  deleteManualMovement,
  registerExpenseFromGoal,
  updateManualMovement,
} from '@/features/wallet/wallet.service';
import {
  Category,
  ManualMovementType,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type MovementManagerScreenProps = {
  type: ManualMovementType;
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
  categories: Category[];

  showHeader?: boolean;
  showRegisterButton?: boolean;
  showFloatingButton?: boolean;
  contentHeader?: ReactNode;
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
  showHeader = true,
  showRegisterButton = true,
  showFloatingButton = false,
  contentHeader,
}: MovementManagerScreenProps) {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { theme } = useAppTheme();
  const styles = createStyles(theme, headerColor, buttonColor);
  const [saving, setSaving] = useState(false);
  const [openedParamEditId, setOpenedParamEditId] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<MovementSuccessAction>('create');
  const {
    userId,
    supabase,
    accounts,
    movements,
    completedGoals,
    loading,
    refreshing,
    loadData,
    handleRefresh,
  } = useMovementManagerData({
    type,
  });

  const {
    filterVisible,
    setFilterVisible,
    selectedFilterAccountId,
    setSelectedFilterAccountId,
    selectedFilterCategoryKey,
    setSelectedFilterCategoryKey,
    hasActiveFilters,
    filterButtonLabel,
    filteredMovements,
    clearFilters,
  } = useMovementFilters({
    accounts,
    categories,
    movements,
  });

  const {
    modalMode,
    setModalMode,
    selectedMovement,
    setSelectedMovement,

    description,
    setDescription,
    amountText,
    selectedAccountId,
    setSelectedAccountId,
    selectedCategory,
    setSelectedCategory,
    useSavingsGoal,

    showAccountOptions,
    setShowAccountOptions,
    showCategoryOptions,
    setShowCategoryOptions,
    showGoalOptions,
    setShowGoalOptions,

    selectedAccount,
    selectedGoal,

    handleChangeAmount,
    openCreateModal,
    openEditModal,
    closeModal,
    handleToggleSavingsGoal,
    handleSelectGoal,
    validateForm,
  } = useMovementFormState({
    type,
    accounts,
    categories,
    completedGoals,
  });

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

  function getDefaultAccountId() {
    return accounts[0]?.id ?? '';
  }

  async function handleCreateMovement() {
    if (!userId) return;

    const form = validateForm();

    if (!form) return;

    try {
      setSaving(true);

      if (form.goalId) {
        await registerExpenseFromGoal(supabase, {
          metaId: form.goalId,
          accountId: form.accountId,
          amount: form.amount,
          description: form.cleanDescription,
          categoryName: form.category,
        });
      } else {
        await createManualMovement(supabase, {
          clerkUserId: userId,
          accountId: form.accountId,
          type,
          title: form.cleanDescription,
          amount: form.amount,
          categoryName: form.category,
        });
      }

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
      {showHeader && (
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft size={31} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.topTitle}>{title}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {contentHeader}

        {showRegisterButton && (
          <Pressable
            style={styles.registerButton}
            onPress={openCreateModal}
          >
            <Text style={styles.registerButtonText}>{registerButtonText}</Text>
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{listTitle}</Text>

          <Pressable
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal
              size={16}
              color={hasActiveFilters ? colors.primary : theme.colors.text}
            />

            <Text
              style={[
                styles.filterButtonText,
                hasActiveFilters && styles.filterButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {filterButtonLabel}
            </Text>
          </Pressable>
        </View>

        {filteredMovements.length === 0 ? (
          <Text style={styles.emptyText}>
            {hasActiveFilters
              ? 'No hay movimientos con los filtros seleccionados.'
              : 'Todavía no tienes movimientos registrados.'}
          </Text>
        ) : (
          filteredMovements.map((movement) => (
            <MovementCard
              key={movement.id}
              movement={movement}
              type={type}
              onEdit={openEditModal}
              onDelete={(movementToDelete) => {
                setSelectedMovement(movementToDelete);
                setModalMode('delete');
              }}
            />
          ))
        )}
      </ScrollView>

      {showFloatingButton && (
        <FloatingActionButton
          color={buttonColor}
          onPress={openCreateModal}
        />
      )}

      <MovementFilterModal
        visible={filterVisible}
        accounts={accounts}
        categories={categories}
        selectedAccountId={selectedFilterAccountId}
        selectedCategoryKey={selectedFilterCategoryKey}
        title="Filtrar movimientos"
        onSelectAccount={setSelectedFilterAccountId}
        onSelectCategory={setSelectedFilterCategoryKey}
        onClear={clearFilters}
        onClose={() => setFilterVisible(false)}
      />

      <MovementModal
        mode={modalMode}
        type={type}
        successAction={successAction}
        registerTitle={registerTitle}
        editTitle={editTitle}
        deleteTitle={deleteTitle}
        deleteMessage={deleteMessage}
        successTitle={successTitle}
        successMessage={successMessage}
        headerColor={headerColor}
        placeholder={placeholder}
        description={description}
        amountText={amountText}
        selectedAccountName={selectedAccount?.name ?? ''}
        selectedCategory={selectedCategory}
        useSavingsGoal={useSavingsGoal}
        accountDisabled={useSavingsGoal}
        selectedGoal={selectedGoal}
        completedGoals={completedGoals}
        accounts={accounts}
        categories={categories}
        showAccountOptions={showAccountOptions}
        showCategoryOptions={showCategoryOptions}
        showGoalOptions={showGoalOptions}
        saving={saving}
        onChangeDescription={setDescription}
        onChangeAmount={handleChangeAmount}
        onToggleSavingsGoal={handleToggleSavingsGoal}
        onSelectGoal={handleSelectGoal}
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
        onToggleGoalOptions={() => setShowGoalOptions(!showGoalOptions)}
        onClose={closeModal}
        onCreate={handleCreateMovement}
        onUpdate={handleUpdateMovement}
        onGoDelete={() => setModalMode('delete')}
        onCancelDelete={closeModal}
        onDelete={handleDeleteMovement}
      />
    </View>
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
      height: 92,
      backgroundColor: headerColor,
      paddingHorizontal: 12,
      paddingTop: 42,
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
      paddingBottom: 120,
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
    sectionHeader: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
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
      borderColor: '#AEE4FF',
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
