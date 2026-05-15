import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

type SidebarItem = {
  key: string;
  label: string;
  icon: string;
};

const sidebarItems: SidebarItem[] = [
  { key: 'home', label: 'Inicio', icon: '🏠' },
  { key: 'accounts', label: 'Cuentas', icon: '👛' },
  { key: 'categories', label: 'Categorias', icon: '🔷' },
  { key: 'budgets', label: 'Presupuestos', icon: '💰' },
  { key: 'savings', label: 'Metas de Ahorro', icon: '🐷' },
  { key: 'planned-payments', label: 'Pagos Planificados', icon: '🤲' },
  { key: 'shopping-list', label: 'Lista de Compras', icon: '🛒' },
  { key: 'debts', label: 'Deudas', icon: '💸' },
  { key: 'collections', label: 'Cobros', icon: '📖' },
  { key: 'statistics', label: 'Estadisticas', icon: '📈' },
];

type AppSidebarProps = {
  visible: boolean;
  userName: string;
  selectedKey: string;
  visualMode: boolean;
  onToggleVisualMode: (value: boolean) => void;
  onClose: () => void;
  onSelectItem: (item: SidebarItem) => void;
};

export function AppSidebar({
  visible,
  userName,
  selectedKey,
  visualMode,
  onToggleVisualMode,
  onClose,
  onSelectItem,
}: AppSidebarProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.sidebar}>
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logo}>💵</Text>
            </View>

            <View style={styles.headerTextBox}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.appName}>Mi Billetera Virtual</Text>
            </View>
          </View>

          <View style={styles.menuContainer}>
            {sidebarItems.map((item) => {
              const isSelected = selectedKey === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => onSelectItem(item)}
                  style={[
                    styles.menuItem,
                    isSelected && styles.menuItemSelected,
                  ]}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.menuText,
                      isSelected && styles.menuTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.visualModeBox}>
            <Text style={styles.visualModeText}>MODO VISUAL</Text>

            <Switch
              value={visualMode}
              onValueChange={onToggleVisualMode}
              trackColor={{
                false: '#D9D9D9',
                true: '#A7E3FF',
              }}
              thumbColor={visualMode ? colors.primary : '#F4F4F4'}
            />
          </View>
        </View>

        <Pressable style={styles.overlay} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 270,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  header: {
    height: 92,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 16,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 28,
  },
  headerTextBox: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 3,
  },
  menuContainer: {
    paddingTop: 22,
    paddingHorizontal: 14,
    flex: 1,
  },
  menuItem: {
    height: 42,
    borderRadius: 22,
    paddingHorizontal: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemSelected: {
    backgroundColor: '#AEE4FF',
  },
  menuIcon: {
    width: 28,
    fontSize: 20,
    textAlign: 'center',
  },
  menuText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#4A4A4A',
  },
  menuTextSelected: {
    color: colors.primary,
  },
  visualModeBox: {
    height: 112,
    borderTopWidth: 1,
    borderTopColor: '#A8A8A8',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visualModeText: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '900',
  },
});