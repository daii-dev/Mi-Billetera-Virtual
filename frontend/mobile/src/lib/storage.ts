import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  hasSeenOnboarding: 'mbv_has_seen_onboarding',
  pendingFullName: 'mbv_pending_full_name',
  pendingSignupData: 'mbv_pending_signup_data',
};

export type PendingSignupData = {
  fullName: string;
  email: string;
};

export async function setHasSeenOnboarding() {
  await AsyncStorage.setItem(storageKeys.hasSeenOnboarding, 'true');
}

export async function getHasSeenOnboarding() {
  const value = await AsyncStorage.getItem(storageKeys.hasSeenOnboarding);
  return value === 'true';
}

export async function savePendingFullName(fullName: string) {
  await AsyncStorage.setItem(storageKeys.pendingFullName, fullName);
}

export async function getPendingFullName() {
  return await AsyncStorage.getItem(storageKeys.pendingFullName);
}

export async function clearPendingFullName() {
  await AsyncStorage.removeItem(storageKeys.pendingFullName);
}

export async function savePendingSignupData(fullName: string, email: string) {
  const data: PendingSignupData = {
    fullName,
    email: email.toLowerCase(),
  };

  await AsyncStorage.setItem(storageKeys.pendingSignupData, JSON.stringify(data));
}

export async function getPendingSignupData(): Promise<PendingSignupData | null> {
  const value = await AsyncStorage.getItem(storageKeys.pendingSignupData);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PendingSignupData;
  } catch {
    return null;
  }
}

export async function clearPendingSignupData() {
  await AsyncStorage.removeItem(storageKeys.pendingSignupData);
}