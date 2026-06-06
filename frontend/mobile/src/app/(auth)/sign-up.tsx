import { useState } from 'react';

import { router } from 'expo-router';
import {
  Eye,
  Lock,
  Mail,
  User,
} from 'lucide-react-native';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import {
  hasNameAndLastName,
  isValidFullName,
  normalizeFullName,
  sanitizeFullNameInput,
} from '@/features/auth/auth.validators';
import { savePendingSignupData } from '@/lib/storage';
import { colors } from '@/theme/colors';
import { useSignUp } from '@clerk/expo';

export default function SignUpScreen() {
  const { signUp } = useSignUp();

  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function handleChangeFullName(value: string) {
    setFullName(sanitizeFullNameInput(value));
  }

  const [securePassword, setSecurePassword] = useState(true);
  const [loading, setLoading] = useState(false);

  function validatePassword(password: string): string | null {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!/[A-ZÁÉÍÓÚÑ]/.test(password)) {
      return 'La contraseña debe tener al menos una letra mayúscula';
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\/\\[\];'`~]/.test(password)) {
      return 'La contraseña debe tener al menos un símbolo especial';
    }

    return null;
  }

  function getClerkErrorMessage(error: any): string {
    console.log('CLERK SIGN UP ERROR RAW:', JSON.stringify(error, null, 2));

    const firstError = error?.errors?.[0];

    return (
      firstError?.longMessage ||
      firstError?.message ||
      firstError?.code ||
      error?.message ||
      ''
    );
  }

  function translateClerkError(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('online data breach') ||
      lowerMessage.includes('data breach') ||
      lowerMessage.includes('breached') ||
      lowerMessage.includes('pwned')
    ) {
      return 'Esta contraseña apareció en una filtración de datos. Por seguridad, usa una contraseña diferente.';
    }

    if (
      lowerMessage.includes('already exists') ||
      lowerMessage.includes('already in use') ||
      lowerMessage.includes('is taken') ||
      lowerMessage.includes('identifier_already_exists') ||
      lowerMessage.includes('form_identifier_exists')
    ) {
      return 'Ya existe una cuenta registrada con este correo. Intenta iniciar sesión o usa otro correo.';
    }

    if (
      lowerMessage.includes('passwords must be') ||
      lowerMessage.includes('characters or more')
    ) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (
      lowerMessage.includes('password is not strong enough') ||
      lowerMessage.includes('given password is not strong enough') ||
      lowerMessage.includes('not strong enough')
    ) {
      return 'La contraseña no es suficientemente segura. Usa al menos 8 caracteres, una mayúscula y un símbolo especial.';
    }

    if (
      lowerMessage.includes('invalid email') ||
      lowerMessage.includes('email address is invalid') ||
      lowerMessage.includes('form_param_format_invalid')
    ) {
      return 'Ingresa un correo electrónico válido.';
    }

    if (
      lowerMessage.includes('captcha') ||
      lowerMessage.includes('bot') ||
      lowerMessage.includes('challenge')
    ) {
      return 'No se pudo validar la protección de seguridad. Cierra y vuelve a abrir la app.';
    }

    if (
      lowerMessage.includes('verification') ||
      lowerMessage.includes('verify') ||
      lowerMessage.includes('missing_requirements')
    ) {
      return 'Tu cuenta requiere verificación por correo. Para continuar sin código, desactiva la verificación en Clerk.';
    }

    return message || 'No se pudo crear la cuenta. Revisa los datos e intenta nuevamente.';
  }

  async function handleCreateAccount() {
    const cleanFullName = normalizeFullName(fullName);
    const cleanEmail = emailAddress.trim().toLowerCase();

    if (!cleanFullName) {
      Alert.alert('Campo requerido', 'Ingresa tu nombre completo');
      return;
    }

    if (!isValidFullName(cleanFullName)) {
      Alert.alert(
        'Nombre inválido',
        'El nombre completo solo puede contener letras y espacios.'
      );
      return;
    }

    if (!hasNameAndLastName(cleanFullName)) {
      Alert.alert(
        'Nombre incompleto',
        'Ingresa tu nombre y apellido.'
      );
      return;
    }

    if (!cleanEmail) {
      Alert.alert('Campo requerido', 'Ingresa tu correo electrónico');
      return;
    }

    if (!cleanEmail.includes('@')) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido');
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      Alert.alert('Contraseña inválida', passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);

      if (!signUp) {
        Alert.alert('Error', 'Clerk todavía no está listo');
        return;
      }

      await savePendingSignupData(cleanFullName, cleanEmail);

      const { error } = await signUp.password({
        emailAddress: cleanEmail,
        password,
      });

      if (error) {
        const clerkMessage = getClerkErrorMessage(error);

        Alert.alert(
          'Error al registrarse',
          translateClerkError(clerkMessage)
        );
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: () => {
            router.replace('/');
          },
        });
        return;
      }

      Alert.alert(
        'Verificación requerida',
        'Tu cuenta fue iniciada, pero Clerk todavía exige verificar el correo.'
      );
    } catch (error: any) {
      const clerkMessage = getClerkErrorMessage(error);

      Alert.alert('Error al registrarse', translateClerkError(clerkMessage));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Text style={styles.title}>Crear cuenta nueva</Text>
      <Text style={styles.subtitle}>Comienza tu camino financiero</Text>

      <View style={styles.form}>
        <AppInput
          value={fullName}
          onChangeText={handleChangeFullName}
          placeholder="Nombre completo"
          leftIcon={<User size={20} color={colors.secondary} />}
        />

        <AppInput
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          leftIcon={<Mail size={20} color={colors.secondary} />}
        />

        <AppInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry={securePassword}
          leftIcon={<Lock size={20} color={colors.secondary} />}
        />

        <AppInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmar contraseña"
          secureTextEntry={securePassword}
          leftIcon={<Lock size={20} color={colors.secondary} />}
          rightIcon={
            <Pressable onPress={() => setSecurePassword(!securePassword)}>
              <Eye size={20} color="#9CA3AF" />
            </Pressable>
          }
        />

        <AppButton
          title="Crear cuenta"
          onPress={handleCreateAccount}
          loading={loading}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>

        <Pressable onPress={() => router.push('/sign-in')}>
          <Text style={styles.footerLink}>Inicia sesión</Text>
        </Pressable>
      </View>

      <View nativeID="clerk-captcha" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 18,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 38,
    gap: 22,
  },
  footer: {
    marginTop: 30,
    marginBottom: 40,
    flexDirection: 'row',
  },
  footerText: {
    color: '#555555',
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});