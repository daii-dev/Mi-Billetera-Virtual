import { ReactNode } from 'react';

import {
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type IconActionButtonProps = {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
};

export function IconActionButton({
  children,
  onPress,
  disabled = false,
}: IconActionButtonProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    button: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
    },
    disabled: {
      opacity: 0.6,
    },
  });
}