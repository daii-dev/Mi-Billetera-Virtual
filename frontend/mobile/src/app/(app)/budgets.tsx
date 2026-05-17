import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { useSupabase } from '@/lib/useSupabase';
import { useAuth } from '@clerk/expo';
import { getBudgets, getCategorySpent, saveBudget } from '@/features/wallet/wallet.service';
import { expenseCategories } from '@/features/wallet/movement.constants';
import { Plus, Menu, LogOut, X, ChevronDown } from 'lucide-react-native';

export default function BudgetsScreen() {
    console.log("¡Pantalla de presupuestos cargada!")
  const { theme } = useAppTheme();
  const supabase = useSupabase();
  const { userId } = useAuth();
 const [sidebarVisible, setSidebarVisible] = useState(false); 

  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados del Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  const loadBudgets = async () => {
    if (!userId) return;
    try {
      const data = await getBudgets(supabase, userId);
      const enriched = await Promise.all(data.map(async (b: any) => {
        const spent = await getCategorySpent(supabase, userId, b.category_name, b.period_month, b.period_year, b.account_id);
        const progress = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        
        let barColor = '#4CAF50'; 
        if (progress >= 100) barColor = colors.expense; 
        else if (progress >= 70) barColor = '#FFC107'; 

        return { ...b, spent, progress, barColor };
      }));
      setBudgets(enriched.filter(b => b.period_type === activeTab));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadBudgets(); }, [activeTab]);

  const handleCreateBudget = async () => {
    if (!selectedCategory || !amount) {
      Alert.alert("Campos requeridos", "Por favor selecciona una categoría e ingresa un monto.");
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Monto inválido", "El monto debe ser un número positivo.");
      return;
    }

    setLoading(true);
    try {
      const newBudget = {
        clerk_user_id: userId,
        category_name: selectedCategory,
        amount: numAmount,
        period_type: activeTab,
        period_month: activeTab === 'monthly' ? new Date().getMonth() + 1 : null,
        period_year: new Date().getFullYear(),
        // period_week se podría calcular aquí si activeTab es weekly
      };

      await saveBudget(supabase, newBudget);
      Alert.alert("¡Éxito!", "Presupuesto creado correctamente.");
      setModalVisible(false);
      resetForm();
      loadBudgets();
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo crear el presupuesto.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setAmount('');
    setShowCategoryOptions(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.topTitleBox}>
          <Menu size={28} color="#FFFFFF" />
          <Text style={styles.topTitle}>Presupuestos</Text>
        </View>
        <LogOut size={26} color="#FFFFFF" />
      </View>

      {/* Selector de Periodo */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'weekly' && styles.tabActive]} 
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>Semanal</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === 'monthly' && styles.tabActive]} 
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>Mensual</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {budgets.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No tienes presupuestos para este periodo.</Text>
        ) : (
          budgets.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.catTitle, { color: theme.colors.text }]}>{item.category_name}</Text>
                <Text style={[styles.amountLabel, { color: item.barColor }]}>
                  -Bs. {item.spent.toFixed(2)}
                </Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(item.progress, 100)}%`, backgroundColor: item.barColor }]} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Límite: Bs. {item.amount}</Text>
                <Text style={styles.footerText}>{item.progress.toFixed(0)}% usado</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Botón Flotante */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus color="white" size={30} />
      </Pressable>

      {/* Modal de Nuevo Presupuesto */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Presupuesto</Text>
              <Pressable onPress={() => setModalVisible(false)}><X color="white" size={24} /></Pressable>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Categoría</Text>
              <Pressable style={styles.selectorBox} onPress={() => setShowCategoryOptions(!showCategoryOptions)}>
                <Text style={{ color: selectedCategory ? theme.colors.text : '#888' }}>
                  {selectedCategory || "Selecciona una categoría"}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </Pressable>

              {showCategoryOptions && (
                <View style={styles.optionsBox}>
                  {expenseCategories.map((cat) => (
                    <Pressable key={cat} style={styles.optionItem} onPress={() => { setSelectedCategory(cat); setShowCategoryOptions(false); }}>
                      <Text style={{ color: theme.colors.text }}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 15 }]}>Monto Límite (Bs.)</Text>
              <TextInput 
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Pressable 
                style={[styles.saveButton, { opacity: loading ? 0.7 : 1 }]} 
                onPress={handleCreateBudget}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>{loading ? "Guardando..." : "Guardar Presupuesto"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Estilos (Se mantienen los anteriores y se añaden los del Modal)
const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { height: 92, backgroundColor: '#082B8C', paddingHorizontal: 18, paddingTop: 42, flexDirection: 'row', justifyContent: 'space-between' },
  topTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  tabContainer: { flexDirection: 'row', padding: 15, gap: 10, justifyContent: 'center' },
  tab: { flex: 1, height: 45, borderRadius: 22, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  tabActive: { backgroundColor: '#F39C12', borderColor: '#F39C12' },
  tabText: { fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#FFF' },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  catTitle: { fontSize: 18, fontWeight: '900' },
  amountLabel: { fontSize: 16, fontWeight: 'bold' },
  progressContainer: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#F39C12', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  
  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 14, overflow: 'hidden' },
  modalHeader: { height: 54, backgroundColor: '#082B8C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 15, fontWeight: '900', marginBottom: 8 },
  selectorBox: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionsBox: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, marginTop: 5, maxHeight: 150 },
  optionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  input: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  saveButton: { backgroundColor: '#F39C12', height: 48, borderRadius: 24, marginTop: 25, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  saveButtonText: { color: 'white', fontWeight: '900', fontSize: 16 }
});