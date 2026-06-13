import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uygulama hatası:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white border rounded-xl shadow-sm p-6 space-y-4">
            <h1 className="text-lg font-semibold text-red-700">Bir hata oluştu</h1>
            <p className="text-sm text-gray-600 break-words">{this.state.error.message}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Uygulamayı Yenile
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
