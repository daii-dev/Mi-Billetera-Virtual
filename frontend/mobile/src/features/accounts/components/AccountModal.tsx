import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SuccessFeedbackContent,
} from '@/components/feedback/SuccessFeedbackContent';
import {
  AccountModalMode,
  AccountSuccessAction,
} from '@/features/accounts/accounts.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type AccountModalProps = {
  mode: AccountModalMode;
  successAction: AccountSuccessAction;
  accountName: string;
  initialBalanceText: string;
  saving: boolean;
  onChangeAccountName: (value: string) => void;
  onChangeInitialBalance: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

export function AccountModal({
  mode,
  successAction,
  accountName,
  initialBalanceText,
  saving,
  onChangeAccountName,
  onChangeInitialBalance,
  onClose,
  onCreate,
  onUpdate,
  onCancelDelete,
  onDelete,
}: AccountModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  if (!mode) {
    return null;
  }

  const isCreate = mode === "create";
  const isSuccess = mode === "success";
  const isEdit = mode === "edit";
  const isDelete = mode === "delete";
  const successTitle =
    successAction === "edit" ? "Editar Cuenta" : "Nueva Cuenta";

  const successMessage =
    successAction === "edit"
      ? "Cuenta editada correctamente"
      : "Cuenta guardada correctamente";

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
                ? "Nueva Cuenta"
                : isSuccess
                  ? successTitle
                  : isEdit
                    ? "Editar Cuenta"
                    : "Eliminar Cuenta"}
            </Text>
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
                    {saving ? "Guardando..." : "Crear"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {isSuccess && (
            <View style={styles.successContent}>
              <SuccessFeedbackContent message={successMessage} />
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
                    {saving ? "Guardando..." : "Guardar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {isDelete && (
            <View style={styles.deleteContent}>
              <Text style={styles.deleteText}>
                ¿Estas seguro que quieres eliminar la cuenta con todos sus
                registros y objetos relacionados?
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
                    {saving ? "Eliminando..." : "Si"}
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
      backgroundColor: "rgba(0,0,0,0.62)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },
    modalBox: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: "hidden",
    },
    modalHeader: {
      height: 54,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 22,
      flexDirection: "row",
      alignItems: "center",
    },
    modalTitle: {
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "900",
    },
    modalContent: {
      paddingHorizontal: 28,
      paddingTop: 20,
      paddingBottom: 18,
    },
    inputLabel: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: "900",
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
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      marginBottom: 18,
    },
    amountPrefix: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: "900",
      marginRight: 12,
    },
    amountInput: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
    },
    modalButtonsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 18,
      marginTop: 4,
    },
    modalButton: {
      width: 108,
      height: 42,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
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
      color: "#FFFFFF",
      fontWeight: "900",
      fontSize: 14,
    },
    successContent: {
      paddingHorizontal: 22,
      paddingVertical: 26,
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
      flexDirection: "row",
      justifyContent: "center",
      gap: 44,
    },
    deleteTextButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    deleteOptionText: {
      color: theme.mode === "dark" ? "#FFFFFF" : colors.primary,
      fontSize: 14,
      fontWeight: "900",
    },
  });
}
