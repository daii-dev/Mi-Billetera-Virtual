import {
  Tags,
  WalletCards,
} from 'lucide-react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  buildCategoryFilterKey,
} from '@/features/wallet/movement-filter.utils';
import {
  Account,
  Category,
} from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type MovementFilterModalProps = {
  visible: boolean;
  accounts: Account[];
  categories: Category[];
  selectedAccountId: string;
  selectedCategoryKey: string;
  title?: string;
  onSelectAccount: (accountId: string) => void;
  onSelectCategory: (categoryKey: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function MovementFilterModal({
  visible,
  accounts,
  categories,
  selectedAccountId,
  selectedCategoryKey,
  title = 'Filtrar movimientos',
  onSelectAccount,
  onSelectCategory,
  onClear,
  onClose,
}: MovementFilterModalProps) {
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

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.sectionTitleRow}>
              <WalletCards size={17} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>Cuentas</Text>
            </View>

            {accounts.length === 0 ? (
              <Text style={styles.emptyText}>
                No tienes cuentas disponibles para filtrar.
              </Text>
            ) : (
              accounts.map((account) => {
                const isSelected = selectedAccountId === account.id;

                return (
                  <Pressable
                    key={account.id}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => {
                      onSelectAccount(isSelected ? '' : account.id);
                    }}
                  >
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
                  </Pressable>
                );
              })
            )}

            <View style={styles.separator} />

            <View style={styles.sectionTitleRow}>
              <Tags size={17} color={theme.colors.text} />
              <Text style={styles.sectionTitle}>Categorías</Text>
            </View>

            {categories.length === 0 ? (
              <Text style={styles.emptyText}>
                No tienes categorías disponibles para filtrar.
              </Text>
            ) : (
              categories.map((category) => {
                const categoryKey = buildCategoryFilterKey(
                  category.type,
                  category.name
                );

                const isSelected = selectedCategoryKey === categoryKey;

                const typeLabel =
                  category.type === 'income'
                    ? 'Ingreso'
                    : 'Gasto';

                return (
                  <Pressable
                    key={categoryKey}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => {
                      onSelectCategory(isSelected ? '' : categoryKey);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionTitle,
                        isSelected && styles.optionTitleSelected,
                      ]}
                    >
                      {category.name}
                    </Text>

                    <Text
                      style={[
                        styles.optionSubtitle,
                        isSelected && styles.optionSubtitleSelected,
                      ]}
                    >
                      Categoría de {typeLabel}
                    </Text>
                  </Pressable>
                );
              })
            )}

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
                style={[styles.actionButton, styles.applyButton]}
                onPress={onClose}
              >
                <Text style={styles.actionButtonText}>Aplicar</Text>
              </Pressable>
            </View>
          </ScrollView>
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
      maxWidth: 350,
      maxHeight: '82%',
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
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 2,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 8,
    },
    option: {
      minHeight: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    optionSelected: {
      backgroundColor: '#AEE4FF',
      borderColor: '#5BBEEA',
    },
    optionTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    optionTitleSelected: {
      color: colors.primary,
    },
    optionSubtitle: {
      marginTop: 3,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    optionSubtitleSelected: {
      color: '#304A8A',
    },
    emptyText: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '700',
      paddingVertical: 14,
    },
    actionsRow: {
      marginTop: 10,
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
    applyButton: {
      backgroundColor: colors.secondary,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
  });
}