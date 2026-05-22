import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { useSupabase } from '@/lib/useSupabase';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { getBudgets, getBudgetAccountSpent, deleteBudget, getUserAccounts, money } from '@/features/wallet/wallet.service'; 
import { Plus, Menu, LogOut, X, ChevronDown, MoreVertical, Calendar } from 'lucide-react-native';
import { AppSidebar } from '@/components/sidebar/AppSidebar';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BudgetsScreen() {
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const supabase = useSupabase();
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [sidebarVisible, setSidebarVisible] = useState(false); 
  const [budgets, setBudgets] = useState<any[]>([]);
  const [myAccounts, setMyAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);  
  const [modalVisible, setModalVisible] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('');
  const [amount, setAmount] = useState('');
  
  const [startDate, setStartDate] = useState(new Date()); 
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 7))); 
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const profileName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Usuario';

  const loadBudgetsData = async () => {
    if (!userId) return;
    try {
      const data = await getBudgets(supabase, userId);
      const validData = data.filter((b: any) => b.account_id && b.account_id !== 'null');

      const enriched = await Promise.all(validData.map(async (b: any) => {
        const spent = await getBudgetAccountSpent(
          supabase, 
          userId, 
          b.account_id, 
          b.start_date || new Date().toISOString().split('T')[0], 
          b.end_date || new Date().toISOString().split('T')[0]
        );
        const progress = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        
        let barColor = '#4CAF50'; 
        if (progress >= 100) barColor = colors.expense; 
        else if (progress >= 70) barColor = '#FFC107'; 

        return { ...b, spent, progress, barColor };
      }));
      setBudgets(enriched);
    } catch (e) {
      console.log("Error cargando presupuestos:", e);
    }
  };

  const loadAccountsData = async () => {
    if (!userId) return;
    try {
      const accs = await getUserAccounts(supabase, userId);
      setMyAccounts(accs);
    } catch (e) {
      console.error("Error cargando cuentas:", e); // 🔥 Corregido: Imprime 'e' en vez de 'accs'
    }
  };

  useEffect(() => { 
    loadBudgetsData();
    loadAccountsData(); 
  }, []);

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false); 
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false); 
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleCreateBudget = async () => {
    const clerkId = userId;
    if (!clerkId) return;

    if (!selectedAccountId || !amount) {
      Alert.alert("Campos requeridos", "Por favor completa todos los campos.");
      return;
    }

    if (startDate > endDate) {
      Alert.alert("Fechas inconsistentes", "La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Monto inválido", "El monto debe ser positivo.");
      return;
    }

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    setLoading(true);
    try {
      if (editingBudgetId) {
        const { error } = await supabase
          .from('budgets')
          .update({ 
            amount: numAmount, 
            start_date: startDateString, 
            end_date: endDateString, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', editingBudgetId);

        if (error) throw error;
        Alert.alert("¡Éxito!", "Presupuesto actualizado.");
      } else {
        // 🔥 Corregido: Enviamos 'monthly' en period_type para cumplir el constraint de la BD
        const { error } = await supabase
          .from('budgets')
          .insert([{
            clerk_user_id: clerkId,
            account_id: selectedAccountId,
            category_name: 'General', 
            amount: numAmount,
            period_type: 'monthly', 
            start_date: startDateString,
            end_date: endDateString,
            period_year: new Date().getFullYear(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (error) throw error;
        Alert.alert("¡Éxito!", "Presupuesto creado correctamente.");
      }

      setModalVisible(false);
      resetForm();
      loadBudgetsData();
    } catch (error: any) {
      Alert.alert("Error de base de datos", error.message || "Verifica los campos.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedAccountId('');
    setSelectedAccountName('');
    setAmount('');
    setStartDate(new Date());
    setEndDate(new Date(new Date().setDate(new Date().getDate() + 7)));
    setShowAccountOptions(false);
    setEditingBudgetId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => setSidebarVisible(true)} hitSlop={15}>
          <Menu size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topTitleBox}>
          <Text style={styles.topTitle}>Presupuestos por Cuenta</Text>
        </View>
        <LogOut size={26} color="#FFFFFF" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {budgets.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>
            No tienes presupuestos activos. Presiona (+) para configurar uno.
          </Text>
        ) : (
          budgets.map((item) => {
            const visualProgress = Math.min(item.progress, 100);
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catTitle, { color: theme.colors.text }]}>💼 {item.account?.name || 'Cuenta'}</Text>
                    <Text style={{ fontSize: 12, color: '#F39C12', fontWeight: '700', marginTop: 4 }}>
                      🗓 Vigencia: {item.start_date} al {item.end_date}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.amountLabel, { color: item.barColor, marginRight: 10 }]}>
                      -Bs. {item.spent.toFixed(2)}
                    </Text>
                    <Pressable onPress={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} hitSlop={20}>
                      <MoreVertical size={24} color="#6B7280" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${visualProgress}%`, backgroundColor: item.barColor }]} />
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>Límite: Bs. {item.amount}</Text>
                  <Text style={styles.footerText}>
                    {item.progress > 100 ? 'Excedido ⚠️' : `${item.progress.toFixed(0)}% usado`}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus color="white" size={30} />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBudgetId ? 'Modificar Presupuesto' : 'Nuevo Presupuesto'}</Text>
              <Pressable onPress={() => { setModalVisible(false); resetForm(); }} hitSlop={10}><X color="white" size={24} /></Pressable>
            </View>
            
            <View style={styles.modalContent}>
               <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Billetera / Cuenta</Text>
               <Pressable style={styles.selectorBox} onPress={() => !editingBudgetId && setShowAccountOptions(!showAccountOptions)}>
                 <Text style={{ color: selectedAccountName ? theme.colors.text : '#888' }}>
                   {selectedAccountName || "Selecciona una cuenta"}
                 </Text>
                 <ChevronDown size={20} color="#6B7280" />
               </Pressable>

               {showAccountOptions && (
                 <View style={styles.optionsDropdown}>
                   <ScrollView nestedScrollEnabled={true}>
                     {myAccounts.map((acc) => (
                       <Pressable key={acc.id} style={styles.optionItem} onPress={() => { setSelectedAccountId(acc.id); setSelectedAccountName(acc.name); setShowAccountOptions(false); }}>
                         <Text style={{ color: theme.colors.text }}>{acc.name} (Saldo: Bs. {acc.current_balance})</Text>
                       </Pressable>
                     ))}
                   </ScrollView>
                 </View>
               )}

               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Monto Límite (Bs.)</Text>
               <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={amount} onChangeText={setAmount} />

               {/* SECTOR INTERACTIVO FECHA INICIO */}
               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Fecha de Inicio</Text>
               <Pressable style={styles.datePickerButton} onPress={() => setShowStartPicker(true)}>
                 <Text style={styles.dateText}>{startDate.toISOString().split('T')[0]}</Text>
                 <Calendar size={20} color="#082B8C" />
               </Pressable>
               {showStartPicker && (
                 <DateTimePicker value={startDate} mode="date" display="calendar" onChange={onStartDateChange} />
               )}

               {/* SECTOR INTERACTIVO FECHA FIN */}
               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Fecha de Fin</Text>
               <Pressable style={styles.datePickerButton} onPress={() => setShowEndPicker(true)}>
                 <Text style={styles.dateText}>{endDate.toISOString().split('T')[0]}</Text>
                 <Calendar size={20} color="#082B8C" />
               </Pressable>
               {showEndPicker && (
                 <DateTimePicker value={endDate} mode="date" display="calendar" onChange={onEndDateChange} minimumDate={startDate} />
               )}

               <Pressable style={styles.saveButton} onPress={handleCreateBudget} disabled={loading}>
                 <Text style={styles.saveButtonText}>{loading ? "Guardando..." : "Guardar Configuración"}</Text>
               </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AppSidebar 
        visible={sidebarVisible} 
        userName={profileName} 
        selectedKey="budgets" 
        visualMode={isDarkMode} 
        onToggleVisualMode={setDarkMode} 
        onClose={() => setSidebarVisible(false)} 
        onSelectItem={(item) => { 
          setSidebarVisible(false); 
          // 🔥 Corregido: Navegación dinámica limpia desde cualquier pantalla de la app
          router.replace(`/${item.key}`); 
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { height: 92, backgroundColor: '#082B8C', paddingHorizontal: 18, paddingTop: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitleBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: 28 }, 
  topTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  catTitle: { fontSize: 16, fontWeight: '900' },
  amountLabel: { fontSize: 15, fontWeight: 'bold' },
  progressContainer: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#F39C12', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 14, overflow: 'hidden' },
  modalHeader: { height: 54, backgroundColor: '#082B8C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  modalContent: { padding: 20 }, 
  inputLabel: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  selectorBox: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionsDropdown: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, maxHeight: 110, marginTop: 4 },
  optionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  input: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, fontSize: 15, marginBottom: 10, color: '#000', backgroundColor: '#FFF' },
  datePickerButton: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#FFF' },
  dateText: { fontSize: 15, color: '#333' },
  saveButton: { backgroundColor: '#F39C12', height: 48, borderRadius: 24, marginTop: 15, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '900', fontSize: 16 }
});