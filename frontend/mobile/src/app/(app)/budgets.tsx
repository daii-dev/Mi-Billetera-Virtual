import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { useSupabase } from '@/lib/useSupabase';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { getBudgets, getBudgetAccountSpent, getUserAccounts, deleteBudget, getCategoriesByType } from '@/features/wallet/wallet.service'; 
import { Plus, Menu, LogOut, X, ChevronDown, MoreVertical, Calendar, AlertTriangle, Edit2, Trash2 } from 'lucide-react-native';
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
  const [myCategories, setMyCategories] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);  
  const [modalVisible, setModalVisible] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountName, setSelectedAccountName] = useState('');
  const [amount, setAmount] = useState('');
  
  const [startDate, setStartDate] = useState(new Date()); 
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 7))); 
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const profileName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Usuario';

 const loadBudgetsData = async () => {
    if (!userId) return;
    try {
      const data = await getBudgets(supabase, userId);
      const validData = data.filter((b: any) => b.account_id && b.account_id !== 'null');

      const enriched = await Promise.all(validData.map(async (b: any) => {
        const sDate = b.start_date ? String(b.start_date).split('T')[0] : new Date().toISOString().split('T')[0];
        const eDate = b.end_date ? String(b.end_date).split('T')[0] : new Date().toISOString().split('T')[0];
        const catName = b.category_name ? String(b.category_name) : 'General';

        try {
          // 🔥 LLAMADA CORREGIDA: Pasamos 'supabase' como primer argumento directo
          const spent = await getBudgetAccountSpent(supabase, {
            userId,
            accountId: b.account_id,
            categoryName: catName,
            startDate: sDate,
            endDate: eDate
          });
          
          const progress = b.amount > 0 ? (spent / b.amount) * 100 : 0;
          
          let barColor = '#4CAF50'; 
          let statusText = 'Normal';
          if (progress >= 100) {
            barColor = colors.expense; 
            statusText = 'Excedido ⚠️';
          } else if (progress >= 70) {
            barColor = '#FFC107'; 
            statusText = 'Cerca del límite ⏳';
          }

          const overspentAmount = spent > b.amount ? spent - b.amount : 0;

          return { ...b, start_date: sDate, end_date: eDate, category_name: catName, spent, progress, barColor, statusText, overspentAmount, isValid: true };
        } catch (err) {
          console.log("Error individual omitido en tarjeta:", err);
          return { ...b, isValid: false };
        }
      }));

      setBudgets(enriched.filter((b: any) => b.isValid));
    } catch (e) {
      console.log("Error cargando presupuestos:", e);
    }
  };

  const loadInitialData = async () => {
    if (!userId) return;
    try {
      const accs = await getUserAccounts(supabase, userId);
      setMyAccounts(accs);
      
      const cats = await getCategoriesByType(supabase, userId, 'expense');
      setMyCategories(cats);
    } catch (e) {
      console.error("Error cargando datos iniciales:", e);
    }
  };

  useEffect(() => { 
    loadBudgetsData();
    loadInitialData(); 
  }, []);

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false); 
    if (selectedDate) setStartDate(selectedDate);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false); 
    if (selectedDate) setEndDate(selectedDate);
  };

  const handleEditPress = (item: any) => {
    setActiveMenuId(null); 
    setEditingBudgetId(item.id);
    setSelectedCategory(item.category_name || '');
    setSelectedAccountId(item.account_id);
    setSelectedAccountName(item.account?.name || 'Cuenta Seleccionada');
    setAmount(item.amount.toString());
    
    if (item.start_date) setStartDate(new Date(item.start_date + 'T12:00:00'));
    if (item.end_date) setEndDate(new Date(item.end_date + 'T12:00:00'));
    
    setModalVisible(true);
  };

  const handleDeletePress = (id: string) => {
    setActiveMenuId(null);
    Alert.alert(
      "¿Eliminar Presupuesto?",
      "Esta acción no se puede deshacer. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteBudget(supabase, id);
              Alert.alert("Eliminado", "El presupuesto ha sido removido.");
              loadBudgetsData();
            } catch (error: any) {
              Alert.alert("Error", "No se pudo eliminar.");
            }
          } 
        }
      ]
    );
  };

  const handleCreateBudget = async () => {
    const clerkId = userId;
    if (!clerkId) return;

    if (!selectedCategory || !selectedAccountId || !amount) {
      Alert.alert("Campos requeridos", "Por favor completa todos los campos.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareStartDate = new Date(startDate);
    compareStartDate.setHours(0, 0, 0, 0);
    
    if (compareStartDate < today) {
      Alert.alert(
        "Fecha inválida", 
        "No puedes crear un presupuesto con una fecha de inicio anterior al día de hoy."
      );
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

    const accountObj = myAccounts.find(a => a.id === selectedAccountId);
    if (!accountObj) return;

    if (!editingBudgetId && numAmount > Number(accountObj.current_balance)) {
      Alert.alert(
        "Saldo Insuficiente ❌",
        `No puedes asignar un presupuesto de Bs. ${numAmount.toFixed(2)} porque el saldo disponible en la cuenta es de Bs. ${Number(accountObj.current_balance).toFixed(2)}.`
      );
      return;
    }

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

   setLoading(true);
    try {
      if (editingBudgetId) {
        // ... (Tu código actual de update se queda igual)
      } else {
        // 🔥 CANDADO DE DUPLICADOS: Verificamos si ya hay un presupuesto para esta cuenta y categoría
        const { data: existingDuplicate, error: checkError } = await supabase
          .from('budgets')
          .select('id, start_date, end_date')
          .eq('clerk_user_id', clerkId)
          .eq('account_id', selectedAccountId)
          .eq('category_name', selectedCategory)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingDuplicate) {
          // Si las fechas se cruzan, frenamos la creación
          Alert.alert(
            "Presupuesto Duplicado ⚠️",
            `Ya tienes configurado un presupuesto de "${selectedCategory}" para esta billetera. Si deseas cambiar el monto límite, búscalo en la lista principal y presiona "Editar".`
          );
          setLoading(false);
          return;
        }

        // Si no hay duplicados, procede el insert limpio
        const { error } = await supabase
          .from('budgets')
          .insert([{
            clerk_user_id: clerkId,
            account_id: selectedAccountId,
            category_name: selectedCategory, 
            amount: numAmount,
            period_type: 'monthly', 
            start_date: startDateString,
            end_date: endDateString,
            period_year: new Date().getFullYear(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
        Alert.alert("¡Éxito!", "Presupuesto configurado correctamente.");
      }
      setModalVisible(false);
      resetForm();
      loadBudgetsData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Verifica los campos.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedAccountId('');
    setSelectedAccountName('');
    setAmount('');
    setStartDate(new Date());
    setEndDate(new Date(new Date().setDate(new Date().getDate() + 7)));
    setShowAccountOptions(false);
    setShowCategoryOptions(false);
    setEditingBudgetId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => setSidebarVisible(true)} hitSlop={15}>
          <Menu size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topTitleBox}>
          <Text style={styles.topTitle}>Presupuestos</Text>
        </View>
        <LogOut size={26} color="#FFFFFF" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {budgets.map((item) => {
          const visualProgress = Math.min(item.progress, 100);
          const isMenuOpen = activeMenuId === item.id;

          return (
            <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {item.progress >= 70 && (
                <View style={[styles.notificationBanner, { backgroundColor: item.progress >= 100 ? '#FADBD8' : '#FCF3CF' }]}>
                  <AlertTriangle size={16} color={item.progress >= 100 ? '#C0392B' : '#B7950B'} />
                  <Text style={[styles.notificationText, { color: item.progress >= 100 ? '#C0392B' : '#7D6608' }]}>
                    {item.progress >= 100 
                      ? `¡Atención! Excediste el límite de ${item.category_name} por Bs. ${item.overspentAmount.toFixed(2)}` 
                      : `Advertencia: Estás llegando al límite de ${item.category_name} (${item.progress.toFixed(0)}% usado)`}
                  </Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catTitle, { color: theme.colors.text }]}>🏷 Categoría: {item.category_name}</Text>
                  <Text style={styles.accountSubLabel}>💼 Billetera: {item.account?.name || 'Personal'}</Text>
                  <Text style={{ fontSize: 11, color: '#F39C12', fontWeight: '700', marginTop: 4 }}>
                    🗓 Rango: {item.start_date} al {item.end_date}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                  <Text style={[styles.amountLabel, { color: item.barColor, marginRight: 10 }]}>
                    -Bs. {item.spent.toFixed(2)}
                  </Text>
                  
                  <Pressable onPress={() => setActiveMenuId(isMenuOpen ? null : item.id)} hitSlop={20}>
                    <MoreVertical size={24} color="#6B7280" />
                  </Pressable>

                  {isMenuOpen && (
                    <View style={[styles.contextMenu, { backgroundColor: theme.colors.card }]}>
                      <Pressable style={styles.menuOption} onPress={() => handleEditPress(item)}>
                        <Edit2 size={14} color="#082B8C" />
                        <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Editar</Text>
                      </Pressable>
                      <Pressable style={[styles.menuOption, { borderBottomWidth: 0 }]} onPress={() => handleDeletePress(item.id)}>
                        <Trash2 size={14} color={colors.expense} />
                        <Text style={[styles.menuOptionText, { color: colors.expense }]}>Eliminar</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${visualProgress}%`, backgroundColor: item.barColor }]} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Límite: Bs. {item.amount}</Text>
                <Text style={[styles.footerText, { color: item.barColor }]}>
                  {item.statusText}
                </Text>
              </View>

              {item.overspentAmount > 0 && (
                <View style={styles.overspentBox}>
                  <Text style={styles.overspentText}>Monto rebasado: +Bs. {item.overspentAmount.toFixed(2)}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
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
               <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Categoría del Gasto</Text>
               <Pressable 
                 style={[styles.selectorBox, editingBudgetId && { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' }]} 
                 onPress={() => !editingBudgetId && setShowCategoryOptions(!showCategoryOptions)}
               >
                 <Text style={{ color: theme.colors.text }}>{selectedCategory || "Selecciona un rubro (Comida, Pasajes...)"}</Text>
                 {!editingBudgetId && <ChevronDown size={20} color="#6B7280" />}
               </Pressable>

               {showCategoryOptions && (
                 <View style={styles.optionsDropdown}>
                   <ScrollView nestedScrollEnabled={true}>
                     {myCategories.map((cat) => (
                       <Pressable key={cat.id} style={styles.optionItem} onPress={() => { setSelectedCategory(cat.name); setShowCategoryOptions(false); }}>
                         <Text style={{ color: theme.colors.text }}>{cat.name}</Text>
                       </Pressable>
                     ))}
                   </ScrollView>
                 </View>
               )}

               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Billetera / Cuenta de Origen</Text>
               <Pressable 
                 style={[styles.selectorBox, editingBudgetId && { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' }]} 
                 onPress={() => !editingBudgetId && setShowAccountOptions(!showAccountOptions)}
               >
                 <Text style={{ color: theme.colors.text }}>{selectedAccountName || "Selecciona una cuenta"}</Text>
                 {!editingBudgetId && <ChevronDown size={20} color="#6B7280" />}
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
               <TextInput 
                 style={styles.input} 
                 placeholder="0.00" 
                 placeholderTextColor="#888"
                 keyboardType="decimal-pad" 
                 value={amount}
                 onChangeText={(text) => {
                   const cleanText = text.replace(/[^0-9.,]/g, '');
                   setAmount(cleanText);
                 }} 
               />

               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Fecha de Inicio</Text>
               <Pressable style={styles.datePickerButton} onPress={() => setShowStartPicker(true)}>
                 <Text style={styles.dateText}>{startDate.toISOString().split('T')[0]}</Text>
                 <Calendar size={20} color="#082B8C" />
               </Pressable>
               {showStartPicker && (
                 <DateTimePicker 
                   value={startDate} 
                   mode="date" 
                   display="calendar" 
                   onChange={onStartDateChange} 
                   minimumDate={new Date()} 
                 />
               )}

               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Fecha de Fin</Text>
               <Pressable style={styles.datePickerButton} onPress={() => setShowEndPicker(true)}>
                 <Text style={styles.dateText}>{endDate.toISOString().split('T')[0]}</Text>
                 <Calendar size={20} color="#082B8C" />
               </Pressable>
               {showEndPicker && (
                 <DateTimePicker 
                   value={endDate} 
                   mode="date" 
                   display="calendar" 
                   onChange={onEndDateChange} 
                   minimumDate={startDate} 
                 />
               )}

               <Pressable style={styles.saveButton} onPress={handleCreateBudget} disabled={loading}>
                 <Text style={styles.saveButtonText}>{loading ? "Guardando..." : "Guardar Configuración"}</Text>
               </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AppSidebar visible={sidebarVisible} userName={profileName} selectedKey="budgets" visualMode={isDarkMode} onToggleVisualMode={setDarkMode} onClose={() => setSidebarVisible(false)} onSelectItem={(item) => { setSidebarVisible(false); router.replace(`/${item.key}`); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { height: 92, backgroundColor: '#082B8C', paddingHorizontal: 18, paddingTop: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitleBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: 28 }, 
  topTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, elevation: 3, position: 'relative' },
  notificationBanner: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 6, marginBottom: 10, gap: 6 },
  notificationText: { fontSize: 11, fontWeight: 'bold', flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  catTitle: { fontSize: 15, fontWeight: '900' },
  accountSubLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginTop: 2 },
  amountLabel: { fontSize: 15, fontWeight: 'bold' },
  contextMenu: { position: 'absolute', right: 0, top: 28, width: 110, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', elevation: 5, zIndex: 999, paddingVertical: 4 },
  menuOption: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  menuOptionText: { fontSize: 13, fontWeight: 'bold' },
  progressContainer: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  overspentBox: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#EEE' },
  overspentText: { fontSize: 12, color: '#C0392B', fontWeight: '900' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#F39C12', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 14, overflow: 'hidden' },
  modalHeader: { height: 54, backgroundColor: '#082B8C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  modalContent: { padding: 20 }, 
  inputLabel: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  selectorBox: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', marginBottom: 4 },
  optionsDropdown: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, maxHeight: 110, marginTop: 2, backgroundColor: '#FFF', marginBottom: 10 },
  optionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  input: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, fontSize: 15, marginBottom: 10, color: '#000', backgroundColor: '#FFF' },
  datePickerButton: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10, backgroundColor: '#FFF' },
  dateText: { fontSize: 15, color: '#333' },
  saveButton: { backgroundColor: '#F39C12', height: 48, borderRadius: 24, marginTop: 15, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '900', fontSize: 16 }
});