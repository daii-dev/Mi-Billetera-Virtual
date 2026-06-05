import {
  ChevronDown,
  Tags,
  Wallet,
} from 'lucide-react-native';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Account,
  Category,
  Movement,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

export type HomeMovementModalMode = 'edit' | 'delete' | 'success' | null;

type HomeMovementModalProps = {
  mode: HomeMovementModalMode;
  selectedMovement: Movement | null;
  accounts: Account[];
  description: string;
  amountText: string;
  selectedAccountId: string;
  selectedCategory: string;
  availableCategories: Category[];
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
  onUpdate: () => void;
  onGoDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

export function HomeMovementModal({
  mode,
  selectedMovement,
  accounts,
  description,
  amountText,
  selectedAccountId,
  selectedCategory,
  availableCategories,
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
  onUpdate,
  onCancelDelete,
  onDelete,
}: HomeMovementModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  if (!mode || !selectedMovement) {
    return null;
  }

  const isIncome = selectedMovement.type === 'income';
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';
  const isSuccess = mode === 'success';

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const editTitle = isIncome ? 'Editar Ingreso' : 'Editar Gasto';
  const deleteTitle = isIncome ? 'Eliminar Ingreso' : 'Eliminar gasto';
  const successTitle = isIncome ? 'Editar Ingreso' : 'Editar Gasto';

  const successMessage = isIncome
    ? 'Ingreso editado correctamente'
    : 'Gasto editado correctamente';

  const deleteMessage = isIncome
    ? '¿Estas seguro que quieres eliminar este ingreso?'
    : '¿Estas seguro que quieres eliminar este gasto?';

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
              {isEdit ? editTitle : isDelete ? deleteTitle : successTitle}
            </Text>
          </View>

          {isEdit && (
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Descripcion</Text>
              <TextInput
                value={description}
                onChangeText={onChangeDescription}
                placeholder={isIncome ? 'Ej. Sueldo' : 'Ej. Compra de viveres'}
                placeholderTextColor="#A8A8A8"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Ingresar Monto</Text>
              <View style={styles.amountInputBox}>
                <Text style={styles.amountPrefix}>Bs.</Text>
                <TextInput
                  value={amountText}
                  onChangeText={onChangeAmount}
                  placeholder="0,00"
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
                    {selectedAccount?.name || 'Selecciona una cuenta'}
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
                  <Tags size={21} color="#4B5563" />
                  <Text style={styles.selectorText}>
                    {selectedCategory || 'Selecciona una categoría'}
                  </Text>
                </View>

                <ChevronDown size={20} color="#6B7280" />
              </Pressable>

              {showCategoryOptions && (
                <View style={styles.optionsBox}>
                  {availableCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={styles.optionItem}
                      onPress={() => onSelectCategory(category.name)}
                    >
                      <Text style={styles.optionText}>{category.name}</Text>
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

          {isSuccess && (
            <View style={styles.successContent}>
              <Text style={styles.successText}>
                {successMessage}
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
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
      color: theme.mode === 'dark' ? '#FFFFFF' : colors.primary,
      fontSize: 14,
      fontWeight: '900',
    },
  });
}