import { useState } from 'react';

import { router } from 'expo-router';
import { PiggyBank } from 'lucide-react-native';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import {
  isValidMoneyInput,
  parseMoneyInput,
  sanitizeMoneyInput,
} from '@/features/wallet/amount.utils';
import { setInitialBalance } from '@/features/wallet/wallet.service';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import { useAuth } from '@clerk/expo';

export default function InitialBalanceScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const supabase = useSupabase();

  const [amountText, setAmountText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    const cleanAmountText = amountText.trim() || '0';

    if (!isValidMoneyInput(cleanAmountText)) {
      Alert.alert(
        'Monto inválido',
        'Usa coma decimal y máximo dos decimales. Ejemplo: 120,50'
      );
      return;
    }

    const amount = parseMoneyInput(cleanAmountText);

    if (amount < 0) {
      Alert.alert('Monto inválido', 'El saldo inicial no puede ser negativo');
      return;
    }

    try {
      setLoading(true);
      await setInitialBalance(supabase, userId, amount);
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo guardar el saldo inicial');
    } finally {
      setLoading(false);
    }
  }

  function handleChangeAmount(value: string) {
    setAmountText(sanitizeMoneyInput(value, amountText));
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Text style={styles.title}>Configura tu saldo inicial</Text>
      <Text style={styles.subtitle}>Ingresa el monto con el que iniciarás</Text>

      <View style={styles.iconContainer}>
        <PiggyBank size={110} color={colors.secondary} strokeWidth={2.6} />
      </View>

      <View style={styles.inputBox}>
        <AppInput
          value={amountText}
          onChangeText={handleChangeAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
          leftIcon={<Text style={styles.prefix}>Bs.</Text>}
        />

        <Text style={styles.currencyText}>Moneda fija: Bolivianos (Bs.)</Text>
      </View>

      <View style={styles.buttonBox}>
        <AppButton title="Comenzar" onPress={handleSave} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 26,
    color: '#4B5563',
    fontSize: 15,
    textAlign: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 42,
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor: '#D7F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    width: '82%',
  },
  prefix: {
    fontSize: 16,
    fontWeight: '900',
    color: '#555555',
  },
  currencyText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonBox: {
    width: '100%',
    marginTop: 68,
  },
});