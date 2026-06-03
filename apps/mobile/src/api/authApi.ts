import { AuthSession, AuthUser, LoginInput } from '../auth/auth.types';

import { requestJson } from './httpClient';

const DEFAULT_DEVICE_ID = 'expo-mobile-dev';

export function login(loginInput: LoginInput): Promise<AuthSession> {
  return requestJson<AuthSession>('/auth/login', {
    method: 'POST',
    headers: {
      'X-Device-Id': DEFAULT_DEVICE_ID
    },
    body: {
      username: loginInput.username.trim(),
      password: loginInput.password
    }
  });
}

export function refreshSession(refreshToken: string): Promise<AuthSession> {
  return requestJson<AuthSession>('/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken
    }
  });
}

export function logout(refreshToken: string): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: {
      refreshToken
    }
  });
}

export function getMe(): Promise<AuthUser> {
  return requestJson<AuthUser>('/auth/me', {
    method: 'GET',
    auth: true
  });
}
