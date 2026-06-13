import { useState, useCallback, useRef } from 'react';
import type { AppData } from '@/types';

const CLIENT_ID_KEY = 'gelir-gider-client-id';
const API_KEY_KEY = 'gelir-gider-api-key';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Gelir Gider Takip';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GoogleDriveState {
  isInitialized: boolean;
  isSignedIn: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  error: string | null;
  currentUser: { email: string; name: string } | null;
}

export function useGoogleDrive() {
  const [state, setState] = useState<GoogleDriveState>({
    isInitialized: false,
    isSignedIn: false,
    syncStatus: 'idle',
    lastSyncTime: null,
    error: null,
    currentUser: null,
  });

  const fileIdRef = useRef<string | null>(null);
  const gapiLoaded = useRef(false);

  const getCredentials = () => {
    const clientId = localStorage.getItem(CLIENT_ID_KEY);
    const apiKey = localStorage.getItem(API_KEY_KEY);
    return { clientId, apiKey };
  };

  const getFileName = useCallback((email: string): string => {
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    return `gelir-gider-data-${sanitizedEmail}.json`;
  }, []);

  // Load Google API script
  const loadGapiScript = useCallback(async (): Promise<boolean> => {
    if (gapiLoaded.current) return true;
    
    try {
      if (!window.gapi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Google API yüklenemedi'));
          document.body.appendChild(script);
        });
      }

      await new Promise<void>((resolve) => {
        window.gapi.load('client:auth2', resolve);
      });

      gapiLoaded.current = true;
      return true;
    } catch (error) {
      console.error('Error loading GAPI:', error);
      return false;
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      const { clientId, apiKey } = getCredentials();
      
      if (!clientId || !apiKey) {
        setState(prev => ({
          ...prev,
          isInitialized: false,
          syncStatus: 'idle',
          error: null,
        }));
        return false;
      }

      setState(prev => ({ ...prev, syncStatus: 'loading' }));

      const loaded = await loadGapiScript();
      if (!loaded) {
        throw new Error('Google API yüklenemedi');
      }

      await window.gapi.client.init({
        apiKey: apiKey,
        clientId: clientId,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      const isSignedIn = authInstance.isSignedIn.get();
      
      let user = null;
      if (isSignedIn) {
        const googleUser = authInstance.currentUser.get();
        const profile = googleUser.getBasicProfile();
        user = {
          email: profile.getEmail(),
          name: profile.getName(),
        };
      }

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isSignedIn,
        currentUser: user,
        syncStatus: 'idle',
        error: null,
      }));

      // Listen for sign-in state changes
      authInstance.isSignedIn.listen((signedIn: boolean) => {
        const googleUser = authInstance.currentUser.get();
        const profile = googleUser.getBasicProfile();
        setState(prev => ({ 
          ...prev, 
          isSignedIn: signedIn,
          currentUser: signedIn ? {
            email: profile.getEmail(),
            name: profile.getName(),
          } : null,
        }));
      });

      return true;
    } catch (error) {
      console.error('Error initializing Google Drive:', error);
      setState(prev => ({
        ...prev,
        isInitialized: false,
        syncStatus: 'error',
        error: 'Google Drive başlatılamadı. Lütfen API bilgilerinizi kontrol edin.',
      }));
      return false;
    }
  }, [loadGapiScript]);

  const signIn = useCallback(async () => {
    try {
      if (!state.isInitialized) {
        const initialized = await initialize();
        if (!initialized) return false;
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      
      const profile = user.getBasicProfile();
      
      setState(prev => ({ 
        ...prev, 
        isSignedIn: true,
        currentUser: {
          email: profile.getEmail(),
          name: profile.getName(),
        },
      }));
      return true;
    } catch (error: any) {
      console.error('Error signing in:', error);
      if (error.error === 'popup_closed_by_user') {
        setState(prev => ({
          ...prev,
          error: 'Giriş penceresi kapatıldı.',
        }));
      } else if (error.error === 'idpiframe_initialization_failed') {
        setState(prev => ({
          ...prev,
          error: 'Google API yapılandırması hatalı. Lütfen Client ID ve API Key bilgilerinizi kontrol edin.',
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: 'Giriş yapılamadı. Lütfen tekrar deneyin.',
        }));
      }
      return false;
    }
  }, [state.isInitialized, initialize]);

  const signOut = useCallback(async () => {
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      setState(prev => ({ 
        ...prev, 
        isSignedIn: false, 
        lastSyncTime: null,
        currentUser: null,
      }));
      fileIdRef.current = null;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const findOrCreateFolder = useCallback(async (): Promise<string | null> => {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
      });

      if (response.result.files.length > 0) {
        return response.result.files[0].id;
      }

      const folderMetadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folder = await window.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });

      return folder.result.id;
    } catch (error) {
      console.error('Error finding/creating folder:', error);
      return null;
    }
  }, []);

  const findExistingFile = useCallback(async (folderId: string, fileName: string): Promise<string | null> => {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, modifiedTime)',
      });

      if (response.result.files.length > 0) {
        fileIdRef.current = response.result.files[0].id;
        return response.result.files[0].id;
      }
      return null;
    } catch (error) {
      console.error('Error finding file:', error);
      return null;
    }
  }, []);

  const uploadToDrive = useCallback(async (data: AppData): Promise<boolean> => {
    try {
      if (!state.currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }

      setState(prev => ({ ...prev, syncStatus: 'loading', error: null }));

      const folderId = await findOrCreateFolder();
      if (!folderId) {
        throw new Error('Klasör oluşturulamadı');
      }

      const fileName = getFileName(state.currentUser.email);
      const fileContent = JSON.stringify(data, null, 2);
      const fileId = await findExistingFile(folderId, fileName);

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: fileId ? undefined : [folderId],
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      let response;
      if (fileId) {
        response = await window.gapi.client.request({
          path: `/upload/drive/v3/files/${fileId}`,
          method: 'PATCH',
          params: { uploadType: 'multipart' },
          headers: {
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: multipartRequestBody,
        });
      } else {
        response = await window.gapi.client.request({
          path: '/upload/drive/v3/files',
          method: 'POST',
          params: { uploadType: 'multipart' },
          headers: {
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: multipartRequestBody,
        });
        fileIdRef.current = response.result.id;
      }

      const syncTime = new Date().toISOString();
      setState(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: syncTime,
      }));

      return true;
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: 'Veriler yüklenemedi. Lütfen tekrar deneyin.',
      }));
      return false;
    }
  }, [findOrCreateFolder, findExistingFile, getFileName, state.currentUser]);

  const manualDownload = useCallback(async (): Promise<AppData | null> => {
    try {
      if (!state.currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı');
      }

      setState(prev => ({ ...prev, syncStatus: 'loading', error: null }));

      const folderId = await findOrCreateFolder();
      if (!folderId) {
        throw new Error('Klasör bulunamadı');
      }

      const fileName = getFileName(state.currentUser.email);
      const fileId = await findExistingFile(folderId, fileName);
      
      if (!fileId) {
        setState(prev => ({
          ...prev,
          syncStatus: 'error',
          error: 'Bulutta kayıtlı veri bulunamadı.',
        }));
        return null;
      }

      const response = await window.gapi.client.drive.files.get({
        fileId,
        alt: 'media',
      });

      const data = response.result as AppData;
      const syncTime = new Date().toISOString();
      
      setState(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: syncTime,
      }));

      return data;
    } catch (error) {
      console.error('Error downloading from Drive:', error);
      setState(prev => ({
        ...prev,
        syncStatus: 'error',
        error: 'Veriler indirilemedi. Lütfen tekrar deneyin.',
      }));
      return null;
    }
  }, [findOrCreateFolder, findExistingFile, getFileName, state.currentUser]);

  return {
    ...state,
    initialize,
    signIn,
    signOut,
    uploadToDrive,
    manualDownload,
  };
}
