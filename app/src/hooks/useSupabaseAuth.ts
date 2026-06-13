import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAuthRedirectUrl, isElectron, isCapacitor } from '@/lib/platform';

export interface SupabaseUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

function mapUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): SupabaseUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      null,
    avatarUrl:
      (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata.picture === 'string' && metadata.picture) ||
      null,
  };
}

function cleanAuthParamsFromUrl() {
  if (isElectron()) return;

  const url = new URL(window.location.href);
  const hasAuthParams =
    url.searchParams.has('code') ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description');

  if (hasAuthParams) {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    const clean = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '');
    window.history.replaceState({}, document.title, clean);
  }
}

let oauthExchangeInFlight = false;

async function handleOAuthCallback(
  client: NonNullable<typeof supabase>,
  callbackUrl: string
): Promise<{ error: string | null; user: SupabaseUser | null }> {
  const url = new URL(callbackUrl);
  const authCode = url.searchParams.get('code');
  const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error');

  if (authError) {
    return { error: decodeURIComponent(authError.replace(/\+/g, ' ')), user: null };
  }

  if (!authCode) {
    return { error: 'Giriş kodu alınamadı.', user: null };
  }

  if (oauthExchangeInFlight) {
    const { data: { session } } = await client.auth.getSession();
    return {
      error: null,
      user: session?.user ? mapUser(session.user) : null,
    };
  }

  oauthExchangeInFlight = true;
  try {
    const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(authCode);
    if (exchangeError) {
      return { error: exchangeError.message, user: null };
    }
    if (data.session?.user) {
      return { error: null, user: mapUser(data.session.user) };
    }
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      return { error: null, user: mapUser(session.user) };
    }
    return { error: 'Oturum oluşturulamadı.', user: null };
  } finally {
    oauthExchangeInFlight = false;
  }
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface UseSupabaseAuthResult {
  user: SupabaseUser | null;
  status: AuthStatus;
  error: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

export function useSupabaseAuth(): UseSupabaseAuthResult {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const applySessionUser = useCallback((sessionUser: SupabaseUser | null) => {
    if (!isMountedRef.current) return;
    if (sessionUser) {
      setUser(sessionUser);
      setStatus('authenticated');
      setError(null);
    } else {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const processOAuthUrl = useCallback(
    async (callbackUrl: string) => {
      if (!supabase) return;

      setStatus('loading');
      setError(null);

      const result = await handleOAuthCallback(supabase, callbackUrl);
      if (!isMountedRef.current) return;

      if (result.error) {
        setError(result.error);
        setStatus('error');
        return;
      }

      applySessionUser(result.user);
    },
    [applySessionUser]
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!supabase) {
      setStatus('unauthenticated');
      return () => {
        isMountedRef.current = false;
      };
    }

    const client = supabase;
    setStatus('loading');

    const initAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const hasAuthParams =
          url.searchParams.has('code') ||
          url.searchParams.has('error') ||
          url.searchParams.has('error_description');

        if (!isElectron() && hasAuthParams) {
          const result = await handleOAuthCallback(client, window.location.href);
          if (!isMountedRef.current) return;

          if (result.error) {
            setError(result.error);
            setStatus('error');
            cleanAuthParamsFromUrl();
            return;
          }

          cleanAuthParamsFromUrl();
          if (result.user) {
            applySessionUser(result.user);
            return;
          }
        }

        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (!isMountedRef.current) return;

        if (sessionError) {
          setError(sessionError.message);
          setStatus('error');
          return;
        }

        applySessionUser(session?.user ? mapUser(session.user) : null);
      } catch (e: unknown) {
        if (!isMountedRef.current) return;
        setError(e instanceof Error ? e.message : 'Oturum doğrulanamadı.');
        setStatus('error');
      }
    };

    void initAuth();

    const removeElectronListener = isElectron()
      ? window.electronAPI?.onAuthCallback((callbackUrl) => {
          void processOAuthUrl(callbackUrl);
        })
      : undefined;

    let activeCapacitorHandler: any = null;
    let isCleanedUp = false;

    if (isCapacitor()) {
      import('@capacitor/app').then(({ App }) => {
        if (isCleanedUp) return;
        App.addListener('appUrlOpen', (event: any) => {
          if (event.url && isMountedRef.current) {
            void processOAuthUrl(event.url);
          }
        }).then(h => {
          if (isCleanedUp) {
            h.remove();
          } else {
            activeCapacitorHandler = h;
          }
        });
      });
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return;

      if (session?.user) {
        applySessionUser(mapUser(session.user));
        if (event === 'SIGNED_IN') {
          cleanAuthParamsFromUrl();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStatus('unauthenticated');
        setError(null);
      }
    });

    return () => {
      isMountedRef.current = false;
      isCleanedUp = true;
      removeElectronListener?.();
      if (activeCapacitorHandler) {
        activeCapacitorHandler.remove();
      }
      subscription.unsubscribe();
    };
  }, [applySessionUser, processOAuthUrl]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setError('Supabase yapılandırılmamış. Lütfen .env dosyasını kontrol edin.');
      setStatus('error');
      return false;
    }

    try {
      setStatus('loading');
      setError(null);

      const redirectTo = await getAuthRedirectUrl();
      const inElectron = isElectron();

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: inElectron,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setStatus('error');
        return false;
      }

      if (inElectron) {
        if (!data?.url) {
          setError('Google giriş adresi oluşturulamadı.');
          setStatus('error');
          return false;
        }

        const opened = await window.electronAPI?.openOAuthWindow(data.url);
        if (!opened) {
          setError('Google giriş penceresi kapatıldı.');
          setStatus('error');
          return false;
        }

        setStatus('loading');
        return true;
      }

      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google ile giriş sırasında bir hata oluştu.');
      setStatus('error');
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  return {
    user,
    status,
    error,
    signInWithGoogle,
    signOut,
  };
}
