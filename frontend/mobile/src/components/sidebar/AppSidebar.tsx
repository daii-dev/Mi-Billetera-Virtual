import {
  ComponentType,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  BarChart3,
  CalendarClock,
  ChartPie,
  FileText,
  Home,
  PiggyBank,
  Tags,
  WalletCards,
} from 'lucide-react-native';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

const SIDEBAR_WIDTH = 270;
const appLogo = require('../../../assets/logo-app.png');

type SidebarIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type SidebarItem = {
  key: string;
  label: string;
  icon: SidebarIcon;
};

const sidebarItems: SidebarItem[] = [
  { key: 'home', label: 'Inicio', icon: Home },
  { key: 'accounts', label: 'Cuentas', icon: WalletCards },
  { key: 'categories', label: 'Categorías', icon: Tags },
  { key: 'budgets', label: 'Presupuestos', icon: ChartPie },
  { key: 'goals', label: 'Metas de Ahorro', icon: PiggyBank },
  { key: 'planned-payments', label: 'Pagos Planificados', icon: CalendarClock },
  { key: 'reports', label: 'Reportes', icon: FileText },
  { key: 'statistics', label: 'Estadísticas', icon: BarChart3 },
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

  const { theme } = useAppTheme();
  const styles = createStyles(theme);

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
              <Image
                source={appLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />
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
              const Icon = item.icon;

              const iconColor = isSelected
                ? theme.mode === 'dark'
                  ? '#FFFFFF'
                  : colors.primary
                : theme.colors.textSecondary;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => onSelectItem(item)}
                  style={[
                    styles.menuItem,
                    isSelected && styles.menuItemSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.menuIconBox,
                      isSelected && styles.menuIconBoxSelected,
                    ]}
                  >
                    <Icon
                      size={20}
                      color={iconColor}
                      strokeWidth={2.6}
                    />
                  </View>

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
            <Text style={styles.visualModeText}>
              {visualMode ? 'MODO OSCURO' : 'MODO CLARO'}
            </Text>

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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
    },
    sidebar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: theme.colors.surface,
      zIndex: 2,
      elevation: 8,
    },
    header: {
      height: 92,
      backgroundColor: theme.colors.sidebarHeader,
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 28,
      paddingHorizontal: 16,
    },
    logoBox: {
      width: 52,
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: 52,
      height: 52,
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
      backgroundColor: theme.colors.sidebarSelected,
    },
    menuIconBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'dark' ? '#1E293B' : '#F3F4F6',
    },
    menuIconBoxSelected: {
      backgroundColor: theme.mode === 'dark' ? '#2563EB' : '#DDF3FF',
    },
    menuText: {
      marginLeft: 10,
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textSecondary,
    },
    menuTextSelected: {
      color: theme.colors.text,
    },
    visualModeBox: {
      height: 90,
      marginBottom: 65,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    visualModeText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '900',
    },
  });
}
