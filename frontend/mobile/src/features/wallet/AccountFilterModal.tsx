import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Account } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type AccountFilterModalProps = {
  visible: boolean;
  accounts: Account[];
  selectedAccountId: string;
  title?: string;
  onSelectAccount: (accountId: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function AccountFilterModal({
  visible,
  accounts,
  selectedAccountId,
  title = 'Filtrar por cuenta',
  onSelectAccount,
  onClear,
  onClose,
}: AccountFilterModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>

          <View style={styles.content}>
            <Pressable
              style={[
                styles.option,
                !selectedAccountId && styles.optionSelected,
              ]}
              onPress={() => {
                onClear();
                onClose();
              }}
            >
              <View>
                <Text
                  style={[
                    styles.optionTitle,
                    !selectedAccountId && styles.optionTitleSelected,
                  ]}
                >
                  Todas las cuentas
                </Text>
                <Text
                  style={[
                    styles.optionSubtitle,
                    !selectedAccountId && styles.optionSubtitleSelected,
                  ]}
                >
                  Mostrar todos los movimientos
                </Text>
              </View>

              {!selectedAccountId && (
                <Text style={styles.checkText}>✓</Text>
              )}
            </Pressable>

            {accounts.map((account) => {
              const isSelected = selectedAccountId === account.id;

              return (
                <Pressable
                  key={account.id}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelectAccount(account.id);
                    onClose();
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.optionTitle,
                        isSelected && styles.optionTitleSelected,
                      ]}
                    >
                      {account.name}
                    </Text>
                    <Text
                      style={[
                        styles.optionSubtitle,
                        isSelected && styles.optionSubtitleSelected,
                      ]}
                    >
                      Bs. {Number(account.current_balance ?? 0).toLocaleString('es-BO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>

                  {isSelected && (
                    <Text style={styles.checkText}>✓</Text>
                  )}
                </Pressable>
              );
            })}

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.clearButton]}
                onPress={() => {
                  onClear();
                  onClose();
                }}
              >
                <Text style={styles.actionButtonText}>Limpiar</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.closeButton]}
                onPress={onClose}
              >
                <Text style={styles.actionButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
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
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 22,
      justifyContent: 'center',
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '900',
    },
    content: {
      padding: 18,
      gap: 10,
    },
    option: {
      minHeight: 58,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionSelected: {
      backgroundColor: theme.mode === 'dark' ? '#1E3A8A' : '#AEE4FF',
      borderColor: theme.mode === 'dark' ? '#4F7CFF' : colors.primary,
    },
    optionTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    optionTitleSelected: {
      color: theme.mode === 'dark' ? '#FFFFFF' : colors.primary,
    },
    optionSubtitle: {
      marginTop: 3,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    optionSubtitleSelected: {
      color: theme.mode === 'dark' ? '#DBEAFE' : '#304A8A',
    },
    checkText: {
      color: theme.mode === 'dark' ? '#FFFFFF' : colors.primary,
      fontSize: 22,
      fontWeight: '900',
    },
    actionsRow: {
      marginTop: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
    },
    actionButton: {
      width: 104,
      height: 38,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    clearButton: {
      backgroundColor: colors.expense,
    },
    closeButton: {
      backgroundColor: colors.secondary,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
  });
}