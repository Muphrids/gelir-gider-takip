import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import type { AppData } from '@/types';

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
  signOut: () => Promise<void>
): UseCloudSyncResult {
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
        toast.info('İnternet bağlantısı sağlandı, bekleyen değişiklikler yükleniyor...');
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
    if (!supabase || !user) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLocalStatus('error');
      setLocalError('Çevrimdışı durumdasınız. Bağlantı geldiğinde otomatik eşitlenecek.');
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
          toast.info('Bulutta daha yeni veri tespit edildi, verileriniz senkronize edildi.');
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
  }, [data, user, onDataImport]);

  const handleDownload = useCallback(async () => {
    if (!supabase || !user) return;
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
      setLocalError(e?.message ?? 'Veriler indirilemedi.');
    }
  }, [user, onDataImport]);

  const handleDeleteAccountData = useCallback(async () => {
    if (!supabase || !user) return;
    setSecurityMessage(null);
    try {
      setLocalStatus('loading');
      const { error: delError } = await supabase
        .from('user_data')
        .delete()
        .eq('user_id', user.id);

      if (delError) {
        setSecurityMessage(delError.message);
      } else {
        setSecurityMessage('Buluttaki verileriniz silindi. Hesabınızdan çıkış yapıldı.');
        await signOut();
      }
    } catch (e: any) {
      setSecurityMessage(e?.message ?? 'Hesap verileri silinemedi.');
    } finally {
      setLocalStatus('idle');
    }
  }, [user, signOut]);

  // Kullanıcı değiştiğinde otomatik ilk indir
  useEffect(() => {
    if (!user || !supabase) {
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

        if (!selectError && rows?.data) {
          const cloudData = rows.data as AppData;
          const cloudLastUpdated = cloudData.lastUpdated || new Date(0).toISOString();
          const localLastUpdated = data.lastUpdated || new Date(0).toISOString();

          if (new Date(cloudLastUpdated) > new Date(localLastUpdated)) {
            // Buluttaki veri yerel veriden daha yeni
            skipNextAutoUploadRef.current = true;
            onDataImport(cloudData);
            lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
            toast.info('Buluttaki güncel verileriniz eşitlendi.');
          } else if (new Date(localLastUpdated) > new Date(cloudLastUpdated)) {
            // Yerel veri daha yeni, otomatik buluta yükleme tetiklenecek
            lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
            toast.info('Yerel verileriniz buluttan daha yeni, değişiklikler yükleniyor...');
          } else {
            // Eşitler, sadece snapshot'ı güncelle
            lastUploadedSnapshotRef.current = JSON.stringify(cloudData);
          }
        }
      } catch (e) {
        console.error('Initial auto-download failed:', e);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [user, onDataImport, data]);

  // Supabase Realtime ile diğer cihazlardaki güncellemeleri otomatik çek
  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

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
              toast.info('Diğer cihazdan gelen yeni veriler eşitlendi.');
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
  }, [user, data, onDataImport]);

  // Veri değiştiğinde otomatik buluta yükleme (debounce ile)
  const isBusy = localStatus === 'loading';
  useEffect(() => {
    if (!user || !supabase) return;
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
  }, [data, user, isBusy, isInitialLoading, handleUpload]);

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
