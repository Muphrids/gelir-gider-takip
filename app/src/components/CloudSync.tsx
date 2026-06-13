import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { UseCloudSyncResult } from '@/hooks/useCloudSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Cloud,
  LogOut,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface CloudSyncProps {
  cloudSync: UseCloudSyncResult;
}

export function CloudSync({ cloudSync }: CloudSyncProps) {
  const { user, signOut } = useAuth();
  const {
    localStatus,
    localError,
    securityMessage,
    isOnline,
    isSyncPending,
    handleUpload,
    handleDownload,
    handleDeleteAccountData,
  } = cloudSync;

  const isBusy = localStatus === 'loading';

  const statusText = (() => {
    if (!supabase) return 'Supabase yapılandırılmamış (.env dosyasını kontrol edin).';
    if (localStatus === 'loading') return 'Bulut işlemi yapılıyor...';
    if (localStatus === 'success') return 'Bulut işlemi başarılı.';
    if (localStatus === 'error') return 'Bulut işlemi başarısız.';
    if (!isOnline) return 'Çevrimdışı moddasınız.';
    return 'Buluta bağlısınız.';
  })();

  return (
    <Card className="w-full dark:bg-slate-900 dark:border-white/10 dark:text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Bulut Senkronizasyonu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supabase && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Supabase ayarları yapılmamış. Lütfen `.env` dosyanıza
              <br />
              <code>VITE_SUPABASE_URL</code> ve <code>VITE_SUPABASE_ANON_KEY</code> ekleyin.
            </AlertDescription>
          </Alert>
        )}

        {user && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full border border-blue-200 dark:border-blue-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center text-blue-800 dark:text-blue-100 font-semibold">
                    {(user.displayName ?? user.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-200 truncate">
                    {user.displayName ?? user.email ?? 'Google kullanıcısı'}
                  </p>
                  {user.email && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 truncate">{user.email}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                disabled={isBusy}
                className="flex items-center gap-1 shrink-0 text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-white/10 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-slate-800/40">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Bulut Verilerini Sil</p>
              <p className="text-xs text-red-600 dark:text-red-300/80">
                Bu işlem buluttaki verilerinizi siler ve çıkış yapar.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleDeleteAccountData()}
                disabled={isBusy || !supabase}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Bulut Verilerini Sil
              </Button>
            </div>
          </div>
        )}

        {localError && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}

        {securityMessage && (
          <Alert variant={securityMessage.includes('başarı') ? 'default' : 'destructive'}>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{securityMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-white/5 justify-between">
          <div className="flex items-center gap-2">
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span className="text-gray-700 dark:text-gray-300">{statusText}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-0">
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                isOnline
                  ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
              }`}
            >
              {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </span>
            {isSyncPending && !isBusy && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-bold animate-pulse">
                Eşitleme Bekliyor
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 dark:bg-slate-800 dark:border-white/10 dark:text-white dark:hover:bg-slate-700"
            onClick={() => void handleUpload()}
            disabled={!user || !supabase || isBusy}
          >
            <Upload className="w-4 h-4" />
            Buluta Yükle
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 dark:bg-slate-800 dark:border-white/10 dark:text-white dark:hover:bg-slate-700"
            onClick={() => void handleDownload()}
            disabled={!user || !supabase || isBusy}
          >
            <Download className="w-4 h-4" />
            Buluttan İndir
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Verileriniz Supabase üzerinde kullanıcı hesabınıza bağlı olarak saklanır.
          İsterseniz cihazınızda yerel olarak tutulmaya devam eder; buluta yükleme
          ve indirme işlemleri tamamen sizin kontrolünüzdedir.
        </p>
      </CardContent>
    </Card>
  );
}
