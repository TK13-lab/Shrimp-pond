import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { getMe, login, logout, refreshSession } from '../api/authApi';
import {
  ApiError,
  setHttpAccessToken,
  setUnauthorizedRecoveryHandler
} from '../api/httpClient';

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
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
    setUnauthorizedRecoveryHandler(async () => {
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const currentSession = sessionRef.current;

      if (!currentSession?.refreshToken) {
        return null;
      }

      refreshPromiseRef.current = refreshSession(currentSession.refreshToken)
        .then(async (refreshedSession) => {
          await applySession(refreshedSession);
          return refreshedSession.accessToken;
        })
        .catch(async () => {
          await clearSession();
          return null;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });

      return refreshPromiseRef.current;
    });

    return () => {
      setUnauthorizedRecoveryHandler(null);
    };
  }, [applySession, clearSession]);

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
