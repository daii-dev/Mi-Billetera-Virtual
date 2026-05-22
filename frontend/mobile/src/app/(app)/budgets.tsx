import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { useSupabase } from '@/lib/useSupabase';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { getBudgets, getCategorySpent, saveBudget, deleteBudget, getCategoriesByType } from '@/features/wallet/wallet.service'; 
import { Plus, Menu, LogOut, X, ChevronDown, Trash2, Edit2, MoreVertical} from 'lucide-react-native';
import { AppSidebar } from '@/components/sidebar/AppSidebar';

export default function BudgetsScreen() {
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const supabase = useSupabase();
  const { userId }  = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [sidebarVisible, setSidebarVisible] = useState(false); 
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [myCategories, setMyCategories] = useState<string[]>([]); // Estado para categorías reales

  const profileName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Usuario';
  const handleDelete = (id: string) => {
    Alert.alert(
      "Eliminar Presupuesto",
      "¿Estás seguro de que deseas borrar este presupuesto? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteBudget(supabase, id);
              loadBudgets(); // Recarga la lista
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el presupuesto");
            }
          } 
        }
      ]
    );
  };
  const handleEdit = (item: any) => {
  setSelectedCategory(item.category_name);
  setAmount(item.amount.toString());
  setModalVisible(true);
};

  const loadBudgets = async () => {
    if (!userId) return;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
      const data = await getBudgets(supabase, userId);
      
      const enriched = await Promise.all(data.map(async (b: any) => {
        const spent = await getCategorySpent(
          supabase, 
          userId, 
          b.category_name, 
          b.period_month, 
          b.period_year, 
          b.account_id,
          b.period_type
        );
        const progress = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        
        let barColor = '#4CAF50'; 
        if (progress >= 100) barColor = colors.expense; 
        else if (progress >= 70) barColor = '#FFC107'; 

        return { ...b, spent, progress, barColor };
      }));

      const currentPeriodBudgets = enriched.filter(b => 
        b.period_type === activeTab && 
        b.period_year === currentYear &&
        (b.period_type === 'weekly' || b.period_month === currentMonth)
      );

      const uniqueBudgets: any[] = [];
      const seenCategories = new Set<string>();

      currentPeriodBudgets.forEach((budget) => {
        const normalName = budget.category_name.trim().toLowerCase();
        if (!seenCategories.has(normalName)) {
          seenCategories.add(normalName);
          uniqueBudgets.push(budget);
        }
      });
      setBudgets(uniqueBudgets);
    } catch (e) {
      console.error("Error al cargar presupuestos unificados:", e);
    }
  };
  const loadCategories = async () => {
    if (!userId) return;
    try {
      const data = await getCategoriesByType(supabase, userId, 'expense');
      
      const names = data.map((cat: any) => cat.name);
      setMyCategories(names);
    } catch (e) {
      console.error("Error cargando categorías para presupuestos:", e);
    }
  };

  useEffect(() => { 
    loadBudgets();
    loadCategories(); 
  }, [activeTab]);
