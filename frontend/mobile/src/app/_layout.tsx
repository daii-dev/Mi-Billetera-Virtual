import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider } from '@/theme/ThemeContext';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY en .env');
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <StatusBar style="dark" />
        <Slot />
      </ThemeProvider>
    </ClerkProvider>
  );
}