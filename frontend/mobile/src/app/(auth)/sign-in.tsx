import {
  useEffect,
  useState,
} from 'react';

import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Eye,
  Lock,
  Mail,
} from 'lucide-react-native';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { colors } from '@/theme/colors';
import {
  useSignIn,
  useSSO,
} from '@clerk/expo';

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void WebBrowser.warmUpAsync();

    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();

  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignIn() {
    if (!emailAddress.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu correo electrónico');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu contraseña');
      return;
    }

    try {
      setLoading(true);

      if (!signIn) {
        Alert.alert('Error', 'Clerk todavía no está listo');
        return;
      }

      const { error } = await signIn.password({
        emailAddress: emailAddress.trim(),
        password,
      });

      if (error) {
        Alert.alert(
          'Error al iniciar sesión',
          error.message || 'Correo o contraseña incorrectos'
        );
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: () => {
            router.replace('/');
          },
        });

        return;
      }

      Alert.alert('Atención', 'No se pudo completar el inicio de sesión');
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.message ||
        error?.message ||
        'Correo o contraseña incorrectos';

      Alert.alert('Error al iniciar sesión', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setGoogleLoading(true);

      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'mibilleteravirtual',
        path: 'oauth-callback',
      });

      console.log('GOOGLE REDIRECT URL:', redirectUrl);

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      if (createdSessionId) {
        await setActive?.({
          session: createdSessionId,
        });

        router.replace('/');
        return;
      }

      Alert.alert(
        'Google no completado',
        'No se pudo crear la sesión. Revisa la configuración de Google en Clerk.'
      );
    } catch (error: any) {
      console.log('GOOGLE LOGIN ERROR:', JSON.stringify(error, null, 2));

      const message =
        error?.errors?.[0]?.message ||
        error?.message ||
        'No se pudo continuar con Google';

      Alert.alert('Error con Google', message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.logoBox}>
        <Image
          source={require('../../../assets/logo-app.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Bienvenido a{'\n'}tu billetera virtual</Text>
      <Text style={styles.subtitle}>Inicia sesión o crea una cuenta nueva</Text>

      <View style={styles.form}>
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
          rightIcon={
            <Pressable onPress={() => setSecurePassword(!securePassword)}>
              <Eye size={20} color="#9CA3AF" />
            </Pressable>
          }
        />

        <AppButton title="Iniciar sesión" onPress={handleSignIn} loading={loading} />

        <View style={styles.separator}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>o continua con</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          style={[styles.googleButton, googleLoading && styles.disabledButton]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>
            {googleLoading ? 'Abriendo Google...' : 'Google'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta? </Text>

        <Pressable onPress={() => router.push('/sign-up')}>
          <Text style={styles.footerLink}>Regístrate</Text>
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
  },
  logoBox: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  title: {
    marginTop: 16,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 28,
    fontSize: 14,
    color: '#4B5563',
  },
  form: {
    width: '100%',
    marginTop: 24,
    gap: 22,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -12,
  },
  forgotText: {
    color: '#666666',
    fontWeight: '700',
    fontSize: 13,
  },
  separator: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#BDBDBD',
  },
  separatorText: {
    color: '#666666',
    fontWeight: '700',
    fontSize: 13,
  },
  googleButton: {
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 20,
    fontWeight: '900',
  },
  googleText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '900',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 85,
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