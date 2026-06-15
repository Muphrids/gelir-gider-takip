import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PASSWORD_KEY = 'gelir-gider-password';

interface PasswordProtectionProps {
  isLocked: boolean;
  onUnlock: () => void;
  onResetViaGoogle?: () => void;
  unlockStorage: (password: string) => Promise<boolean>;
}

export function PasswordProtection({
  isLocked,
  onUnlock,
  onResetViaGoogle,
  unlockStorage,
}: PasswordProtectionProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    setError('');
    setIsLoading(true);
    try {
      const success = await unlockStorage(password);
      if (success) {
        onUnlock();
      } else {
        setError(t('pass.errorInvalid'));
      }
    } catch {
      setError(t('pass.errorGeneral'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-white/95 dark:bg-slate-900/95">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Lock className="w-6 h-6 text-blue-600 animate-pulse" />
            {t('pass.lockedTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t('pass.enterPass')}
          </p>
          
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('pass.placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleUnlock();
                }
              }}
              className="pr-10 dark:bg-slate-800 dark:border-white/10 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center font-medium">{error}</p>
          )}

          <Button onClick={() => void handleUnlock()} disabled={isLoading} className="w-full">
            <Unlock className="w-4 h-4 mr-2" />
            {isLoading ? t('pass.unlocking') : t('pass.unlockBtn')}
          </Button>

          {onResetViaGoogle && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={isLoading}
                className="text-xs text-blue-600 hover:text-blue-770 hover:underline dark:text-blue-400 font-medium"
              >
                {t('pass.forgotBtn')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="dark:bg-slate-900 dark:text-white dark:border-white/10">
          <DialogHeader>
            <DialogTitle>{t('pass.resetTitle')}</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              <span dangerouslySetInnerHTML={{ __html: t('pass.resetDesc') }} />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="dark:border-white/10">
              {t('general.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => {
              setShowResetConfirm(false);
              if (onResetViaGoogle) onResetViaGoogle();
            }}>
              {t('pass.resetConfirmBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PasswordSettingsProps {
  enableEncryption: (password: string) => Promise<void>;
  disableEncryption: () => void;
}

export function PasswordSettings({ enableEncryption, disableEncryption }: PasswordSettingsProps) {
  const { t } = useLanguage();
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PASSWORD_KEY);
    setHasPassword(!!stored);
  }, []);

  const handleSetPassword = async () => {
    if (password.length < 4) {
      setMessage(t('pass.errorShort'));
      return;
    }
    if (password !== confirmPassword) {
      setMessage(t('pass.errorMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await enableEncryption(password);
      setHasPassword(true);
      setPassword('');
      setConfirmPassword('');
      setMessage(t('pass.successSet'));
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage(t('pass.errorSet'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassword = () => {
    try {
      disableEncryption();
      setHasPassword(false);
      setMessage(t('pass.successRemove'));
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage(t('pass.errorRemove'));
    }
  };

  return (
    <Card className="w-full dark:bg-slate-900 dark:border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
          <Lock className="w-5 h-5 text-blue-600" />
          {t('pass.settingsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPassword ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Lock className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
              <span>{t('pass.statusActive')}</span>
            </div>
            <Button variant="destructive" onClick={handleRemovePassword} className="w-full sm:w-auto">
              {t('pass.removeBtn')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('pass.newLabel')}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('pass.newPlaceholder')}
                  className="pr-10 dark:bg-slate-800 dark:border-white/10 dark:text-white"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('pass.confirmLabel')}</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('pass.confirmPlaceholder')}
                className="dark:bg-slate-800 dark:border-white/10 dark:text-white"
                disabled={isLoading}
              />
            </div>

            <Button onClick={() => void handleSetPassword()} disabled={isLoading} className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? t('pass.settingUp') : t('pass.setupBtn')}
            </Button>
          </div>
        )}

        {message && (
          <p className={`text-sm text-center font-medium ${message === t('pass.successSet') || message === t('pass.successRemove') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {message}
          </p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('pass.hint')}
        </p>
      </CardContent>
    </Card>
  );
}

export function checkPassword(): boolean {
  const stored = localStorage.getItem(PASSWORD_KEY);
  return !!stored;
}
