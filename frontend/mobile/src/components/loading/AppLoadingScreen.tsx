import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

type AppLoadingScreenProps = {
  message: string;
};

export function AppLoadingScreen({
  message,
}: AppLoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/logo-app.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <Text style={styles.title}>Mi Billetera Virtual</Text>

      <Text style={styles.subtitle}>
        {message}
      </Text>

      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});