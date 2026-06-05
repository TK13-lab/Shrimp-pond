import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { AuthSession } from './auth.types';

const AUTH_SESSION_KEY = 'shrimp_pond_auth_session_v1';

export async function getStoredSession(): Promise<AuthSession | null> {
  const webStorage = getWebStorage();

  if (webStorage) {
    const rawValue = webStorage.getItem(AUTH_SESSION_KEY);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as AuthSession;
    } catch {
      webStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  }

  const rawValue = await SecureStore.getItemAsync(AUTH_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
    return null;
  }
}

export async function saveStoredSession(session: AuthSession): Promise<void> {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return;
  }

  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
