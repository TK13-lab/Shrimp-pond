import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import { getMe, login, logout, refreshSession } from '../api/authApi';
import { ApiError, setHttpAccessToken } from '../api/httpClient';

import { AuthSession, AuthUser, LoginInput } from './auth.types';
import {
  clearStoredSession,
  getStoredSession,
  saveStoredSession
} from './tokenStorage';

type AuthContextValue = {
  isRestoring: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  session: AuthSession | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  user: AuthUser | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const applySession = useCallback(async (nextSession: AuthSession) => {
    setHttpAccessToken(nextSession.accessToken);
    setSession(nextSession);
    await saveStoredSession(nextSession);
  }, []);

  const clearSession = useCallback(async () => {
    setHttpAccessToken(null);
    setSession(null);
    await clearStoredSession();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap(): Promise<void> {
      try {
        const storedSession = await getStoredSession();

        if (!storedSession) {
          if (isMounted) {
            setHttpAccessToken(null);
            setSession(null);
          }
          return;
        }

        setHttpAccessToken(storedSession.accessToken);

        try {
          const user = await getMe();

          if (!isMounted) {
            return;
          }

          await applySession({
            ...storedSession,
            user
          });

          return;
        } catch (error) {
          if (!(error instanceof ApiError)) {
            throw error;
          }

          if (error.statusCode !== 401) {
            if (isMounted) {
              setSession(storedSession);
            }
            return;
          }
        }

        try {
          const refreshedSession = await refreshSession(storedSession.refreshToken);

          if (!isMounted) {
            return;
          }

          await applySession(refreshedSession);
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.statusCode !== 401 &&
            isMounted
          ) {
            setSession(storedSession);
            return;
          }

          throw error;
        }
      } catch {
        if (isMounted) {
          await clearSession();
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [applySession, clearSession]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      setIsSigningIn(true);

      try {
        const nextSession = await login(input);
        await applySession(nextSession);
      } finally {
        setIsSigningIn(false);
      }
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    setIsSigningOut(true);

    try {
      if (session?.refreshToken) {
        await logout(session.refreshToken);
      }
    } catch {
      // Logout should still clear the local session even if the network call fails.
    } finally {
      await clearSession();
      setIsSigningOut(false);
    }
  }, [clearSession, session?.refreshToken]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isRestoring,
      isSigningIn,
      isSigningOut,
      session,
      signIn,
      signOut,
      user: session?.user ?? null
    }),
    [isRestoring, isSigningIn, isSigningOut, session, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
