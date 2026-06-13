const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getOAuthRedirectUrl: () => ipcRenderer.invoke('get-oauth-redirect-url'),
  openOAuthWindow: (url) => ipcRenderer.invoke('open-oauth-window', url),
  onAuthCallback: (callback) => {
    const listener = (_event, url) => callback(url);
    ipcRenderer.on('auth-callback', listener);
    return () => ipcRenderer.removeListener('auth-callback', listener);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates-manual'),
  installUpdate: () => ipcRenderer.invoke('install-update-now'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status, version, errorMsg) => callback(status, version, errorMsg);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (_event, percent) => callback(percent);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
});
