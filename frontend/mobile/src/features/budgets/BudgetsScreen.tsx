import React, {
  useEffect,
  useState,
} from 'react';

import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronDown,
  Hourglass,
  Pencil,
  Tags,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react-native';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  deleteBudget,
  getBudgetAccountSpent,
  getBudgets,
  getCategoriesByType,
  getUserAccounts,
} from '@/features/wallet/wallet.service';
import {
  PrivateScreenLayout,
} from '@/layouts/private-screen/PrivateScreenLayout';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';
import { useAuth } from '@clerk/expo';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BudgetsScreen() {
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const supabase = useSupabase();
  const { userId } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [myAccounts, setMyAccounts] = useState<any[]>([]);
  const [myCategories, setMyCategories] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);  
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
            statusText = 'Excedido';
          } else if (progress >= 70) {
            barColor = '#FFC107'; 
            statusText = 'Cerca del límite';
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
    
    // Solo bloqueamos la fecha de inicio pasada si es un presupuesto NUEVO. 
    // Al editar, permitimos guardar fechas pasadas por si el presupuesto ya había empezado.
    if (!editingBudgetId && compareStartDate < today) {
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

    // 🔥 SOLUCIÓN BUG 1: Le quitamos la excepción. Ahora la validación de saldo te frenará 
    // tanto si estás creando como si estás editando un presupuesto.
    if (numAmount > Number(accountObj.current_balance)) {
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
        // 🔥 SOLUCIÓN BUG 2: Ahora sí enviamos las fechas nuevas y el monto a Supabase
        const { error: updateError } = await supabase
          .from('budgets')
          .update({
            account_id: selectedAccountId,
            category_name: selectedCategory,
            amount: numAmount,
            start_date: startDateString,
            end_date: endDateString,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBudgetId);

        if (updateError) throw updateError;
        Alert.alert("¡Éxito!", "Presupuesto actualizado correctamente.");
      } else {
        const { data: existingDuplicate, error: checkError } = await supabase
          .from('budgets')
          .select('id, start_date, end_date')
          .eq('clerk_user_id', clerkId)
          .eq('account_id', selectedAccountId)
          .eq('category_name', selectedCategory)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingDuplicate) {
          Alert.alert(
            "Presupuesto Duplicado ⚠️",
            `Ya tienes configurado un presupuesto de "${selectedCategory}" para esta billetera. Si deseas cambiar el monto límite, búscalo en la lista principal y presiona "Editar".`
          );
          setLoading(false);
          return;
        }

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
  return (
    <PrivateScreenLayout
      title="Presupuestos"
      currentKey="budgets"
    >
      <ScrollView contentContainerStyle={styles.content}>
        {budgets.map((item) => {
          const visualProgress = Math.min(item.progress, 100);
          const isExceeded = item.progress >= 100;
          const isNearLimit = item.progress >= 70 && item.progress < 100;

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
                  <View style={styles.budgetDetailRow}>
                    <Tags size={15} color={theme.colors.textSecondary} />
                    <Text style={[styles.budgetDetailText, { color: theme.colors.textSecondary }]}>
                      Categoría: {item.category_name}
                    </Text>
                  </View>

                  <View style={styles.budgetDetailRow}>
                    <WalletCards size={15} color={theme.colors.textSecondary} />
                    <Text style={[styles.budgetDetailText, { color: theme.colors.textSecondary }]}>
                      Cuenta: {item.account?.name || 'Personal'}
                    </Text>
                  </View>

                  <View style={styles.budgetDetailRow}>
                    <CalendarDays size={15} color="#F39C12" />
                    <Text style={styles.rangeText}>
                      Rango: {item.start_date} al {item.end_date}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.budgetRightBox}>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => handleEditPress(item)}
                      hitSlop={10}
                      style={[
                        styles.iconButton,
                        {backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',},
                      ]}
                    >
                      <Pencil
                        size={18}
                        color={isDarkMode ? '#60A5FA' : colors.primary}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeletePress(item.id)}
                      hitSlop={10}
                      style={[
                        styles.iconButton,
                        {backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',},
                      ]}
                    >
                      <Trash2 size={18} color={colors.expense} />
                    </Pressable>
                  </View>

                  <Text style={[styles.amountLabel, { color: item.barColor }]}>
                    -Bs. {item.spent.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${visualProgress}%`, backgroundColor: item.barColor }]} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                  Límite: Bs. {item.amount}
                </Text>

                <View style={styles.statusFooterBox}>
                  {isExceeded && (
                    <AlertTriangle size={14} color={item.barColor} />
                  )}

                  {isNearLimit && (
                    <Hourglass size={14} color={item.barColor} />
                  )}

                  <Text
                    style={[
                      styles.footerText,
                      {
                        color: isExceeded || isNearLimit
                          ? item.barColor
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {item.statusText}
                  </Text>
                </View>
              </View>

              {item.overspentAmount > 0 && (
                <View style={[styles.overspentBox, { borderTopColor: theme.colors.border }]}>
                  <Text style={styles.overspentText}>Monto rebasado: +Bs. {item.overspentAmount.toFixed(2)}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <FloatingActionButton
        color="#F39C12"
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBudgetId ? 'Modificar Presupuesto' : 'Nuevo Presupuesto'}</Text>
              <Pressable onPress={() => { setModalVisible(false); resetForm(); }} hitSlop={10}><X color="white" size={24} /></Pressable>
            </View>
            
            <View style={styles.modalContent}>
               <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Seleccionar Categoria de Gasto</Text>
               <Pressable 
                 style={[
                   styles.selectorBox, 
                   { backgroundColor: theme.colors.background, borderColor: '#082B8C' },
                   editingBudgetId && { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', borderColor: '#9CA3AF' }
                 ]} 
                 onPress={() => !editingBudgetId && setShowCategoryOptions(!showCategoryOptions)}
               >
                 <Text style={{ color: theme.colors.text }}>{selectedCategory || "Selecciona un rubro (Comida, Pasajes...)"}</Text>
                 {!editingBudgetId && <ChevronDown size={20} color="#6B7280" />}
               </Pressable>

               {showCategoryOptions && (
                 <View style={[styles.optionsDropdown, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                   <ScrollView nestedScrollEnabled={true}>
                     {myCategories.map((cat) => (
                       <Pressable key={cat.id} style={[styles.optionItem, { borderBottomColor: theme.colors.border }]} onPress={() => { setSelectedCategory(cat.name); setShowCategoryOptions(false); }}>
                         <Text style={{ color: theme.colors.text }}>{cat.name}</Text>
                       </Pressable>
                     ))}
                   </ScrollView>
                 </View>
               )}

               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Seleccionar Cuenta</Text>
               <Pressable 
                 style={[
                   styles.selectorBox, 
                   { backgroundColor: theme.colors.background, borderColor: '#082B8C' },
                   editingBudgetId && { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', borderColor: '#9CA3AF' }
                 ]} 
                 onPress={() => !editingBudgetId && setShowAccountOptions(!showAccountOptions)}
               >
                 <Text style={{ color: theme.colors.text }}>{selectedAccountName || "Selecciona una cuenta"}</Text>
                 {!editingBudgetId && <ChevronDown size={20} color="#6B7280" />}
               </Pressable>

               {showAccountOptions && (
                 <View style={[styles.optionsDropdown, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                   <ScrollView nestedScrollEnabled={true}>
                     {myAccounts.map((acc) => (
                       <Pressable key={acc.id} style={[styles.optionItem, { borderBottomColor: theme.colors.border }]} onPress={() => { setSelectedAccountId(acc.id); setSelectedAccountName(acc.name); setShowAccountOptions(false); }}>
                         <Text style={{ color: theme.colors.text }}>{acc.name} (Saldo: Bs. {acc.current_balance})</Text>
                       </Pressable>
                     ))}
                   </ScrollView>
                 </View>
               )}

               <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 12 }]}>Monto Límite (Bs.)</Text>
               <TextInput 
                 style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: '#082B8C' }]} 
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
               <Pressable style={[styles.datePickerButton, { backgroundColor: theme.colors.background, borderColor: '#082B8C' }]} onPress={() => setShowStartPicker(true)}>
                 <Text style={[styles.dateText, { color: theme.colors.text }]}>{startDate.toISOString().split('T')[0]}</Text>
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
               <Pressable style={[styles.datePickerButton, { backgroundColor: theme.colors.background, borderColor: '#082B8C' }]} onPress={() => setShowEndPicker(true)}>
                 <Text style={[styles.dateText, { color: theme.colors.text }]}>{endDate.toISOString().split('T')[0]}</Text>
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
    </PrivateScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, elevation: 3, position: 'relative' },
  notificationBanner: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 6, marginBottom: 10, gap: 6 },
  notificationText: { fontSize: 11, fontWeight: 'bold', flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  budgetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rangeText: {
    fontSize: 11,
    color: '#F39C12',
    fontWeight: '700',
  },
  catTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountSubLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  budgetDetailText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusFooterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  amountLabel: { fontSize: 15, fontWeight: 'bold' },
  budgetRightBox: {
    minHeight: 68,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  overspentBox: { marginTop: 8, paddingTop: 6, borderTopWidth: 1 },
  overspentText: { fontSize: 12, color: '#C0392B', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 14, overflow: 'hidden' },
  modalHeader: { height: 54, backgroundColor: '#082B8C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  modalContent: { padding: 20 }, 
  inputLabel: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  selectorBox: { height: 45, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  optionsDropdown: { borderWidth: 1, borderRadius: 8, maxHeight: 110, marginTop: 2, marginBottom: 10 },
  optionItem: { padding: 10, borderBottomWidth: 1 },
  input: { height: 45, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, fontSize: 15, marginBottom: 10 },
  datePickerButton: { height: 45, borderWidth: 1.5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10 },
  dateText: { fontSize: 15 },
  saveButton: { backgroundColor: '#F39C12', height: 48, borderRadius: 24, marginTop: 15, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '900', fontSize: 16 }
});