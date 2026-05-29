import {
  LogOut,
  Menu,
} from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type AppHeaderProps = {
  title: string;
  onOpenSidebar: () => void;
  onLogout: () => void;
};

export function AppHeader({
  title,
  onOpenSidebar,
  onLogout,
}: AppHeaderProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.topBar}>
      <View style={styles.topTitleBox}>
        <Pressable
          onPress={onOpenSidebar}
          hitSlop={10}
        >
          <Menu size={28} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.topTitle}>{title}</Text>
      </View>

      <Pressable onPress={onLogout} hitSlop={10}>
        <LogOut size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    topBar: {
      height: 92,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 18,
      paddingTop: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topTitleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    topTitle: {
      color: '#FFFFFF',
      fontSize: 25,
      fontWeight: '900',
    },
  });
}