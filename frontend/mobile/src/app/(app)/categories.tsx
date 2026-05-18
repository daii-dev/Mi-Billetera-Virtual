import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@clerk/expo';

import {
  Category,
  MovementType,
} from '@/features/wallet/wallet.types';

import {
  createCategory,
  deleteCategory,
  getCategoriesByType,
} from '@/features/wallet/wallet.service';

import { useSupabase } from '@/lib/useSupabase';

const COLORS = [
  '#4CAF50',
  '#FF5252',
  '#03A9F4',
  '#FFC107',
  '#9C27B0',
  '#FF9800',
];

const EMOJIS = [
  '🍔',
  '🚗',
  '💰',
  '🎮',
  '🏠',
  '📚',
  '🛒',
  '❤️',
  '✈️',
  '🎵',
  '💡',
  '🏥',
  '👕',
  '💼',
  '🍕',
  '☕',
  '🎬',
  '⚽',
];

export default function CategoriesScreen() {
  const { userId } = useAuth();
  const supabase = useSupabase();

  const [type, setType] = useState<MovementType>('income');

  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState('💰');

  const loadCategories = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const data = await getCategoriesByType(
        supabase,
        userId,
        type
      );

      setCategories(data);
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Error',
        'No se pudieron cargar las categorías.'
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, type, userId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const title = useMemo(() => {
    return type === 'income'
      ? 'Categorías Ingreso'
      : 'Categorías Gasto';
  }, [type]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setName('');
    setSelectedColor(COLORS[0]);
    setSelectedEmoji('💰');
  }, []);

  async function handleCreateCategory() {
    if (!userId) return;
    
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      Alert.alert('Campo requerido', 'Ingresa un nombre para la categoría.');
      return;
    }
    
    if (trimmedName.length < 2) {
      Alert.alert('Nombre muy corto', 'La categoría debe tener al menos 2 caracteres.');
      return;
    }
    
    const alreadyExists = categories.some(
      (category) => category.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (alreadyExists) {
      Alert.alert('Duplicado', `Ya existe una categoría llamada "${trimmedName}".`);
      return;
    }
    
    try {
      setCreating(true);
      
      await createCategory(supabase, {
        clerkUserId: userId,
        type,
        name: trimmedName,
        color: selectedColor,
        icon: selectedEmoji,
      });
      
      closeModal();
      await loadCategories();
      
      Alert.alert('Éxito', 'Categoría creada correctamente.');
    } catch (error: any) {
      console.error('Error creating category:', error);
      
      if (error?.code === '23505') {
        Alert.alert('Duplicado', 'Ya existe una categoría con ese nombre en la base de datos.');
      } else {
        Alert.alert('Error', error.message ?? 'No se pudo crear la categoría.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    Alert.alert(
      'Eliminar categoría',
      '¿Seguro que deseas eliminar esta categoría?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(supabase, categoryId);
              await loadCategories();
              
              Alert.alert('Éxito', 'Categoría eliminada correctamente.');
            } catch (error: any) {
              Alert.alert(
                'No permitido',
                error.message || 'No se pudo eliminar la categoría.'
              );
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        Categorías
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tab,
            type === 'income' && styles.activeIncomeTab,
          ]}
          onPress={() => setType('income')}
        >
          <Text style={styles.tabText}>
            Ingresos
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            type === 'expense' && styles.activeExpenseTab,
          ]}
          onPress={() => setType('expense')}
        >
          <Text style={styles.tabText}>
            Gastos
          </Text>
        </Pressable>
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadCategories}
        renderItem={({ item }) => (
          <View style={styles.categoryItem}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: item.color ?? '#ccc' },
              ]}
            />

            <Text style={styles.categoryName}>
              {item.icon ?? '📁'} {item.name}
            </Text>

            <Pressable
              onPress={() =>
                handleDeleteCategory(item.id)
              }
              hitSlop={10}
            >
              <Text style={styles.deleteText}>
                🗑️
              </Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        style={[
          styles.fab,
          type === 'income'
            ? styles.incomeFab
            : styles.expenseFab,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>
          +
        </Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Nueva Categoría
            </Text>

            <TextInput
              placeholder="Nombre categoría"
              placeholderTextColor="#999"
              style={styles.input}
              value={name}
              onChangeText={setName}
              editable={!creating}
              autoFocus
            />

            <Text style={styles.inputLabel}>
              Color
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsScroll}>
              <View style={styles.colorsRow}>
                {COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorPicker,
                      {
                        backgroundColor: color,
                        borderWidth: selectedColor === color ? 3 : 1,
                        borderColor: selectedColor === color ? '#000' : '#DDD',
                      },
                    ]}
                    onPress={() => setSelectedColor(color)}
                    disabled={creating}
                  />
                ))}
              </View>
            </ScrollView>

            <Text style={styles.inputLabel}>
              Emoji
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              <View style={styles.emojiRow}>
                {EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[
                      styles.emojiPicker,
                      selectedEmoji === emoji && styles.emojiPickerSelected,
                    ]}
                    onPress={() => setSelectedEmoji(emoji)}
                    disabled={creating}
                  >
                    <Text style={styles.emojiText}>
                      {emoji}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={creating}
              >
                <Text style={styles.actionText}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.createButton,
                  creating && styles.createButtonDisabled
                ]}
                onPress={handleCreateCategory}
                disabled={creating}
              >
                <Text style={styles.actionText}>
                  {creating ? 'Creando...' : 'Crear'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F4',
    padding: 16,
  },

  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },

  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DDD',
    alignItems: 'center',
  },

  activeIncomeTab: {
    backgroundColor: '#4CAF50',
  },

  activeExpenseTab: {
    backgroundColor: '#FF5252',
  },

  tabText: {
    color: '#FFF',
    fontWeight: '700',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },

  categoryItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginRight: 12,
  },

  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  deleteText: {
    fontSize: 20,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  incomeFab: {
    backgroundColor: '#4CAF50',
  },

  expenseFab: {
    backgroundColor: '#FF5252',
  },

  fabText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#FFF',
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },

  colorsScroll: {
    marginBottom: 20,
  },

  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },

  colorPicker: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  emojiScroll: {
    marginBottom: 20,
  },

  emojiRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },

  emojiPicker: {
    width: 55,
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  emojiPickerSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
    transform: [{ scale: 1.02 }],
  },

  emojiText: {
    fontSize: 28,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#FF5252',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  createButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  createButtonDisabled: {
    opacity: 0.5,
  },

  actionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});