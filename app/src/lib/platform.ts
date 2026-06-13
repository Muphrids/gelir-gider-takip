import { Capacitor } from '@capacitor/core';

export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
}

export function isCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getAuthRedirectUrl(): Promise<string> {
  if (isElectron() && window.electronAPI?.getOAuthRedirectUrl) {
    return window.electronAPI.getOAuthRedirectUrl();
  }
  if (isCapacitor()) {
    return 'com.gelirgider.takip://auth/callback';
  }
  return window.location.origin;
}

