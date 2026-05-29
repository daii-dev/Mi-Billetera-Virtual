import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import { MovementForm } from '@/features/wallet/components/MovementForm';
import {
  Account,
  Category,
  ManualMovementType,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

export type ModalMode = 'form' | 'edit' | 'delete' | 'success' | null;

const MODAL_HEADER_COLOR = '#082B8C';
const SAVE_BUTTON_COLOR = colors.secondary;

const registerPigImages = {
  income: require('../../../../assets/chanchito-ingreso.png'),
  expense: require('../../../../assets/chanchito-gasto.png'),
};

type MovementModalProps = {
  mode: ModalMode;
  type: ManualMovementType;
  successAction: 'create' | 'edit';

  registerTitle: string;
  editTitle: string;
  deleteTitle: string;
  deleteMessage: string;
  successTitle: string;
  successMessage: string;

  headerColor: string;
  placeholder: string;

  description: string;
  amountText: string;
  selectedAccountName: string;
  selectedCategory: string;

  useSavingsGoal: boolean;
  accountDisabled: boolean;
  selectedGoal: SavingsGoal | null;
  completedGoals: SavingsGoal[];

  accounts: Account[];
  categories: Category[];

  showAccountOptions: boolean;
  showCategoryOptions: boolean;
  showGoalOptions: boolean;

  saving: boolean;

  onChangeDescription: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onToggleSavingsGoal: (enabled: boolean) => void;
  onSelectGoal: (goal: SavingsGoal) => void;
  onSelectAccount: (accountId: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleAccountOptions: () => void;
  onToggleCategoryOptions: () => void;
  onToggleGoalOptions: () => void;

  onClose: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  onGoDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

export function MovementModal({
  mode,
  type,
  successAction,
  registerTitle,
  editTitle,
  deleteTitle,
  deleteMessage,
  successTitle,
  successMessage,
  headerColor,
  placeholder,
  description,
  amountText,
  selectedAccountName,
  selectedCategory,
  useSavingsGoal,
  accountDisabled,
  selectedGoal,
  completedGoals,
  accounts,
  categories,
  showAccountOptions,
  showCategoryOptions,
  showGoalOptions,
  saving,
  onChangeDescription,
  onChangeAmount,
  onToggleSavingsGoal,
  onSelectGoal,
  onSelectAccount,
  onSelectCategory,
  onToggleAccountOptions,
  onToggleCategoryOptions,
  onToggleGoalOptions,
  onClose,
  onCreate,
  onUpdate,
  onCancelDelete,
  onDelete,
}: MovementModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme, headerColor);

  if (!mode) {
    return null;
  }

  const isCreate = mode === 'form';
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';
  const isSuccess = mode === 'success';

  const editSuccessTitle =
    type === 'income'
      ? 'Editar Ingreso'
      : 'Editar Gasto';

  const editSuccessMessage =
    type === 'income'
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
          <ScrollView contentContainerStyle={styles.registerPageContent}>
            <Text style={styles.registerPageTitle}>{registerTitle}</Text>

            <View style={styles.pigBox}>
              <Image
                source={registerPigImages[type]}
                style={styles.pigImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.formCard}>
              <MovementForm
                placeholder={placeholder}
                description={description}
                amountText={amountText}
                selectedAccountName={selectedAccountName}
                selectedCategory={selectedCategory}
                type={type}
                useSavingsGoal={useSavingsGoal}
                accountDisabled={accountDisabled}
                selectedGoal={selectedGoal}
                completedGoals={completedGoals}
                accounts={accounts}
                categories={categories}
                showAccountOptions={showAccountOptions}
                showCategoryOptions={showCategoryOptions}
                showGoalOptions={showGoalOptions}
                saving={saving}
                saveText="Guardar"
                saveColor={SAVE_BUTTON_COLOR}
                onChangeDescription={onChangeDescription}
                onChangeAmount={onChangeAmount}
                onToggleSavingsGoal={onToggleSavingsGoal}
                onSelectGoal={onSelectGoal}
                onSelectAccount={onSelectAccount}
                onSelectCategory={onSelectCategory}
                onToggleAccountOptions={onToggleAccountOptions}
                onToggleCategoryOptions={onToggleCategoryOptions}
                onToggleGoalOptions={onToggleGoalOptions}
                onClose={onClose}
                onSave={onCreate}
              />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit
                  ? editTitle
                  : isDelete
                    ? deleteTitle
                    : finalSuccessTitle}
              </Text>
            </View>

            {isEdit && (
              <View style={styles.modalContent}>
                <MovementForm
                  placeholder={placeholder}
                  description={description}
                  amountText={amountText}
                  selectedAccountName={selectedAccountName}
                  selectedCategory={selectedCategory}
                  type={type}
                  useSavingsGoal={false}
                  accountDisabled={false}
                  selectedGoal={null}
                  completedGoals={[]}
                  accounts={accounts}
                  categories={categories}
                  showAccountOptions={showAccountOptions}
                  showCategoryOptions={showCategoryOptions}
                  showGoalOptions={false}
                  saving={saving}
                  saveText="Guardar"
                  saveColor={SAVE_BUTTON_COLOR}
                  onChangeDescription={onChangeDescription}
                  onChangeAmount={onChangeAmount}
                  onToggleSavingsGoal={onToggleSavingsGoal}
                  onSelectGoal={onSelectGoal}
                  onSelectAccount={onSelectAccount}
                  onSelectCategory={onSelectCategory}
                  onToggleAccountOptions={onToggleAccountOptions}
                  onToggleCategoryOptions={onToggleCategoryOptions}
                  onToggleGoalOptions={onToggleGoalOptions}
                  onClose={onClose}
                  onSave={onUpdate}
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

function createStyles(theme: AppTheme, registerHeaderColor: string) {
  return StyleSheet.create({
    fullFormPage: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    registerPageContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingBottom: 26,
    },
    registerPageTitle: {
      width: '100%',
      height: 92,
      paddingTop: 42,
      backgroundColor: registerHeaderColor,
      color: '#FFFFFF',
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '900',
    },
    pigBox: {
      width: 140,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    pigImage: {
      width: 120,
      height: 110,
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
      backgroundColor: MODAL_HEADER_COLOR,
      paddingHorizontal: 22,
      justifyContent: 'center',
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
  });
}