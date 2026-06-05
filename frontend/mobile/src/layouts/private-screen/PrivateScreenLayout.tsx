import {
  ReactNode,
  useEffect,
  useState,
} from 'react';

import { router } from 'expo-router';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';

import { useProfileName } from '@/hooks/useProfileName';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { useSidebarSwipe } from '@/hooks/useSidebarSwipe';
import { AppHeader } from '@/layouts/header/AppHeader';
import { AppSidebar } from '@/layouts/sidebar/AppSidebar';
import { SidebarRouteKey } from '@/lib/sidebarNavigation';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useClerk } from '@clerk/expo';

type PrivateScreenLayoutProps = {
  title: string;
  currentKey: SidebarRouteKey;
  children: ReactNode;
};

export function PrivateScreenLayout({
  title,
  currentKey,
  children,
}: PrivateScreenLayoutProps) {
  const { signOut } = useClerk();
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const { profileName } = useProfileName();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] =
    useState<SidebarRouteKey>(currentKey);

  useEffect(() => {
    setSelectedSidebarItem(currentKey);
  }, [currentKey]);

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey,
    onClose: () => setSidebarVisible(false),
    onSelectedKeyChange: setSelectedSidebarItem,
  });

  const sidebarSwipeHandlers = useSidebarSwipe({
    onOpen: () => setSidebarVisible(true),
  });

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesión');
    }
  }

  return (
    <View
      style={styles.container}
      {...sidebarSwipeHandlers}
    >
      <AppHeader
        title={title}
        onOpenSidebar={() => setSidebarVisible(true)}
        onLogout={handleLogout}
      />

      {children}

      <AppSidebar
        visible={sidebarVisible}
        userName={profileName}
        selectedKey={selectedSidebarItem}
        visualMode={isDarkMode}
        onToggleVisualMode={setDarkMode}
        onClose={() => setSidebarVisible(false)}
        onSelectItem={handleSelectSidebarItem}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });
}