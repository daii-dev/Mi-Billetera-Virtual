import {
  CalendarDays,
  ChevronDown,
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
  PlannedPaymentModalMode,
  PlannedPaymentSuccessAction,
} from '@/features/planned-payments/planned-payments.ui-types';
import {
  getDateFromInput,
} from '@/features/planned-payments/planned-payments.utils';
import { renderCategoryIcon } from '@/features/wallet/category.utils';
import {
  Account,
  Category,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

type PlannedPaymentModalProps = {
  mode: PlannedPaymentModalMode;
  successAction: PlannedPaymentSuccessAction;
  paymentName: string;
  amountText: string;
  paymentDate: string;
  showDatePicker: boolean;
  selectedAccountName: string;
  selectedCategory: string;
  selectedCategoryData: Category | null;
  accounts: Account[];
  categories: Category[];
  showAccountOptions: boolean;
  showCategoryOptions: boolean;
  saving: boolean;
  onChangeName: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onOpenDatePicker: () => void;
  onDatePickerChange: (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => void;
  onSelectAccount: (accountId: string) => void;
  onSelectCategory: (category: string) => void;
  onToggleAccountOptions: () => void;
  onToggleCategoryOptions: () => void;
  onClose: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

export function PlannedPaymentModal({
  mode,
  successAction,
  paymentName,
  amountText,
  paymentDate,
  showDatePicker,
  selectedAccountName,
  selectedCategory,
  selectedCategoryData,
  accounts,
  categories,
  showAccountOptions,
  showCategoryOptions,
  saving,
  onChangeName,
  onChangeAmount,
  onOpenDatePicker,
  onDatePickerChange,
  onSelectAccount,
  onSelectCategory,
  onToggleAccountOptions,
  onToggleCategoryOptions,
  onClose,
  onCreate,
  onUpdate,
  onCancelDelete,
  onDelete,
}: PlannedPaymentModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  if (!mode) return null;

  const isCreate = mode === 'form';
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';
  const isSuccess = mode === 'success';

  const successTitle = successAction === 'edit'
    ? 'Editar Pago'
    : 'Nuevo Pago';

  const successMessage = successAction === 'edit'
    ? 'Pago editado correctamente'
    : 'Pago guardado correctamente';

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
              {isCreate
                ? 'Nuevo Pago'
                : isEdit
                  ? 'Editar Pago'
                  : isDelete
                    ? 'Eliminar Pago Planificado'
                    : successTitle}
            </Text>
          </View>

          {(isCreate || isEdit) && (
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nombre Pago</Text>

              <TextInput
                value={paymentName}
                onChangeText={onChangeName}
                placeholder="Ej. Spotify"
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
                  {selectedCategoryData
                    ? renderCategoryIcon(
                        selectedCategoryData.icon,
                        20,
                        selectedCategoryData.color
                      )
                    : <Text style={styles.categoryFallbackIcon}>♟</Text>}

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
                      key={category.id}
                      style={styles.optionItem}
                      onPress={() => onSelectCategory(category.name)}
                    >
                      <View style={styles.categoryOptionRow}>
                        {renderCategoryIcon(category.icon, 18, category.color)}
                        <Text style={styles.optionText}>{category.name}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Fecha programada</Text>

              <Pressable
                style={styles.dateInputBox}
                onPress={onOpenDatePicker}
              >
                <Text
                  style={[
                    styles.dateText,
                    !paymentDate && styles.datePlaceholder,
                  ]}
                >
                  {paymentDate || 'Selecciona una fecha'}
                </Text>

                <CalendarDays size={21} color="#6B7280" />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={getDateFromInput(paymentDate)}
                  mode="date"
                  display="calendar"
                  minimumDate={new Date()}
                  onChange={onDatePickerChange}
                />
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
                  onPress={isEdit ? onUpdate : onCreate}
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
                ¿Estas seguro que quieres eliminar este pago planificado?
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

          {isSuccess && (
            <View style={styles.successContent}>
              <Text style={styles.successText}>
                {successMessage}
              </Text>
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
      minHeight: 54,
      backgroundColor: colors.primary,
      paddingHorizontal: 22,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
      flex: 1,
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
      height: 42,
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
      height: 42,
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
      height: 42,
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
    categoryFallbackIcon: {
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
      maxHeight: 150,
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
    categoryOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateInputBox: {
      height: 42,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 7,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    dateText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
    },
    datePlaceholder: {
      color: '#A8A8A8',
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