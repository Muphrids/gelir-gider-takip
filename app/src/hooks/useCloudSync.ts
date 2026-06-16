import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import type { AppData } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export interface UseCloudSyncResult {
  localStatus: 'idle' | 'loading' | 'success' | 'error';
  localError: string | null;
  securityMessage: string | null;
  isOnline: boolean;
  isSyncPending: boolean;
  isInitialLoading: boolean;
  handleUpload: () => Promise<void>;
  handleDownload: () => Promise<void>;
  handleDeleteAccountData: () => Promise<void>;
}

export function useCloudSync(
  data: AppData,
  onDataImport: (data: AppData) => void,
  user: any,
  signOut: () => Promise<void>,
  currentUser: string | null
): UseCloudSyncResult {
  const { t } = useLanguage();
  const [localStatus, setLocalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const lastUploadedSnapshotRef = useRef<string | null>(null);
  const autoUploadTimeoutRef = useRef<number | null>(null);
  const skipNextAutoUploadRef = useRef(false);
  const hasAutoDownloadedRef = useRef(false);
  const isHandlingRealtimeRef = useRef(false);

  // Kullanıcı giriş durumunu takip etmek için
  const prevUserRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId !== prevUserRef.current) {
      prevUserRef.current = userId;
      hasAutoDownloadedRef.current = false;
      lastUploadedSnapshotRef.current = null;
    }
  }, [user]);

  // İnternet durum takibi ve otomatik eşitleme kurtarma
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const currentSnapshot = JSON.stringify(data);
      if (user && supabase && lastUploadedSnapshotRef.current && lastUploadedSnapshotRef.current !== currentSnapshot) {
        toast.info(t('toast.connectionRestored'));
        void handleUpload();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [data, user]);

  const handleUpload = useCallback(async () => {
    if (!supabase || !user || user.id !== currentUser) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLocalStatus('error');
      setLocalError(t('cloud.offlineError'));
      return;
    }
    try {
      setLocalStatus('loading');
      setLocalError(null);

      // Buluttaki verinin zaman damgasını kontrol et
      const { data: rows, error: selectError } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!selectError && rows?.data) {
        const cloudData = rows.data as AppData;
        const cloudLastUpdated = cloudData.lastUpdated || new Date(0).toISOString();
        const localLastUpdated = data.lastUpdated || new Date(0).toISOString();

        // Buluttaki veri daha yeniyse, yereldeki verinin üzerine yazılmasını engelle
        if (new Date(cloudLastUpdated) > new Date(localLastUpdated)) {
          console.log('Buluttaki veri daha yeni. Yükleme iptal ediliyor ve bulut verisi indiriliyor.');
          skipNextAutoUploadRef.current = true;
          onDataImport(cloudData);
          lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
          setLocalStatus('success');
          setTimeout(() => setLocalStatus('idle'), 2500);
          toast.info(t('toast.newerDataFound'));
          return;
        }
      }

      const { error: upsertError } = await supabase
        .from('user_data')
        .upsert(
          {
            user_id: user.id,
            data,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        setLocalStatus('error');
        setLocalError(upsertError.message);
        return;
      }

      const snapshot = JSON.stringify(data);
      lastUploadedSnapshotRef.current = snapshot;
      setLocalStatus('success');
      setTimeout(() => setLocalStatus('idle'), 2500);
    } catch (e: any) {
      setLocalStatus('error');
      setLocalError(e?.message ?? 'Veriler yüklenemedi.');
    }
  }, [data, user, currentUser, onDataImport]);

  const handleDownload = useCallback(async () => {
    if (!supabase || !user || user.id !== currentUser) return;
    try {
      setLocalStatus('loading');
      setLocalError(null);

      const { data: rows, error: selectError } = await supabase
        .from('user_data')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (selectError) {
        setLocalStatus('error');
        setLocalError(selectError.message);
        return;
      }

      if (!rows?.data) {
        setLocalStatus('error');
        setLocalError('Bulutta kayıtlı veri bulunamadı.');
        return;
      }

      skipNextAutoUploadRef.current = true;
      onDataImport(rows.data as AppData);
      lastUploadedSnapshotRef.current = JSON.stringify(rows.data);
      setLocalStatus('success');
      setTimeout(() => setLocalStatus('idle'), 2500);
    } catch (e: any) {
      setLocalStatus('error');
      setLocalError(e?.message ?? t('cloud.downloadError'));
    }
  }, [user, currentUser, onDataImport]);

  const handleDeleteAccountData = useCallback(async () => {
    if (!supabase || !user || user.id !== currentUser) return;
    setSecurityMessage(null);

    const confirmation = window.prompt(t('cloud.deletePrompt'));
    if (confirmation !== 'ONAYLIYORUM') {
      toast.error(t('toast.deleteCancelled'));
      return;
    }

    try {
      setLocalStatus('loading');
      const { error: delError } = await supabase
        .from('user_data')
        .delete()
        .eq('user_id', user.id);

      if (delError) {
        setSecurityMessage(delError.message);
      } else {
        // Clear local storage for this user to avoid automatic upload on next login
        localStorage.removeItem('gelir-gider-data-' + user.id);
        localStorage.removeItem('gelir-gider-user');

        setSecurityMessage(t('cloud.deleteSuccess'));
        toast.success(t('toast.dataCleared'));
        await signOut();
      }
    } catch (e: any) {
      setSecurityMessage(e?.message ?? t('cloud.deleteFailed'));
    } finally {
      setLocalStatus('idle');
    }
  }, [user, signOut]);

  // Kullanıcı değiştiğinde otomatik ilk indir
  useEffect(() => {
    if (!user || !supabase || user.id !== currentUser) {
      setIsInitialLoading(false);
      return;
    }
    if (hasAutoDownloadedRef.current) return;

    hasAutoDownloadedRef.current = true;
    setIsInitialLoading(true);

    void (async () => {
      try {
        const { data: rows, error: selectError } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!selectError) {
          if (rows?.data) {
            const cloudData = rows.data as AppData;
            const cloudLastUpdated = cloudData.lastUpdated || new Date(0).toISOString();
            const localLastUpdated = data.lastUpdated || new Date(0).toISOString();

            if (new Date(cloudLastUpdated) > new Date(localLastUpdated)) {
              // Buluttaki veri yerel veriden daha yeni
              skipNextAutoUploadRef.current = true;
              onDataImport(cloudData);
              lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
              toast.info(t('toast.cloudSynced'));
            } else if (new Date(localLastUpdated) > new Date(cloudLastUpdated)) {
              // Yerel veri daha yeni, otomatik buluta yükleme tetiklenecek
              lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
              toast.info(t('toast.localNewer'));
            } else {
              // Eşitler, sadece snapshot'ı güncelle
              lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
            }
          } else {
            // Bulutta kayıtlı veri bulunamadıysa (silindiyse veya ilk kez gelindiyse)
            // mevcut veriyi bulutla eşit sayarak otomatik yüklemeyi başlatma
            lastUploadedSnapshotRef.current = JSON.stringify(data);
          }
        }
      } catch (e) {
        console.error('Initial auto-download failed:', e);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [user, currentUser, onDataImport, data]);

  // Supabase Realtime ile diğer cihazlardaki güncellemeleri otomatik çek
  useEffect(() => {
    const client = supabase;
    if (!client || !user || user.id !== currentUser) return;

    const channel = client
      .channel(`user_data_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_data',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          if (isHandlingRealtimeRef.current) return;

          try {
            const { data: rows, error: selectError } = await client
              .from('user_data')
              .select('data')
              .eq('user_id', user.id)
              .maybeSingle();

            if (selectError || !rows?.data) {
              return;
            }

            const incomingSnapshot = JSON.stringify(rows.data);
            const currentSnapshot = JSON.stringify(data);

            if (
              incomingSnapshot === currentSnapshot ||
              incomingSnapshot === lastUploadedSnapshotRef.current
            ) {
              return;
            }

            const incomingData = rows.data as AppData;
            const incomingLastUpdated = incomingData.lastUpdated || new Date(0).toISOString();
            const currentLastUpdated = data.lastUpdated || new Date(0).toISOString();

            if (new Date(incomingLastUpdated) > new Date(currentLastUpdated)) {
              skipNextAutoUploadRef.current = true;
              isHandlingRealtimeRef.current = true;
              onDataImport(incomingData);
              lastUploadedSnapshotRef.current = incomingSnapshot;
              toast.info(t('toast.realtimeSynced'));
            }
          } finally {
            setTimeout(() => {
              isHandlingRealtimeRef.current = false;
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, currentUser, data, onDataImport]);

  // Veri değiştiğinde otomatik buluta yükleme (debounce ile)
  const isBusy = localStatus === 'loading';
  useEffect(() => {
    if (!user || !supabase || user.id !== currentUser) return;
    if (isBusy || isInitialLoading) return;

    const currentSnapshot = JSON.stringify(data);

    if (skipNextAutoUploadRef.current) {
      skipNextAutoUploadRef.current = false;
      lastUploadedSnapshotRef.current = currentSnapshot;
      return;
    }

    if (lastUploadedSnapshotRef.current === currentSnapshot) {
      return;
    }

    if (autoUploadTimeoutRef.current) {
      window.clearTimeout(autoUploadTimeoutRef.current);
    }

    autoUploadTimeoutRef.current = window.setTimeout(() => {
      void handleUpload();
    }, 3000);

    return () => {
      if (autoUploadTimeoutRef.current) {
        window.clearTimeout(autoUploadTimeoutRef.current);
      }
    };
  }, [data, user, currentUser, isBusy, isInitialLoading, handleUpload]);

  const currentSnapshot = JSON.stringify(data);
  const isSyncPending = !!(user && supabase && lastUploadedSnapshotRef.current && lastUploadedSnapshotRef.current !== currentSnapshot);

  return {
    localStatus,
    localError,
    securityMessage,
    isOnline,
    isSyncPending,
    isInitialLoading,
    handleUpload,
    handleDownload,
    handleDeleteAccountData
  };
}