const handleCreateBudget = async () => {
    const clerkId = userId;
    if (!clerkId) {
      Alert.alert("Error de Sesión", "No se encontró un usuario autenticado.");
      return;
    }

    if (!selectedCategory || !amount) {
      Alert.alert("Campos requeridos", "Por favor selecciona una categoría e ingresa un monto.");
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Monto inválido", "El monto debe ser un número positivo.");
      return;
    }

    const alreadyExists = budgets.some(
      (b) => b.category_name.trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );

    if (alreadyExists) {
      Alert.alert(
        "Presupuesto Activo", 
        `Ya tienes un presupuesto asignado a "${selectedCategory}" para este período.\n\nSi deseas modificarlo, usa la opción "Editar".`
      );
      return;
    }

    setLoading(true);
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const alreadySpent = await getCategorySpent(
        supabase,
        clerkId, // Usamos la constante segura corregida
        selectedCategory,
        activeTab === 'monthly' ? currentMonth : null,
        currentYear,
        null,
        activeTab
      );
      if (alreadySpent > numAmount) {
        Alert.alert(
          "Límite Insuficiente",
          `No puedes poner un tope de Bs. ${numAmount.toFixed(2)} porque ya has gastado Bs. ${alreadySpent.toFixed(2)} en "${selectedCategory}" durante este período.\n\nPor favor, ingresa un monto mayor a lo gastado.`
        );
        setLoading(false);
        return;
      }

      const newBudget = {
        clerk_user_id: clerkId,
        category_name: selectedCategory,
        amount: numAmount,
        period_type: activeTab,
        period_month: currentMonth, 
        period_year: currentYear,
      };

      await saveBudget(supabase, newBudget);
      Alert.alert("¡Éxito!", "Presupuesto configurado correctamente.");
      setModalVisible(false);
      resetForm();
      loadBudgets();
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo guardar el presupuesto.");
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
        <Pressable onPress={() => setSidebarVisible(true)} hitSlop={15}>
          <Menu size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topTitleBox}>
          <Text style={styles.topTitle}>Presupuestos</Text>
        </View>
        <LogOut size={26} color="#FFFFFF" />
      </View>

      {/* Tabs */}
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
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
            No tienes presupuestos para este periodo.
          </Text>
        ) : (
          budgets.map((item) => {
  const dateLabel = item.period_type === 'monthly' 
    ? `${new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(item.period_year, item.period_month - 1))} ${item.period_year}`
    : "Esta semana (Lun - Dom)";

  // Forzamos el progreso visual para la barra (máximo 100)
  const visualProgress = Math.min(item.progress, 100);

  return (
    <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      
      {/* CABECERA LIMPIA */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.catTitle, { color: theme.colors.text }]}>{item.category_name}</Text>
          <Text style={{ fontSize: 12, color: '#888', fontWeight: '600' }}>{dateLabel}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.amountLabel, { color: item.barColor, marginRight: 10 }]}>
            -Bs. {item.spent.toFixed(2)}
          </Text>
          
          {/* ÚNICO MENÚ: TRES PUNTOS */}
          <View style={{ zIndex: 100 }}>
            <Pressable 
              onPress={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)} 
              hitSlop={20}
            >
              <MoreVertical size={24} color="#6B7280" />
            </Pressable>

            {activeMenuId === item.id && (
              <View style={[styles.floatingMenu, { backgroundColor: isDarkMode ? '#2D3748' : 'white' }]}>
                <Pressable 
                  style={styles.menuOption} 
                  onPress={() => { handleEdit(item); setActiveMenuId(null); }}
                >
                  <Edit2 size={16} color={theme.colors.text} />
                  <Text style={[styles.menuText, { color: theme.colors.text }]}>Editar</Text>
                </Pressable>

                <Pressable 
                  style={styles.menuOption} 
                  onPress={() => { handleDelete(item.id); setActiveMenuId(null); }}
                >
                  <Trash2 size={16} color={colors.expense} />
                  <Text style={[styles.menuText, { color: colors.expense }]}>Eliminar</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* BARRA DE PROGRESO (Limitada al 100% visual) */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${visualProgress}%`, backgroundColor: item.barColor }]} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>Límite: Bs. {item.amount}</Text>
        {/* Aquí corregimos el texto del 1000% */}
        <Text style={styles.footerText}>
          {item.progress > 100 ? 'Límite excedido' : `${item.progress.toFixed(0)}% usado`}
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

      {/* Modal de Nuevo Presupuesto */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Presupuesto</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}><X color="white" size={24} /></Pressable>
            </View>
            <View style={styles.modalContent}>
               <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Categoría</Text>
               <Pressable style={styles.selectorBox} onPress={() => setShowCategoryOptions(!showCategoryOptions)}>
                 <Text style={{ color: selectedCategory ? theme.colors.text : '#888' }}>
                   {selectedCategory || "Selecciona una categoría"}
                 </Text>
                 <ChevronDown size={20} color="#6B7280" />
               </Pressable>

               {/* CORRECCIÓN DEL DESPLEGABLE DE CATEGORÍAS */}
               {showCategoryOptions && (
                 <View style={[styles.optionsDropdown, { backgroundColor: theme.colors.card }]}>
                   <ScrollView nestedScrollEnabled={true}>
                     {myCategories.map((cat) => (
                       <Pressable key={cat} style={styles.optionItem} onPress={() => { setSelectedCategory(cat); setShowCategoryOptions(false); }}>
                         <Text style={{ color: theme.colors.text }}>{cat}</Text>
                       </Pressable>
                     ))}
                     {myCategories.length === 0 && (
                        <Text style={styles.noCategoriesText}>Primero registra un gasto para tener categorías reales.</Text>
                     )}
                   </ScrollView>
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

      <AppSidebar
        visible={sidebarVisible}
        userName={profileName}
        selectedKey="budgets"
        visualMode={isDarkMode}
        onToggleVisualMode={setDarkMode}
        onClose={() => setSidebarVisible(false)}
        onSelectItem={(item) => {
          setSidebarVisible(false);

          if (item.key === 'home') {
            router.push('/home');
          } else if (item.key === 'accounts') {
            router.push('/accounts');
          } else if (item.key === 'budgets') {
            router.push('/budgets');
          } else if (item.key === 'goals') {
            router.push('/goals');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { height: 92, backgroundColor: '#082B8C', paddingHorizontal: 18, paddingTop: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitleBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: 28 }, // Ajuste para centrar título
  topTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  tabContainer: { flexDirection: 'row', padding: 15, gap: 10, justifyContent: 'center' },
  tab: { flex: 1, height: 45, borderRadius: 22, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  tabActive: { backgroundColor: '#F39C12', borderColor: '#F39C12' },
  tabText: { fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#FFF' },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, elevation: 3 },
cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', // Alinea al inicio para que el menú no empuje todo
    marginBottom: 12 
  },
    catTitle: { fontSize: 18, fontWeight: '900' },
  amountLabel: { fontSize: 16, fontWeight: 'bold' },
  progressContainer: { height: 12, backgroundColor: '#E0E0E0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#F39C12', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 14, overflow: 'hidden' },
  modalHeader: { height: 54, backgroundColor: '#082B8C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  modalContent: { padding: 20, position: 'relative' }, // position relative para posicionar dropdown
  inputLabel: { fontSize: 15, fontWeight: '900', marginBottom: 8 },
  selectorBox: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  optionsDropdown: { 
    position: 'absolute', 
    top: 75, 
    left: 20, 
    right: 20, 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 8, 
    marginTop: 0,
    maxHeight: 180,
    zIndex: 10, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingMenu: {
  position: 'absolute',
  right: 0,
  top: 30, // Posiciona el menú debajo de los puntos
  borderRadius: 12,
  padding: 4,
  zIndex: 999, // Asegura que esté al frente
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  minWidth: 140,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
menuOption: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 12,
},
menuText: {
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 10,
},
  optionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  noCategoriesText: { padding: 15, textAlign: 'center', color: '#888', fontStyle: 'italic', fontSize: 13 },
  input: { height: 45, borderWidth: 1.5, borderColor: '#082B8C', borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  saveButton: { backgroundColor: '#F39C12', height: 48, borderRadius: 24, marginTop: 25, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  saveButtonText: { color: 'white', fontWeight: '900', fontSize: 16 }
});