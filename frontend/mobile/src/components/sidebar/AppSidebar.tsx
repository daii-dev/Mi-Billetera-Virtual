import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

const SIDEBAR_WIDTH = 270;

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
  const [shouldRender, setShouldRender] = useState(visible);

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function animateOpen() {
    translateX.setValue(-SIDEBAR_WIDTH);
    overlayOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 230,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function animateClose(afterClose?: () => void) {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SIDEBAR_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShouldRender(false);
      afterClose?.();
    });
  }

  function closeSidebar() {
    animateClose(onClose);
  }

  function restoreSidebarPosition() {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const closePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isSwipeToLeft = gestureState.dx < -12;

        return isHorizontalSwipe && isSwipeToLeft;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          const nextTranslate = Math.max(-SIDEBAR_WIDTH, gestureState.dx);
          const nextOpacity = Math.max(0, 1 + gestureState.dx / SIDEBAR_WIDTH);

          translateX.setValue(nextTranslate);
          overlayOpacity.setValue(nextOpacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose =
          gestureState.dx < -70 ||
          gestureState.vx < -0.5;

        if (shouldClose) {
          closeSidebar();
        } else {
          restoreSidebarPosition();
        }
      },
      onPanResponderTerminate: () => {
        restoreSidebarPosition();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);

      requestAnimationFrame(() => {
        animateOpen();
      });
    }
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSidebar}
    >
      <View
        style={styles.modalContainer}
        {...closePanResponder.panHandlers}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeSidebar}
        >
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX }],
            },
          ]}
        >
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    elevation: 8,
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
    height: 90,
    marginBottom: 65,
    borderTopWidth: 1,
    borderTopColor: '#A8A8A8',
    paddingHorizontal: 28,
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