import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  hasSeenOnboarding: 'mbv_has_seen_onboarding',
  pendingFullName: 'mbv_pending_full_name',
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