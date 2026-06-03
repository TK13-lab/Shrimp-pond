import * as SecureStore from 'expo-secure-store';

import { AuthSession } from './auth.types';

const AUTH_SESSION_KEY = 'shrimp_pond_auth_session_v1';

export async function getStoredSession(): Promise<AuthSession | null> {
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
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}
