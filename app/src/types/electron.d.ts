export interface ElectronAPI {
  isElectron: boolean;
  getAppVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  getOAuthRedirectUrl: () => Promise<string>;
  openOAuthWindow: (url: string) => Promise<boolean>;
  onAuthCallback: (callback: (url: string) => void) => () => void;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (
    callback: (status: string, version: string | null, errorMsg: string | null) => void
  ) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
