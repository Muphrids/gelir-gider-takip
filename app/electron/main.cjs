const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
const LOCAL_PORT = 29272;
const AUTH_CALLBACK_PATH = '/auth/callback';
const DIST_DIR = path.join(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

let mainWindow = null;
let oauthWindow = null;
let pendingAuthUrl = null;
let localServer = null;

function getOAuthRedirectUrl() {
  return `http://127.0.0.1:${LOCAL_PORT}${AUTH_CALLBACK_PATH}`;
}

function getAppUrl() {
  return `http://127.0.0.1:${LOCAL_PORT}/`;
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function deliverAuthCallback(url) {
  if (!url) return false;

  if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('auth-callback', url);
    focusMainWindow();
    return true;
  }

  pendingAuthUrl = url;
  return false;
}

function closeOAuthWindow() {
  if (oauthWindow && !oauthWindow.isDestroyed()) {
    oauthWindow.close();
  }
  oauthWindow = null;
}

function captureOAuthRedirect(targetUrl) {
  if (!targetUrl || !targetUrl.includes(AUTH_CALLBACK_PATH)) {
    return false;
  }

  deliverAuthCallback(targetUrl);
  closeOAuthWindow();
  return true;
}

function openOAuthWindow(authUrl) {
  return new Promise((resolve) => {
    closeOAuthWindow();

    oauthWindow = new BrowserWindow({
      width: 520,
      height: 760,
      parent: mainWindow ?? undefined,
      modal: !!mainWindow,
      autoHideMenuBar: true,
      title: 'Google ile Giriş',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        partition: 'persist:gelirgider',
      },
    });

    let settled = false;
    const finish = (success) => {
      if (settled) return;
      settled = true;
      closeOAuthWindow();
      resolve(success);
    };

    const handleNavigation = (event, targetUrl) => {
      if (captureOAuthRedirect(targetUrl)) {
        event.preventDefault();
        finish(true);
      }
    };

    oauthWindow.webContents.on('will-redirect', handleNavigation);
    oauthWindow.webContents.on('will-navigate', handleNavigation);
    oauthWindow.webContents.on('did-navigate', (_event, targetUrl) => {
      if (captureOAuthRedirect(targetUrl)) {
        finish(true);
      }
    });

    oauthWindow.on('closed', () => {
      oauthWindow = null;
      finish(false);
    });

    oauthWindow.loadURL(authUrl).catch(() => finish(false));
  });
}

function sendAuthSuccessPage(res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8" /><title>Giriş başarılı</title></head>
<body style="font-family:system-ui;text-align:center;padding:48px;background:#f0f9ff;color:#1e3a5f">
  <h1>Giriş başarılı</h1>
  <p>Uygulamaya dönüldü. Bu pencereyi kapatabilirsiniz.</p>
</body>
</html>`);
}

function startLocalServer() {
  if (localServer) {
    return Promise.resolve(getAppUrl());
  }

  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url ?? '/', `http://127.0.0.1:${LOCAL_PORT}`);

        if (requestUrl.pathname === AUTH_CALLBACK_PATH) {
          const callbackUrl = `${getOAuthRedirectUrl()}${requestUrl.search}`;
          deliverAuthCallback(callbackUrl);
          sendAuthSuccessPage(res);
          return;
        }

        if (isDev) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }

        let relativePath = decodeURIComponent(requestUrl.pathname);
        if (relativePath === '/') relativePath = '/index.html';

        const filePath = path.normalize(path.join(DIST_DIR, relativePath));
        if (!filePath.startsWith(DIST_DIR)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Forbidden');
          return;
        }

        fs.readFile(filePath, (error, data) => {
          if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
          res.end(data);
        });
      } catch {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error');
      }
    });

    localServer.listen(LOCAL_PORT, '127.0.0.1', () => resolve(getAppUrl()));
    localServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(getAppUrl());
        return;
      }
      reject(error);
    });
  });
}

function createWindow(appUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    title: 'Gelir Gider Takip',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f9fafb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      partition: 'persist:gelirgider',
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    focusMainWindow();
  });

  mainWindow.loadURL(appUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingAuthUrl) {
      deliverAuthCallback(pendingAuthUrl);
      pendingAuthUrl = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    closeOAuthWindow();
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    focusMainWindow();
  });

  app.whenReady().then(async () => {
    await startLocalServer();

    ipcMain.handle('open-external', async (_event, url) => {
      await shell.openExternal(url);
    });

    ipcMain.handle('get-oauth-redirect-url', () => getOAuthRedirectUrl());

    ipcMain.handle('get-app-version', () => app.getVersion());

    ipcMain.handle('open-oauth-window', async (_event, url) => {
      if (!url) return false;
      return openOAuthWindow(url);
    });

    // Auto-Updater configuration & IPC handlers
    const log = require('electron-log');
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    log.info('App starting...');

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('update-status', 'checking');
    });

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('update-status', 'available', info.version);
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update-status', 'not-available');
    });

    autoUpdater.on('error', (err) => {
      mainWindow?.webContents.send('update-status', 'error', null, err?.message || 'Bilinmeyen güncelleme hatası');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      mainWindow?.webContents.send('update-progress', Math.round(progressObj.percent));
    });

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('update-status', 'downloaded', info.version);
    });

    ipcMain.handle('check-for-updates-manual', async () => {
      try {
        if (!isDev) {
          const result = await autoUpdater.checkForUpdates();
          return result;
        }
        // Simüle edelim (development ortamında test için)
        mainWindow?.webContents.send('update-status', 'checking');
        setTimeout(() => {
          mainWindow?.webContents.send('update-status', 'not-available');
        }, 1500);
        return null;
      } catch (err) {
        mainWindow?.webContents.send('update-status', 'error', null, err?.message || 'Kontrol edilemedi');
        return null;
      }
    });

    ipcMain.handle('install-update-now', () => {
      autoUpdater.quitAndInstall(true, true);
    });

    const appUrl = isDev ? process.env.VITE_DEV_SERVER_URL : getAppUrl();
    createWindow(appUrl);

    // Start background update check in production
    if (!isDev) {
      // Check 5 seconds after startup
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.error('Failed to run background update check on startup:', err);
        });
      }, 5000);

      // Check every 30 minutes (1,800,000 milliseconds) for updates
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.error('Failed to run periodic background update check:', err);
        });
      }, 30 * 60 * 1000); // 30 minutes
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        const reloadUrl = isDev ? process.env.VITE_DEV_SERVER_URL : getAppUrl();
        createWindow(reloadUrl);
      }
    });
  });
}

app.on('window-all-closed', () => {
  closeOAuthWindow();
  if (localServer) {
    localServer.close();
    localServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
