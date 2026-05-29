import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Trash2 } from 'lucide-react-native';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { renderCategoryIcon } from '@/features/wallet/category.utils';
import {
  createCategory,
  deleteCategory,
  getCategoriesByType,
} from '@/features/wallet/wallet.service';
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

const COLORS = [
  '#10B981',
  '#EF4444',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

const ICONS = [
  { name: 'Wallet', icon: 'Wallet', label: 'Billetera' },
  { name: 'Car', icon: 'Car', label: 'Auto' },
  { name: 'Gamepad2', icon: 'Gamepad2', label: 'Juegos' },
  { name: 'House', icon: 'House', label: 'Casa' },
  { name: 'Music', icon: 'Music', label: 'Música' },
  { name: 'ShoppingCart', icon: 'ShoppingCart', label: 'Compras' },
  { name: 'Utensils', icon: 'Utensils', label: 'Comida' },
];

export default function CategoriesScreen() {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);
  const [type, setType] = useState<ManualMovementType>('income');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Wallet');

  const loadCategories = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await getCategoriesByType(supabase, userId, type);
      setCategories(data);
    } catch (error) {
      console.error(error);
      setErrorMessage('No se pudieron cargar las categorías.');
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  }, [supabase, type, userId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const title = useMemo(() => {
    return type === 'income' ? 'Ingresos' : 'Gastos';
  }, [type]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setName('');
    setSelectedColor(COLORS[0]);
    setSelectedIcon('Wallet');
  }, []);

  async function handleCreateCategory() {
    if (!userId) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('Por favor, ingresa un nombre para la categoría.');
      setErrorModalVisible(true);
      return;
    }

    if (trimmedName.length < 2) {
      setErrorMessage('La categoría debe tener al menos 2 caracteres.');
      setErrorModalVisible(true);
      return;
    }

    const alreadyExists = categories.some(
      (category) => category.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      setErrorMessage(`Ya existe una categoría llamada "${trimmedName}".`);
      setErrorModalVisible(true);
      return;
    }

    try {
      setCreating(true);

      await createCategory(supabase, {
        clerkUserId: userId,
        type,
        name: trimmedName,
        color: selectedColor,
        icon: selectedIcon,
      });

      closeModal();
      await loadCategories();

      setSuccessMessage('Categoría creada correctamente');
      setSuccessModalVisible(true);
      
      setTimeout(() => {
        setSuccessModalVisible(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error creating category:', error);

      if (error?.code === '23505') {
        setErrorMessage('Ya existe una categoría con ese nombre en la base de datos.');
      } else {
        setErrorMessage(error.message ?? 'No se pudo crear la categoría.');
      }
      setErrorModalVisible(true);
    } finally {
      setCreating(false);
    }
  }

  function handleOpenCreateCategory() {
    setSelectedCategory(null);
    setName('');
    setSelectedColor(COLORS[0]);
    setSelectedIcon('Wallet');
    setModalVisible(true);
  }

  // Edit functionality removed — only allow creation and deletion

  function handleDeletePress(category: Category) {
    setSelectedCategory(category);
    setDeleteModalVisible(true);
  }

  async function handleConfirmDelete() {
    if (!selectedCategory) return;

    try {
      await deleteCategory(supabase, selectedCategory.id);
      await loadCategories();

      setDeleteModalVisible(false);
      setSuccessMessage('Categoría eliminada correctamente');
      setSuccessModalVisible(true);
      
      setTimeout(() => {
        setSuccessModalVisible(false);
      }, 2000);
    } catch (error: any) {
      setDeleteModalVisible(false);
      setErrorMessage(error.message || 'No se pudo eliminar la categoría.');
      setErrorModalVisible(true);
    }
  }

  const renderCategoryCard = ({ item }: { item: Category }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryCardContent}>
        <View style={[styles.iconContainer, { backgroundColor: (item.color || '#10B981') + '20' }]}>
          {renderCategoryIcon(item.icon, 28, item.color)}
        </View>

        <Text style={styles.categoryName}>{item.name}</Text>
      </View>

      <View style={{ position: 'relative', zIndex: 10 }}>
        <Pressable
          onPress={() => handleDeletePress(item)}
          hitSlop={10}
        >
          <Trash2 size={22} color={colors.expense} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <PrivateScreenLayout
      title="Categorías"
      currentKey="categories"
    >
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            type === 'income' && styles.segmentButtonActiveIncome,
          ]}
          onPress={() => setType('income')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              type === 'income' && styles.segmentTextActive,
            ]}
          >
            Ingresos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            type === 'expense' && styles.segmentButtonActiveExpense,
          ]}
          onPress={() => setType('expense')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentText,
              type === 'expense' && styles.segmentTextActive,
            ]}
          >
            Gastos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Categorías */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        refreshing={loading}
        onRefresh={loadCategories}
        renderItem={renderCategoryCard}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay categorías</Text>
            <Text style={styles.emptySubtext}>
              Toca el botón + para crear una nueva categoría
            </Text>
          </View>
        }
      />

      <FloatingActionButton
        color={type === 'income' ? colors.secondary : colors.expense}
        onPress={handleOpenCreateCategory}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                Nueva Categoría
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                placeholder="Nombre de la categoría"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={name}
                onChangeText={setName}
                editable={!creating}
                autoFocus
              />

              <Text style={styles.inputLabel}>Selecciona un color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
                <View style={styles.colorsRow}>
                  {COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorCircleSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                      disabled={creating}
                    />
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>Selecciona un icono</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconsScroll}>
                <View style={styles.iconsRow}>
                  {ICONS.map(({ name, icon }) => (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.iconCircle,
                        selectedIcon === name && styles.iconCircleSelected,
                      ]}
                      onPress={() => setSelectedIcon(name)}
                      disabled={creating}
                    >
                      {renderCategoryIcon(icon, 28, selectedIcon === name ? '#FFF' : '#6B7280')}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, creating && styles.buttonDisabled]}
                onPress={handleCreateCategory}
                disabled={creating}
              >
                <Text style={styles.createButtonText}>
                  {creating ? 'Creando...' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Eliminar Categoría */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalCard}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackHeaderTitle}>
                Eliminar categoría
              </Text>
            </View>

            <View style={styles.feedbackBody}>
              <Trash2 size={40} color="#EF4444" />
              <Text style={styles.feedbackDeleteText}>
                ¿Deseas eliminar "{selectedCategory?.name}"?
              </Text>

              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={styles.feedbackCancelButton}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.feedbackCancelText}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.feedbackDeleteButton}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.feedbackDeleteButtonText}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Éxito */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalCard}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackHeaderTitle}>
                {type === 'expense' ? 'Nuevo Gasto' : 'Nuevo Ingreso'}
              </Text>
            </View>

            <View style={styles.feedbackBody}>
              <Text style={styles.feedbackSuccessIcon}>♡</Text>
              <Text style={styles.feedbackSuccessText}>
                {successMessage}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Error */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalCard}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackHeaderTitle}>Error</Text>
            </View>

            <View style={styles.feedbackBody}>
              <Text style={styles.feedbackErrorIcon}>⚠️</Text>
              <Text style={styles.feedbackErrorText}>
                {errorMessage}
              </Text>

              <TouchableOpacity
                style={styles.feedbackErrorButton}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text style={styles.feedbackErrorButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PrivateScreenLayout>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: theme.mode === 'dark' ? '#1E293B' : '#F3F4F6',
      marginHorizontal: 24,
      marginVertical: 16,
      borderRadius: 12,
      padding: 4,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentButtonActiveExpense: {
      backgroundColor: '#EF4444',
    },
    segmentButtonActiveIncome: {
      backgroundColor: '#10B981',
    },
    segmentText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.mode === 'dark' ? '#CBD5E1' : '#6B7280',
    },
    segmentTextActive: {
      color: '#FFF',
    },
    categoriesList: {
      paddingHorizontal: 24,
      paddingBottom: 80,
    },

    categoryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },

    categoryCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },

    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },

    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FEE2E2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      overflow: 'hidden',
      maxHeight: '90%',
    },
    modalHeader: {
      backgroundColor: '#3B82F6',
      paddingVertical: 20,
      paddingHorizontal: 24,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#3B82F6',
      paddingVertical: 20,
      paddingHorizontal: 24,
    },
    modalHeaderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
    },
    menuOverlay: {
      position: 'absolute',
      top: 36,
      right: 0,
      width: 150,
      borderRadius: 14,
      backgroundColor: theme.colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 14,
      overflow: 'hidden',
    },
    menuOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    menuText: {
      marginLeft: 10,
      fontSize: 15,
      color: theme.colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 14,
      margin: 20,
      marginBottom: 16,
      fontSize: 16,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginLeft: 20,
      marginBottom: 12,
    },
    colorsScroll: {
      marginBottom: 20,
    },
    colorsRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
    },

    colorCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    colorCircleSelected: {
      borderColor: '#000',
      borderWidth: 3,
      transform: [{ scale: 1.05 }],
    },
    iconsScroll: {
      marginBottom: 20,
    },
    iconsRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.mode === 'dark' ? '#334155' : '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    iconCircleSelected: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    modalActions: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: '#F3F4F6',
    },
    cancelButtonText: {
      color: '#6B7280',
      fontWeight: '600',
      fontSize: 16,
    },
    createButton: {
      backgroundColor: '#10B981',
    },
    createButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    feedbackModalCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      overflow: 'hidden',
    },
    feedbackHeader: {
      backgroundColor: '#0F2D8C',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    feedbackHeaderTitle: {
      color: '#FFF',
      fontSize: 22,
      fontWeight: '700',
    },
    feedbackBody: {
      padding: 32,
      alignItems: 'center',
    },
    feedbackSuccessIcon: {
      fontSize: 42,
      color: '#52F436',
      marginBottom: 12,
    },
    feedbackSuccessText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#52F436',
      textAlign: 'center',
    },
    feedbackDeleteText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: 20,
    },
    feedbackButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 28,
    },
    feedbackCancelButton: {
      backgroundColor: '#E5E7EB',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    feedbackCancelText: {
      color: '#374151',
      fontWeight: '600',
    },
    feedbackDeleteButton: {
      backgroundColor: '#EF4444',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    feedbackDeleteButtonText: {
      color: '#FFF',
      fontWeight: '700',
    },
    feedbackErrorIcon: {
      fontSize: 42,
      color: '#F59E0B',
      marginBottom: 12,
    },
    feedbackErrorText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#F59E0B',
      textAlign: 'center',
      marginBottom: 24,
    },
    feedbackErrorButton: {
      backgroundColor: '#F59E0B',
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 12,
    },
    feedbackErrorButtonText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 16,
    },
  });
}