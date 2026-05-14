import { ReactNode } from 'react';

import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

type AppInputProps = TextInputProps & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function AppInput({ leftIcon, rightIcon, style, ...props }: AppInputProps) {
  return (
    <View style={styles.container}>
      {leftIcon && <View style={styles.icon}>{leftIcon}</View>}

      <TextInput
        placeholderTextColor="#A8A8A8"
        style={[styles.input, style]}
        autoCapitalize="none"
        {...props}
      />

      {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
  },
  icon: {
    marginHorizontal: 6,
  },
});