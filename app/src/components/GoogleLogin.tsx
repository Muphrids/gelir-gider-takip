import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';

interface GoogleLoginProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export function GoogleLogin({ onSignIn, isLoading, error, isConfigured }: GoogleLoginProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto bg-blue-600 p-3 rounded-xl w-fit">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Gelir Gider Takip
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Devam etmek için Google hesabınızla giriş yapın
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Supabase yapılandırılmamış. <code>.env</code> dosyanıza{' '}
                <code>VITE_SUPABASE_URL</code> ve <code>VITE_SUPABASE_ANON_KEY</code> ekleyin.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full h-11 flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm"
            onClick={() => void onSignIn()}
            disabled={isLoading || !isConfigured}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Google ile Giriş Yap
          </Button>

          <p className="text-xs text-center text-gray-500">
            Giriş yaptığınızda verileriniz güvenli şekilde bulutta senkronize edilir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
