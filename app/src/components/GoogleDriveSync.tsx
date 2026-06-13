import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import type { AppData } from '@/types';
import { 
  Cloud, 
  CloudOff, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Info,
  User,
  Settings,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface GoogleDriveSyncProps {
  data: AppData;
  onDataImport: (data: AppData) => void;
}

const CLIENT_ID_KEY = 'gelir-gider-client-id';
const API_KEY_KEY = 'gelir-gider-api-key';

export function GoogleDriveSync({ data, onDataImport }: GoogleDriveSyncProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [localStatus, setLocalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  const {
    isInitialized,
    isSignedIn,
    syncStatus,
    lastSyncTime,
    error,
    currentUser,
    initialize,
    signIn,
    signOut,
    uploadToDrive,
    manualDownload,
  } = useGoogleDrive();

  // Load saved credentials on mount
  useEffect(() => {
    const savedClientId = localStorage.getItem(CLIENT_ID_KEY);
    const savedApiKey = localStorage.getItem(API_KEY_KEY);
    if (savedClientId) setClientId(savedClientId);
    if (savedApiKey) setApiKey(savedApiKey);
  }, []);

  // Auto-initialize when credentials are available
  useEffect(() => {
    const savedClientId = localStorage.getItem(CLIENT_ID_KEY);
    const savedApiKey = localStorage.getItem(API_KEY_KEY);
    if (savedClientId && savedApiKey && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  const handleSaveCredentials = () => {
    if (clientId.trim() && apiKey.trim()) {
      localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
      localStorage.setItem(API_KEY_KEY, apiKey.trim());
      setShowConfig(false);
      initialize();
    }
  };

  const handleUpload = async () => {
    setLocalStatus('loading');
    const success = await uploadToDrive(data);
    setLocalStatus(success ? 'success' : 'error');
    setTimeout(() => setLocalStatus('idle'), 3000);
  };

  const handleDownload = async () => {
    setLocalStatus('loading');
    const downloadedData = await manualDownload();
    if (downloadedData) {
      onDataImport(downloadedData);
    }
    setLocalStatus(downloadedData ? 'success' : 'error');
    setTimeout(() => setLocalStatus('idle'), 3000);
  };

  const getStatusIcon = () => {
    if (syncStatus === 'loading' || localStatus === 'loading') {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    }
    if (syncStatus === 'success' || localStatus === 'success') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (syncStatus === 'error' || localStatus === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (isSignedIn) {
      return <Cloud className="w-5 h-5 text-blue-500" />;
    }
    return <CloudOff className="w-5 h-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (localStatus === 'loading') return 'İşlem yapılıyor...';
    if (localStatus === 'success') return 'İşlem başarılı!';
    if (localStatus === 'error') return 'Bir hata oluştu';
    if (syncStatus === 'loading') return 'Senkronize ediliyor...';
    if (!isInitialized) return 'Google Drive yapılandırılmamış';
    if (isSignedIn) {
      if (lastSyncTime) {
        return `Son senkronizasyon: ${format(new Date(lastSyncTime), 'dd MMM yyyy HH:mm', { locale: tr })}`;
      }
      return 'Google Drive\'a bağlı';
    }
    return 'Google Drive\'a bağlı değil';
  };

  const hasCredentials = !!localStorage.getItem(CLIENT_ID_KEY) && !!localStorage.getItem(API_KEY_KEY);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Google Drive Senkronizasyonu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">{currentUser.name}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{currentUser.email}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/40 border border-gray-150 dark:border-white/10 rounded-lg">
            {getStatusIcon()}
            <span className="text-sm text-gray-700 dark:text-gray-300">{getStatusText()}</span>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Configuration Buttons */}
          {!hasCredentials && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span>Google Drive senkronizasyonu için API bilgilerinizi yapılandırmanız gerekiyor.</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
                    <Settings className="w-4 h-4 mr-1" />
                    Yapılandır
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowInfo(true)}>
                    Nasıl?
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!isSignedIn ? (
              <>
                <Button
                  onClick={signIn}
                  disabled={!hasCredentials || syncStatus === 'loading'}
                  className="flex items-center gap-2"
                >
                  <Cloud className="w-4 h-4" />
                  Google ile Giriş Yap
                </Button>
                {hasCredentials && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfig(true)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    API Bilgilerini Değiştir
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={handleUpload}
                  disabled={syncStatus === 'loading' || localStatus === 'loading'}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Buluta Yükle
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={syncStatus === 'loading' || localStatus === 'loading'}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Buluttan İndir
                </Button>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  Çıkış Yap
                </Button>
              </>
            )}
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500">
            Verileriniz Google Drive\'ınızdaki "Gelir Gider Takip" klasöründe kullanıcı bazlı saklanır.
            Her kullanıcı kendi verilerine sadece kendi hesabından erişebilir.
          </p>
        </div>
      </CardContent>

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Google API Yapılandırması</DialogTitle>
            <DialogDescription>
              Google Drive senkronizasyonu için API bilgilerinizi girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="YOUR_API_KEY"
              />
            </div>
            <Button 
              onClick={handleSaveCredentials} 
              className="w-full"
              disabled={!clientId.trim() || !apiKey.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet ve Bağlan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Google Drive Yapılandırması</DialogTitle>
            <DialogDescription>
              Google Drive senkronizasyonunu kullanmak için aşağıdaki adımları takip edin:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                <a 
                  href="https://console.cloud.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Cloud Console
                </a>
                \'a gidin
              </li>
              <li>Yeni bir proje oluşturun</li>
              <li>"APIs & Services" &gt; "Library" menüsünden <strong>Google Drive API</strong>\'yi etkinleştirin</li>
              <li>"Credentials" menüsünden "Create Credentials" &gt; "OAuth client ID" seçin</li>
              <li>Application type olarak "Web application" seçin</li>
              <li>Authorized JavaScript origins alanına uygulama URL\'nizi ekleyin (örn: http://localhost:3000)</li>
              <li>Client ID ve API Key bilgilerini kopyalayın</li>
              <li>Yukarıdaki yapılandırma ekranına yapıştırın</li>
            </ol>
            <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-xs">
              <strong>Önemli:</strong> API bilgileriniz tarayıcınızda yerel olarak saklanır. 
              Kimseyle paylaşmayın.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
