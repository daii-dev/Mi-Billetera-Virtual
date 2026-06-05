import { ComponentType } from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type EmptyStateIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type AppEmptyStateProps = {
  icon: EmptyStateIcon;
  title: string;
  description: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  iconSize?: number;
  minHeight?: number;
  marginTop?: number;
};

export function AppEmptyState({
  icon: Icon,
  title,
  description,
  iconBackgroundColor,
  iconColor = '#FFFFFF',
  iconSize = 38,
  minHeight = 220,
  marginTop = 18,
}: AppEmptyStateProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.emptyCard,
        {
          minHeight,
          marginTop,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIconBox,
          {
            backgroundColor: iconBackgroundColor ?? colors.primary,
          },
        ]}
      >
        <Icon
          size={iconSize}
          color={iconColor}
          strokeWidth={2.6}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    emptyCard: {
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 26,
      paddingVertical: 22,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    emptyIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 12,
    },
    emptyDescription: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}