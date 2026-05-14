import { useState } from 'react';

import { router } from 'expo-router';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { onboardingPages } from '@/features/onboarding/onboarding.data';
import { setHasSeenOnboarding } from '@/lib/storage';
import { colors } from '@/theme/colors';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const page = onboardingPages[pageIndex];

  async function finishOnboarding() {
    await setHasSeenOnboarding();
    router.replace('/(auth)/sign-in');
  }

  function nextPage() {
    if (pageIndex < onboardingPages.length - 1) {
      setPageIndex(pageIndex + 1);
      return;
    }

    finishOnboarding();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Mi Billetera Virtual</Text>
        <Text style={styles.slogan}>Tu dinero, bajo control</Text>
      </View>

      <View style={styles.imageBox}>
        <Text style={styles.image}>{page.image}</Text>
      </View>

      <Text style={styles.title}>{page.title}</Text>
      <Text style={styles.description}>{page.description}</Text>

      <View style={styles.dots}>
        {onboardingPages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === pageIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>

      <Pressable onPress={nextPage} style={styles.nextButton}>
        <Text style={styles.nextButtonText}>
          {pageIndex === onboardingPages.length - 1 ? 'Comenzar' : 'Siguiente'}
        </Text>
      </Pressable>

      <Pressable onPress={finishOnboarding} style={styles.skipButton}>
        <Text style={styles.skipText}>Omitir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  header: {
    marginTop: 92,
    alignItems: 'center',
  },
  appName: {
    fontSize: 25,
    fontWeight: '900',
    color: colors.primary,
  },
  slogan: {
    marginTop: 6,
    color: '#B7B7B7',
    fontWeight: '700',
  },
  imageBox: {
    marginTop: 78,
    height: 135,
    width: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    fontSize: 100,
  },
  title: {
    marginTop: 54,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  description: {
    width: width - 70,
    marginTop: 22,
    fontSize: 15,
    lineHeight: 20,
    color: '#424242',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 72,
    marginBottom: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 10,
    backgroundColor: '#BDBDBD',
  },
  activeDot: {
    width: 22,
    backgroundColor: colors.warning,
  },
  nextButton: {
    width: '100%',
    height: 44,
    backgroundColor: colors.secondary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 3,
    elevation: 4,
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  skipButton: {
    marginTop: 20,
  },
  skipText: {
    color: colors.primary,
    fontWeight: '900',
  },
});