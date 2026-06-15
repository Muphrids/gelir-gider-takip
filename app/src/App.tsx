import { useState, useMemo, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { isCapacitor } from '@/lib/platform';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { useStorage } from '@/hooks/useStorage';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { GoogleLogin } from '@/components/GoogleLogin';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { SummaryCards } from '@/components/SummaryCards';
import { CategoryChart } from '@/components/CategoryChart';
import { OverallChart } from '@/components/OverallChart';
import { FilterBar } from '@/components/FilterBar';
import { CloudSync } from '@/components/CloudSync';
import { CategoryManager } from '@/components/CategoryManager';
import { RecurringTransactionForm } from '@/components/RecurringTransactionForm';
import { ProjectManager } from '@/components/ProjectManager';
import { PasswordProtection, PasswordSettings, checkPassword } from '@/components/PasswordProtection';
import { RecurringTransactionManager } from '@/components/RecurringTransactionManager';
import { MonthlyComparisonChart } from '@/components/MonthlyComparisonChart';
import { BudgetProgress } from '@/components/BudgetProgress';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CashFlowForecastChart } from '@/components/CashFlowForecastChart';
import { Label } from '@/components/ui/label';
import type { ViewMode } from '@/types';
import { ChequeNoteManager } from '@/components/ChequeNoteManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  filterTransactionsByViewMode,
  filterTransactionsByDateRange,
  calculateTotals,
  calculateCategorySummary,
  getToday,
  formatCurrency,
  getCurrencySymbol,
  downloadTransactionsCSV,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  PieChart, 
  Settings, 
  TrendingUp,
  FileText,
  Cloud,
  Briefcase,
  Target,
  Printer,
  Trash2,
  Plus,
  Sparkles,
  Download
} from 'lucide-react';
import { PrintReport } from '@/components/PrintReport';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

const CURRENT_VERSION = 'v1.1.4';

function App() {
  const { user: authUser, status: authStatus, error: authError, signInWithGoogle, signOut } = useAuth();
  const {
    data,
    isLoaded,
    currentUser,
    setUser,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateRecurringTransactions,
    addProject,
    updateProject,
    deleteProject,
    addCategory,
    updateCategory,
    deleteCategory,
    addChequeNote,
    updateChequeNote,
    deleteChequeNote,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    setAllData,
    unlockStorage,
    enableEncryption,
    disableEncryption,
    lockStorage,
    isDecrypted,
    importData,
  } = useStorage();

  const cloudSync = useCloudSync(data, setAllData, authUser, signOut);



  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [dateRange, setDateRange] = useState({
    startDate: getToday(),
    endDate: getToday(),
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Advanced filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Savings Goal form state
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalProject, setGoalProject] = useState('');

  // Individual goal contribution input states (map of goalId -> amountString)
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const [hasSelectedOnLaunch, setHasSelectedOnLaunch] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomeDesc, setWelcomeDesc] = useState('');
  const [welcomeColor, setWelcomeColor] = useState('#ef4444');
  const [appVersion, setAppVersion] = useState(CURRENT_VERSION);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [isGoalFormExpanded, setIsGoalFormExpanded] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showMobileUpdateDialog, setShowMobileUpdateDialog] = useState(false);
  const [mobileUpdateInfo, setMobileUpdateInfo] = useState<{ version: string; downloadUrl: string; body: string } | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((ver: string) => {
        setAppVersion(`v${ver}`);
      });
    }
  }, []);
  
  const isPasswordRequired = checkPassword();
  const [isLocked, setIsLocked] = useState(isPasswordRequired && !isDecrypted);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Auto lock timeout settings
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('gelir-gider-autolock');
    return saved ? parseInt(saved, 10) : 5; // default 5 minutes
  });

  // Theme support ('light' | 'dark' | 'system')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('gelir-gider-theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });

  // Dynamic currency setting
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('gelir-gider-currency') || 'TRY');

  // Exchange rates state (relative to TRY - stores the value of 1 unit of foreign currency in TRY)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    TRY: 1,
    USD: 33.0,
    EUR: 35.5,
    GBP: 42.0,
  });

  // Fetch live exchange rates relative to TRY
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/TRY')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          const tryToUsd = data.rates.USD;
          const tryToEur = data.rates.EUR;
          const tryToGbp = data.rates.GBP;
          if (tryToUsd && tryToEur) {
            setExchangeRates({
              TRY: 1,
              USD: 1 / tryToUsd,
              EUR: 1 / tryToEur,
              GBP: tryToGbp ? 1 / tryToGbp : 42.0,
            });
          }
        }
      })
      .catch((err) => {
        console.error('Döviz kurları API bağlantı hatası, varsayılan kurlar kullanılıyor:', err);
      });
  }, []);

  // Sync isLocked with isDecrypted and isPasswordRequired
  useEffect(() => {
    setIsLocked(isPasswordRequired && !isDecrypted);
  }, [isPasswordRequired, isDecrypted]);

  // Sync goalProject with selectedProject
  useEffect(() => {
    setGoalProject(selectedProject || '');
  }, [selectedProject]);

  useEffect(() => {
    if (isLoaded && !isLocked) {
      const lastSeen = localStorage.getItem('gelir-gider-last-seen-version');
      if (lastSeen !== CURRENT_VERSION) {
        setShowChangelog(true);
      }
    }
  }, [isLoaded, isLocked]);

  const handleCloseChangelog = () => {
    localStorage.setItem('gelir-gider-last-seen-version', CURRENT_VERSION);
    setShowChangelog(false);
  };

  // Mobil güncelleme kontrolü
  useEffect(() => {
    if (!isCapacitor() || !isLoaded || isLocked) return;

    const checkMobileUpdate = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/Muphrids/gelir-gider-takip/releases/latest');
        if (!response.ok) return;
        
        const release = await response.json();
        const latestVersion = release.tag_name; // e.g. "v1.1.2"
        
        const cleanLatest = latestVersion.replace(/^v/, '');
        const cleanCurrent = CURRENT_VERSION.replace(/^v/, '');
        
        if (cleanLatest !== cleanCurrent) {
          const apkAsset = release.assets.find((asset: any) => asset.name.endsWith('.apk'));
          if (apkAsset) {
            setMobileUpdateInfo({
              version: latestVersion,
              downloadUrl: apkAsset.browser_download_url,
              body: release.body || 'Bu güncelleme kararlılık iyileştirmeleri ve hata düzeltmeleri içerir.'
            });
            setShowMobileUpdateDialog(true);
          }
        }
      } catch (err) {
        console.error('Mobil güncelleme kontrolü başarısız oldu:', err);
      }
    };

    void checkMobileUpdate();
  }, [isLoaded, isLocked]);

  // Handle inactivity auto-lock
  useEffect(() => {
    if (!isPasswordRequired || isLocked) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (autoLockTimeout > 0) {
        timeoutId = window.setTimeout(() => {
          lockStorage();
          toast.warning('Uzun süre işlem yapılmadığı için uygulama otomatik kilitlendi.');
        }, autoLockTimeout * 60 * 1000);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [autoLockTimeout, isPasswordRequired, isLocked, lockStorage]);

  // Handle Theme switching
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (currentTheme: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(currentTheme);
    };

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      applyTheme(systemTheme);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme);
    }

    localStorage.setItem('gelir-gider-theme', theme);
  }, [theme]);

  // Auto-select company if there is only one
  useEffect(() => {
    if (isLoaded && !isLocked && data.projects.length === 1) {
      setSelectedProject(data.projects[0].id);
    }
  }, [isLoaded, isLocked, data.projects]);

  // Capacitor Android Physical Back Button handler for stability
  useEffect(() => {
    if (!isCapacitor()) return;

    const backButtonHandler = CapApp.addListener('backButton', () => {
      // 1. If screen is locked, do nothing
      if (isLocked) return;

      // 2. If multi-company launch selector modal is open, close it (switch to all view)
      if (data.projects.length > 1 && selectedProject === null && !hasSelectedOnLaunch) {
        setHasSelectedOnLaunch(true);
        return;
      }

      // 3. If active tab is not transactions, switch back to it
      if (activeTab !== 'transactions') {
        setActiveTab('transactions');
        return;
      }

      // 4. If we are on transactions tab and no modal is blocking, exit the app
      void CapApp.exitApp();
    });

    return () => {
      void backButtonHandler.then((h: { remove: () => void }) => h.remove());
    };
  }, [isLocked, activeTab, data.projects, selectedProject, hasSelectedOnLaunch]);

  const handleCreateWelcomeProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!welcomeName.trim()) return;
    const newProj = addProject({
      name: welcomeName.trim(),
      description: welcomeDesc.trim() || undefined,
      color: welcomeColor,
      isActive: true,
    });
    setSelectedProject(newProj.id);
    toast.success(`Gelir Gider Takip'e hoş geldiniz! '${welcomeName}' şirketi oluşturuldu.`);
  };

  // Check password on mount / check for password reset via Google auth
  useEffect(() => {
    const isResetPending = localStorage.getItem('gelir-gider-reset-pending') === 'true';
    if (isResetPending && authUser) {
      localStorage.removeItem('gelir-gider-password');
      localStorage.removeItem('gelir-gider-reset-pending');
      setIsLocked(false);
      toast.success('Kimliğiniz Google ile doğrulandı, yerel şifreniz sıfırlandı.');
    } else if (checkPassword() && !isDecrypted) {
      setIsLocked(true);
    }
  }, [authUser, isDecrypted]);

  // Auto-updater States
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [updateError, setUpdateError] = useState<string>('');

  useEffect(() => {
    if (window.electronAPI?.onUpdateStatus) {
      const unsubscribeStatus = window.electronAPI.onUpdateStatus((status: string, version: string | null, errorMsg: string | null) => {
        setUpdateStatus(status);
        if (version) setUpdateVersion(version);
        if (errorMsg) setUpdateError(errorMsg);
        
        if (status === 'available') {
          toast.info(`Yeni güncelleme tespit edildi: Sürüm ${version}`, {
            description: 'Güncelleme paketi arka planda otomatik olarak indiriliyor...',
            duration: 6000,
          });
        }

        if (status === 'downloaded') {
          toast.success(`Yeni güncelleme (Sürüm ${version}) başarıyla indirildi!`, {
            description: 'Yüklemek ve güncel sürümle başlatmak için tıklayın.',
            action: {
              label: 'Yükle ve Yeniden Başlat',
              onClick: () => window.electronAPI?.installUpdate(),
            },
            duration: 15000,
          });
        }
      });

      const unsubscribeProgress = window.electronAPI.onUpdateProgress((percent: number) => {
        setUpdateProgress(percent);
        setUpdateStatus('downloading');
      });

      return () => {
        unsubscribeStatus();
        unsubscribeProgress();
      };
    }
  }, []);

  const handleManualUpdateCheck = async () => {
    if (window.electronAPI?.checkForUpdates) {
      setUpdateError('');
      setUpdateStatus('checking');
      await window.electronAPI.checkForUpdates();
    }
  };

  const handleResetViaGoogle = async () => {
    try {
      localStorage.setItem('gelir-gider-reset-pending', 'true');
      await signOut();
      toast.info('Google ile tekrar giriş yapmak için oturum kapatılıyor...');
    } catch {
      localStorage.removeItem('gelir-gider-reset-pending');
      toast.error('Oturum kapatılırken bir hata oluştu.');
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gelir_gider_yedek_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Yerel yedek başarıyla indirildi.');
    } catch {
      toast.error('Yedek indirilirken bir hata oluştu.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.transactions || !parsed.categories || !parsed.projects) {
          toast.error('Geçersiz yedek dosyası formatı.');
          return;
        }

        const confirmRestore = window.confirm(
          'Bu yedek dosyasını yüklemek, mevcut yerel verilerinizin üzerine yazacaktır. Devam etmek istiyor musunuz?'
        );

        if (confirmRestore) {
          const success = importData(text);
          if (success) {
            toast.success('Yedek başarıyla yüklendi ve veriler geri yüklendi.');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            toast.error('Yedek yüklenirken hata oluştu.');
          }
        }
      } catch (err) {
        toast.error('Dosya okunamadı veya geçersiz JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Generate recurring transactions automatically (past and current)
  useEffect(() => {
    if (!isLoaded || isLocked) return;
    const generated = generateRecurringTransactions();
    if (generated.length > 0) {
      generated.forEach(trans => {
        addTransaction(trans);
      });
      toast.success(`${generated.length} yeni sabit işlem geçmişe dönük/güncel olarak otomatik eklendi.`);
    }
  }, [isLoaded, isLocked, data.recurringTransactions, generateRecurringTransactions, addTransaction]);

  // Akıllı Çek & Senet Bildirim Uyarıları
  useEffect(() => {
    if (!isLoaded || !data.chequesAndNotes || data.chequesAndNotes.length === 0) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }

    const pendingItems = data.chequesAndNotes.filter(cn => cn.status === 'pending');
    const todayStr = getToday();

    // Find items due today or overdue
    const alertItems = pendingItems.filter(item => item.dueDate <= todayStr);

    if (alertItems.length > 0) {
      const chequesCount = alertItems.filter(item => item.type === 'cheque').length;
      const notesCount = alertItems.filter(item => item.type === 'promissory_note').length;

      const title = 'Vadesi Gelen Çek / Senet Uyarısı';
      const body = `${chequesCount > 0 ? `${chequesCount} adet çek` : ''}${chequesCount > 0 && notesCount > 0 ? ' ve ' : ''}${notesCount > 0 ? `${notesCount} adet senet` : ''} vadesi gelmiş veya geçmiş durumda.`;

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch (err) {
          console.error('Failed to show notification:', err);
        }
      }

      toast.warning(title, {
        description: body,
        duration: 8000,
      });
    }
  }, [data.chequesAndNotes, isLoaded]);

  const pendingAlertCount = useMemo(() => {
    if (!data.chequesAndNotes) return 0;
    const todayStr = getToday();
    return data.chequesAndNotes.filter(cn => cn.status === 'pending' && cn.dueDate <= todayStr).length;
  }, [data.chequesAndNotes]);

  const selectedProjectColor = useMemo(() => {
    return data.projects.find(p => p.id === selectedProject)?.color || '#3b82f6';
  }, [data.projects, selectedProject]);

  // Filter transactions based on view mode or custom range and project
  const filteredTransactions = useMemo(() => {
    let transactions = data.transactions;
    
    // Filter by project if selected
    if (selectedProject) {
      transactions = transactions.filter(t => t.projectId === selectedProject);
    }
    
    let result;
    if (useCustomRange) {
      result = filterTransactionsByDateRange(transactions, dateRange);
    } else {
      result = filterTransactionsByViewMode(transactions, viewMode, selectedDate);
    }

    // Apply Advanced Filters
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.description.toLowerCase().includes(q));
    }
    
    if (selectedPaymentMethod !== 'all') {
      if (selectedPaymentMethod === 'none') {
        result = result.filter(t => !t.paymentMethod);
      } else {
        result = result.filter(t => t.paymentMethod === selectedPaymentMethod);
      }
    }
    
    if (selectedCategories.length > 0) {
      result = result.filter(t => selectedCategories.includes(t.categoryId));
    }
    
    if (minAmount !== '') {
      const minVal = parseFloat(minAmount);
      if (!isNaN(minVal)) {
        result = result.filter(t => t.amount >= minVal);
      }
    }
    
    if (maxAmount !== '') {
      const maxVal = parseFloat(maxAmount);
      if (!isNaN(maxVal)) {
        result = result.filter(t => t.amount <= maxVal);
      }
    }

    // Sort chronologically (date descending, then createdAt descending)
    return [...result].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [
    data.transactions, 
    viewMode, 
    selectedDate, 
    useCustomRange, 
    dateRange, 
    selectedProject,
    searchQuery,
    selectedPaymentMethod,
    selectedCategories,
    minAmount,
    maxAmount
  ]);

  const dateLabel = useMemo(() => {
    if (useCustomRange) {
      try {
        return `${format(parseISO(dateRange.startDate), 'dd.MM.yyyy')} - ${format(parseISO(dateRange.endDate), 'dd.MM.yyyy')}`;
      } catch {
        return `${dateRange.startDate} - ${dateRange.endDate}`;
      }
    }
    try {
      const date = parseISO(selectedDate);
      switch (viewMode) {
        case 'daily':
          return format(date, 'dd MMMM yyyy', { locale: tr });
        case 'monthly':
          return format(date, 'MMMM yyyy', { locale: tr });
        case 'yearly':
          return format(date, 'yyyy');
        default:
          return '';
      }
    } catch {
      return selectedDate;
    }
  }, [useCustomRange, dateRange, selectedDate, viewMode]);

  const selectedProjectName = useMemo(() => {
    return data.projects.find(p => p.id === selectedProject)?.name || 'Tüm Şirketler';
  }, [data.projects, selectedProject]);

  // Convert all transactions to the selected default currency
  const allTransactionsConverted = useMemo(() => {
    return data.transactions.map(t => {
      if (!t.currency || t.currency === currency) {
        return t;
      }
      const fromRate = exchangeRates[t.currency] || 1;
      const toRate = exchangeRates[currency] || 1;
      const convertedAmount = (t.amount * fromRate) / toRate;
      return {
        ...t,
        amount: Math.round(convertedAmount * 100) / 100
      };
    });
  }, [data.transactions, currency, exchangeRates]);

  // Convert all recurring transactions to the selected default currency
  const allRecurringTransactionsConverted = useMemo(() => {
    return data.recurringTransactions.map(r => {
      if (!r.currency || r.currency === currency) {
        return r;
      }
      const fromRate = exchangeRates[r.currency] || 1;
      const toRate = exchangeRates[currency] || 1;
      const convertedAmount = (r.amount * fromRate) / toRate;
      return {
        ...r,
        amount: Math.round(convertedAmount * 100) / 100
      };
    });
  }, [data.recurringTransactions, currency, exchangeRates]);

  // Convert filtered transactions to the selected default currency for calculations
  const filteredTransactionsConverted = useMemo(() => {
    return filteredTransactions.map(t => {
      if (!t.currency || t.currency === currency) {
        return t;
      }
      const fromRate = exchangeRates[t.currency] || 1;
      const toRate = exchangeRates[currency] || 1;
      const convertedAmount = (t.amount * fromRate) / toRate;
      return {
        ...t,
        amount: Math.round(convertedAmount * 100) / 100
      };
    });
  }, [filteredTransactions, currency, exchangeRates]);

  const currentBalanceConverted = useMemo(() => {
    const txList = selectedProject 
      ? allTransactionsConverted.filter(t => t.projectId === selectedProject)
      : allTransactionsConverted;
    return txList.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  }, [allTransactionsConverted, selectedProject]);

  // Calculate totals
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    return calculateTotals(filteredTransactionsConverted);
  }, [filteredTransactionsConverted]);

  // Calculate category summaries
  const incomeCategorySummary = useMemo(() => {
    return calculateCategorySummary(filteredTransactionsConverted, data.categories, 'income');
  }, [filteredTransactionsConverted, data.categories]);

  const expenseCategorySummary = useMemo(() => {
    return calculateCategorySummary(filteredTransactionsConverted, data.categories, 'expense');
  }, [filteredTransactionsConverted, data.categories]);

  // Calculate company summaries (only when selectedProject is null and we have projects)
  const companySummary = useMemo(() => {
    if (selectedProject !== null || data.projects.length === 0) return [];
    
    const summaries = data.projects.map(project => {
      const projTransactions = filteredTransactionsConverted.filter(t => t.projectId === project.id);
      const income = projTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = projTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      return {
        id: project.id,
        name: project.name,
        color: project.color,
        income,
        expense,
        balance: income - expense,
        transactionCount: projTransactions.length
      };
    });

    // Also calculate for "Genel" (transactions without a project)
    const generalTransactions = filteredTransactionsConverted.filter(t => !t.projectId);
    const generalIncome = generalTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const generalExpense = generalTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    if (generalTransactions.length > 0) {
      summaries.push({
        id: 'general',
        name: 'Genel (İlişkisiz)',
        color: '#6b7280',
        income: generalIncome,
        expense: generalExpense,
        balance: generalIncome - generalExpense,
        transactionCount: generalTransactions.length
      });
    }

    return summaries.filter(s => s.transactionCount > 0);
  }, [data.projects, filteredTransactionsConverted, selectedProject]);

  // Handle transaction add
  const handleAddTransaction = (transactionData: {
    amount: number;
    description: string;
    categoryId: string;
    type: 'income' | 'expense';
    date: string;
    paymentMethod?: 'cash' | 'credit_card';
    currency?: string;
  }) => {
    addTransaction({ ...transactionData, projectId: selectedProject || undefined });
    const typeText = transactionData.type === 'income' ? 'Gelir' : 'Gider';
    toast.success(`${typeText} başarıyla eklendi`, {
      description: `${formatCurrency(transactionData.amount, transactionData.currency)} - ${transactionData.description || 'Açıklama yok'}`,
    });
  };

  // Handle recurring transaction add
  const handleAddRecurring = (recurringData: {
    amount: number;
    description: string;
    categoryId: string;
    type: 'income' | 'expense';
    startDate: string;
    endDate?: string;
    isActive: boolean;
    paymentMethod?: 'cash' | 'credit_card';
    currency?: string;
  }) => {
    addRecurringTransaction({ ...recurringData, projectId: selectedProject || undefined });
    toast.success('Sabit işlem eklendi', {
      description: 'Bu işlem her ay otomatik olarak eklenecek',
    });
  };

  // Handle transaction delete
  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
    toast.success('İşlem silindi');
  };

  // Handle savings goal add
  const handleAddSavingsGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(goalTarget);
    if (!goalName.trim() || isNaN(amt) || amt <= 0 || !goalDate) {
      toast.error('Lütfen tüm zorunlu alanları geçerli değerlerle doldurun.');
      return;
    }
    addSavingsGoal({
      name: goalName.trim(),
      targetAmount: amt,
      currentAmount: 0,
      targetDate: goalDate,
      projectId: goalProject || undefined,
    });
    setGoalName('');
    setGoalTarget('');
    setGoalDate('');
    setGoalProject(selectedProject || '');
    toast.success('Finansal hedef başarıyla belirlendi.');
  };

  // Handle add contribution
  const handleAddContributionSubmit = (goalId: string, currentVal: number, maxVal: number) => {
    const amountStr = contributions[goalId] || '';
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Lütfen geçerli bir katkı tutarı girin.');
      return;
    }
    const newVal = Math.min(maxVal, currentVal + amt);
    updateSavingsGoal(goalId, { currentAmount: newVal });
    setContributions(prev => ({ ...prev, [goalId]: '' }));
    toast.success('Hedef birikimine başarıyla katkıda bulunuldu.');
  };

  // Handle category add
  const handleAddCategory = (categoryData: Omit<import('@/types').Category, 'id'>) => {
    addCategory(categoryData);
    toast.success('Kategori eklendi');
  };

  // Handle category delete
  const handleDeleteCategory = (id: string) => {
    deleteCategory(id);
    toast.success('Kategori silindi');
  };

  // Handle project add
  const handleAddProject = (projectData: Omit<import('@/types').Project, 'id' | 'createdAt'>) => {
    addProject(projectData);
    toast.success('Şirket/Proje eklendi');
  };

  // Handle project delete
  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    toast.success('Şirket/Proje silindi');
  };



  const handleUnlock = () => {
    setIsLocked(false);
  };

  // Supabase kullanıcısına göre localStorage anahtarını ayarla
  useEffect(() => {
    if (authUser && authUser.id !== currentUser) {
      setUser(authUser.id);
    }
    if (!authUser && currentUser) {
      setUser(null);
    }
  }, [authUser, currentUser, setUser]);

  const isAuthLoading = authStatus === 'idle' || authStatus === 'loading';

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-600">Giriş doğrulanıyor...</p>
      </div>
    );
  }

  if (!authUser) {
    const handleGoogleSignIn = async () => {
      setIsGoogleSigningIn(true);
      await signInWithGoogle();
      setIsGoogleSigningIn(false);
    };

    return (
      <GoogleLogin
        onSignIn={handleGoogleSignIn}
        isLoading={isGoogleSigningIn}
        error={authError}
        isConfigured={!!supabase}
      />
    );
  }

  if (!isLoaded || (authUser && cloudSync.isInitialLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {!isLoaded ? 'Veriler yükleniyor...' : 'Bulut verileri kontrol ediliyor...'}
        </p>
      </div>
    );
  }

  if (isLoaded && !isLocked && data.projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden transition-colors duration-200">
        <Toaster position="top-right" richColors />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000" />

        <div className="max-w-md w-full bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl shadow-xl p-8 space-y-6 relative z-10 transition-colors duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl text-blue-600 dark:text-blue-400 mb-2">
              <Briefcase className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Hoş Geldiniz!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Finansal takibe başlamak için lütfen ilk şirketinizi (veya takip etmek istediğiniz ana başlığı) oluşturun.
            </p>
          </div>

          <form onSubmit={handleCreateWelcomeProject} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="welcome-name" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Şirket / Proje Adı *
              </label>
              <input
                id="welcome-name"
                value={welcomeName}
                onChange={(e) => setWelcomeName(e.target.value)}
                placeholder="Örn: Yavuz Ticaret, Proje A..."
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="welcome-desc" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Açıklama (Opsiyonel)
              </label>
              <textarea
                id="welcome-desc"
                value={welcomeDesc}
                onChange={(e) => setWelcomeDesc(e.target.value)}
                placeholder="Kısa bir açıklama girin..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all resize-none"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block font-medium">Renk Seçimi</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWelcomeColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      welcomeColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!welcomeName.trim()}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-750 disabled:bg-blue-400 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              Şirketi Oluştur ve Başla
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 dark:text-white transition-colors duration-200">
      <Toaster position="top-right" richColors />
      
      {/* Password Protection */}
      <PasswordProtection 
        isLocked={isLocked} 
        onUnlock={handleUnlock} 
        onResetViaGoogle={handleResetViaGoogle}
        unlockStorage={unlockStorage}
      />

      {/* Launch Company Selector (Multi-Company) */}
      {isLoaded && !isLocked && data.projects.length > 1 && selectedProject === null && !hasSelectedOnLaunch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                İşlem Yapılacak Şirketi Seçin
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Giriş yapmak ve gelir-gider işlemlerinizi yönetmek istediğiniz şirketi seçin:
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[50vh] pr-1">
              {data.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project.id);
                    setHasSelectedOnLaunch(true);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-left transition-all hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:scale-[1.01]"
                >
                  <div
                     className="w-4 h-4 rounded-full shrink-0"
                     style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 dark:text-white block text-sm truncate">
                      {project.name}
                    </span>
                    {project.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                        {project.description}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t dark:border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setHasSelectedOnLaunch(true);
                }}
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 px-4 rounded-lg transition-all"
              >
                Tüm Şirketleri Görüntüle
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b dark:border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Gelir Gider Takip</h1>
                  {data.projects.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedProject || 'all'}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? null : e.target.value;
                          setSelectedProject(val);
                          setHasSelectedOnLaunch(true);
                        }}
                        className="text-xs font-semibold pl-7 pr-6 py-1 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm appearance-none select-none"
                      >
                        <option value="all">🏢 Tüm Şirketler</option>
                        {data.projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name}
                          </option>
                        ))}
                      </select>
                      {selectedProject ? (
                        <span 
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                          style={{ backgroundColor: selectedProjectColor }}
                        />
                      ) : (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none">
                          🏢
                        </span>
                      )}
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none text-gray-400">
                        ▼
                      </span>
                    </div>
                  )}
                  
                  {authUser && (
                    <div 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-white/5 shadow-sm transition-all select-none cursor-help shrink-0"
                      title={
                        !cloudSync.isOnline 
                          ? 'İnternet bağlantısı yok, değişiklikler çevrimdışı kaydediliyor.' 
                          : cloudSync.localStatus === 'loading' 
                            ? 'Verileriniz bulutla senkronize ediliyor...' 
                            : cloudSync.localStatus === 'error' 
                              ? `Eşitleme hatası: ${cloudSync.localError}` 
                              : cloudSync.isSyncPending 
                                ? 'Bekleyen değişiklikler buluta yüklenecek...' 
                                : 'Bulut verileri güncel, tüm işlemler eşitlendi.'
                      }
                    >
                      {!cloudSync.isOnline ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          <Cloud className="w-3 h-3 text-gray-500 shrink-0" />
                          <span className="text-[9px] text-gray-500 font-medium hidden sm:inline">Çevrimdışı</span>
                        </>
                      ) : cloudSync.localStatus === 'loading' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                          <Cloud className="w-3 h-3 text-blue-500 animate-pulse shrink-0" />
                          <span className="text-[9px] text-blue-500 font-medium hidden sm:inline">Eşitleniyor</span>
                        </>
                      ) : cloudSync.localStatus === 'error' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          <Cloud className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="text-[9px] text-red-500 font-medium hidden sm:inline">Hata</span>
                        </>
                      ) : cloudSync.isSyncPending ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <Cloud className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-[9px] text-amber-500 font-medium hidden sm:inline">Bekleyen Yükleme</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <Cloud className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="text-[9px] text-emerald-500 font-medium hidden sm:inline">Eşitlendi</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kişisel finans yöneticiniz</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Bakiye</p>
                <p className={`text-lg font-bold ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto py-1 lg:h-10 lg:py-0 lg:w-auto lg:inline-grid">
            <TabsTrigger value="transactions" className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2 py-1.5 px-1 lg:px-3 text-[10px] lg:text-sm h-full w-full">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] lg:text-xs xl:text-sm font-medium">İşlemler</span>
            </TabsTrigger>
            <TabsTrigger value="cheques_notes" className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2 py-1.5 px-1 lg:px-3 text-[10px] lg:text-sm h-full w-full relative">
              <FileText className="w-4 h-4" />
              <span className="text-[10px] lg:text-xs xl:text-sm font-medium text-center leading-tight">Çek & Senet</span>
              {pendingAlertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white animate-pulse">
                  {pendingAlertCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2 py-1.5 px-1 lg:px-3 text-[10px] lg:text-sm h-full w-full">
              <Target className="w-4 h-4" />
              <span className="text-[10px] lg:text-xs xl:text-sm font-medium">Hedefler</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2 py-1.5 px-1 lg:px-3 text-[10px] lg:text-sm h-full w-full">
              <PieChart className="w-4 h-4" />
              <span className="text-[10px] lg:text-xs xl:text-sm font-medium">Raporlar</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2 py-1.5 px-1 lg:px-3 text-[10px] lg:text-sm h-full w-full">
              <Settings className="w-4 h-4" />
              <span className="text-[10px] lg:text-xs xl:text-sm font-medium">Ayarlar</span>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Summary Cards */}
            <SummaryCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              balance={balance}
              transactionCount={filteredTransactions.length}
              onIncomeClick={() => {
                setActiveTab('reports');
                setTimeout(() => {
                  document.getElementById('reports-income-detail')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              onExpenseClick={() => {
                setActiveTab('reports');
                setTimeout(() => {
                  document.getElementById('reports-expense-detail')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            />

            {/* Filter Bar */}
            <FilterBar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              useCustomRange={useCustomRange}
              onUseCustomRangeChange={setUseCustomRange}
              transactions={selectedProject ? data.transactions.filter(t => t.projectId === selectedProject) : data.transactions}
              categories={data.categories}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedPaymentMethod={selectedPaymentMethod}
              onSelectedPaymentMethodChange={setSelectedPaymentMethod}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={setSelectedCategories}
              minAmount={minAmount}
              onMinAmountChange={setMinAmount}
              maxAmount={maxAmount}
              onMaxAmountChange={setMaxAmount}
            />

            {/* Budget Progress limits */}
            <BudgetProgress
              transactions={allTransactionsConverted}
              categories={data.categories}
              selectedDate={selectedDate}
              projectId={selectedProject}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Forms Column */}
              <div className="hidden lg:block lg:col-span-1 space-y-6">
                <TransactionForm
                  categories={data.categories}
                  transactions={data.transactions}
                  activeCurrency={currency}
                  onSubmit={handleAddTransaction}
                />
                <RecurringTransactionForm
                  categories={data.categories}
                  activeCurrency={currency}
                  onSubmit={handleAddRecurring}
                />
              </div>

              {/* Transaction List */}
              <div className="lg:col-span-2">
                <TransactionList
                  transactions={filteredTransactions}
                  categories={data.categories}
                  projects={data.projects}
                  showProjectBadge={selectedProject === null}
                  onDelete={handleDeleteTransaction}
                  onUpdate={updateTransaction}
                  activeCurrency={currency}
                  exchangeRates={exchangeRates}
                  title={useCustomRange 
                    ? 'Seçili Dönem İşlemleri' 
                    : viewMode === 'daily' 
                      ? 'Günlük İşlemler'
                      : viewMode === 'monthly'
                        ? 'Aylık İşlemler'
                        : 'Yıllık İşlemler'
                  }
                />
              </div>
            </div>

            {/* Floating Action Button for Mobile */}
            <Button
              onClick={() => setIsMobileFormOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full px-4 py-2.5 shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 border border-blue-500/20 h-auto"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-bold whitespace-nowrap">İşlem Ekle</span>
            </Button>

            {/* Dialog Form for Mobile */}
            <Dialog open={isMobileFormOpen} onOpenChange={setIsMobileFormOpen}>
              <DialogContent className="max-w-md w-[95vw] rounded-xl overflow-y-auto max-h-[90vh] bg-slate-900 text-white border-white/10 p-4">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-lg font-bold text-center">İşlem Ekle</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="single" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">Tek Seferlik</TabsTrigger>
                    <TabsTrigger value="recurring">Tekrarlı İşlem</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="mt-0">
                    <TransactionForm
                      categories={data.categories}
                      transactions={data.transactions}
                      activeCurrency={currency}
                      onSubmit={(val) => {
                        handleAddTransaction(val);
                        setIsMobileFormOpen(false);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="recurring" className="mt-0">
                    <RecurringTransactionForm
                      categories={data.categories}
                      activeCurrency={currency}
                      onSubmit={(val) => {
                        handleAddRecurring(val);
                        setIsMobileFormOpen(false);
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Column */}
              <div className="lg:col-span-1">
                <Card className="dark:bg-slate-900 dark:border-white/10">
                  <CardHeader 
                    className="cursor-pointer lg:cursor-default" 
                    onClick={() => { if (window.innerWidth < 1024) setIsGoalFormExpanded(!isGoalFormExpanded); }}
                  >
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span>Yeni Hedef Belirle</span>
                      </div>
                      <span className="lg:hidden text-xs text-blue-500 font-semibold">{isGoalFormExpanded ? 'Göster/Gizle' : 'Göster/Gizle'}</span>
                    </CardTitle>
                  </CardHeader>
                  <div className={isGoalFormExpanded ? 'block' : 'hidden lg:block'}>
                    <CardContent>
                      <form onSubmit={handleAddSavingsGoalSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="goal-name-input" className="text-xs font-semibold">Hedef Adı *</Label>
                          <input
                            id="goal-name-input"
                            type="text"
                            value={goalName}
                            onChange={(e) => setGoalName(e.target.value)}
                            placeholder="Örn: Yeni Bilgisayar, Tatil..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="goal-target-input" className="text-xs font-semibold">Hedef Tutar ({getCurrencySymbol()}) *</Label>
                          <input
                            id="goal-target-input"
                            type="number"
                            value={goalTarget}
                            onChange={(e) => setGoalTarget(e.target.value)}
                            placeholder="Örn: 50000"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="goal-date-input" className="text-xs font-semibold">Hedef Tarihi *</Label>
                          <input
                            id="goal-date-input"
                            type="date"
                            value={goalDate}
                            onChange={(e) => setGoalDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {data.projects.length > 0 && (
                          <div className="space-y-1.5">
                            <Label htmlFor="goal-project-select" className="text-xs font-semibold">Şirket / Proje İlişkisi</Label>
                            <select
                              id="goal-project-select"
                              value={goalProject}
                              onChange={(e) => setGoalProject(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-white"
                            >
                              <option value="">🏢 Kişisel (Şirket Dışı)</option>
                              {data.projects.map(proj => (
                                <option key={proj.id} value={proj.id}>{proj.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <Button type="submit" className="w-full font-bold flex items-center justify-center gap-1.5 mt-2 cursor-pointer">
                          <Plus className="w-4 h-4" />
                          Hedefi Kaydet
                        </Button>
                      </form>
                    </CardContent>
                  </div>
                </Card>
              </div>

              {/* Goals List Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    🎯 Aktif Finansal Hedefleriniz
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Toplam: {(data.savingsGoals || []).filter(g => !selectedProject || g.projectId === selectedProject).length} Hedef
                  </span>
                </div>

                {/* Filter list by active selectedProject */}
                {((data.savingsGoals || []).filter(g => !selectedProject || g.projectId === selectedProject).length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(data.savingsGoals || [])
                      .filter(g => !selectedProject || g.projectId === selectedProject)
                      .map((goal) => {
                        const project = data.projects.find(p => p.id === goal.projectId);
                        const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                        const isAchieved = progress >= 100;
                        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                        let daysLeft = 0;
                        try {
                          const targetD = new Date(goal.targetDate);
                          const todayD = new Date();
                          const diffTime = targetD.getTime() - todayD.getTime();
                          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        } catch {}

                        return (
                          <Card key={goal.id} className="relative overflow-hidden border dark:border-white/10 dark:bg-slate-900 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
                            {isAchieved && (
                              <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold uppercase tracking-wider py-1 px-3.5 rounded-bl-lg shadow-sm">
                                Tamamlandı 🎉
                              </div>
                            )}

                            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white text-base truncate max-w-[170px]">
                                      {goal.name}
                                    </h4>
                                    {project && (
                                      <span 
                                        className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border"
                                        style={{ 
                                          borderColor: `${project.color}30`, 
                                          color: project.color,
                                          backgroundColor: `${project.color}10`
                                        }}
                                      >
                                        {project.name}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => deleteSavingsGoal(goal.id)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 cursor-pointer"
                                    title="Hedefi Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="mt-4 space-y-2">
                                  <div className="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden border dark:border-white/5">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${isAchieved ? 'bg-green-500' : 'bg-blue-500'}`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-gray-500 dark:text-gray-400">İlerleme: %{progress}</span>
                                    <span className={isAchieved ? 'text-green-600' : 'text-blue-600'}>
                                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3 pt-3 border-t dark:border-white/5 mt-4 text-xs font-medium">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Vade Tarihi:</span>
                                  <span className="text-gray-800 dark:text-gray-200">
                                    {format(parseISO(goal.targetDate), 'dd.MM.yyyy')}
                                    {!isAchieved && (
                                      <span className={`ml-1 font-bold ${daysLeft > 0 ? (daysLeft <= 30 ? 'text-amber-500' : 'text-gray-500') : 'text-red-500'}`}>
                                        ({daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Vadesi geçmiş'})
                                      </span>
                                    )}
                                  </span>
                                </div>

                                {!isAchieved && (
                                  <div className="flex justify-between font-bold">
                                    <span className="text-gray-500 dark:text-gray-400">Kalan Tutar:</span>
                                    <span className="text-amber-600">{formatCurrency(remaining)}</span>
                                  </div>
                                )}

                                {/* Contribution form */}
                                {!isAchieved && (
                                  <div className="flex gap-2 pt-2 items-center animate-in fade-in duration-200">
                                    <input
                                      type="number"
                                      value={contributions[goal.id] || ''}
                                      onChange={(e) => setContributions(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                      placeholder="Katkı Tutar..."
                                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddContributionSubmit(goal.id, goal.currentAmount, goal.targetAmount)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow hover:shadow-md transition-all cursor-pointer flex items-center gap-0.5"
                                    >
                                      Ekle
                                    </button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400 dark:text-gray-500 border border-dashed dark:border-white/5 rounded-2xl bg-white dark:bg-slate-900">
                    <Target className="w-12 h-12 text-gray-300 dark:text-slate-800 mx-auto mb-3" />
                    <p className="text-sm font-semibold">Henüz belirlenmiş hedef bulunmuyor.</p>
                    <p className="text-xs text-gray-500 mt-1">Yandaki formu kullanarak hayal ettiğiniz birikim hedefini hemen oluşturun!</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Filter Bar for Reports */}
            <FilterBar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              useCustomRange={useCustomRange}
              onUseCustomRangeChange={setUseCustomRange}
              transactions={selectedProject ? data.transactions.filter(t => t.projectId === selectedProject) : data.transactions}
              categories={data.categories}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedPaymentMethod={selectedPaymentMethod}
              onSelectedPaymentMethodChange={setSelectedPaymentMethod}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={setSelectedCategories}
              minAmount={minAmount}
              onMinAmountChange={setMinAmount}
              maxAmount={maxAmount}
              onMaxAmountChange={setMaxAmount}
            />

            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-50/50 dark:bg-slate-800/10 p-4 rounded-xl border dark:border-white/5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Bu döneme ait mali verileri yüksek çözünürlüklü A4 PDF belgesi veya Türkçe karakter uyumlu Excel/CSV tablosu olarak indirin.
              </span>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button 
                  onClick={() => downloadTransactionsCSV(filteredTransactions, data.categories, data.projects)} 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Excel (CSV) Raporu İndir
                </Button>
                <Button onClick={() => window.print()} size="sm" className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <Printer className="w-4 h-4" />
                  PDF Raporu Oluştur (Yazdır)
                </Button>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <MonthlyComparisonChart
              transactions={allTransactionsConverted}
              selectedDate={selectedDate}
              projectId={selectedProject}
            />

            {/* Cash Flow Forecast Chart */}
            <CashFlowForecastChart
              recurringTransactions={selectedProject ? allRecurringTransactionsConverted.filter(r => r.projectId === selectedProject) : allRecurringTransactionsConverted}
              transactions={selectedProject ? allTransactionsConverted.filter(t => t.projectId === selectedProject) : allTransactionsConverted}
              currentBalance={currentBalanceConverted}
              selectedDate={selectedDate}
              savingsGoals={selectedProject ? (data.savingsGoals || []).filter(g => g.projectId === selectedProject) : (data.savingsGoals || [])}
            />

            {/* Summary Cards */}
            <SummaryCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              balance={balance}
              transactionCount={filteredTransactions.length}
            />

            {selectedProject === null && data.projects.length > 0 && companySummary.length > 0 && (
              <Card className="w-full dark:bg-slate-900 dark:border-white/10 dark:text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Şirket Dağılımı Özet Raporu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companySummary.map(summary => (
                      <div 
                        key={summary.id} 
                        className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: summary.color }}
                            />
                            <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                              {summary.name}
                            </h3>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400 font-medium">Toplam Gelir:</span>
                              <span className="font-semibold text-green-600">+{formatCurrency(summary.income)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400 font-medium">Toplam Gider:</span>
                              <span className="font-semibold text-red-600">-{formatCurrency(summary.expense)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-white/5 flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Net Bakiye:</span>
                          <span className={`font-bold text-sm ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall Chart */}
              <OverallChart
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                title="Gelir vs Gider Dağılımı"
              />

              {/* Income Chart */}
              <div id="reports-income-detail" className="w-full">
                <CategoryChart
                  data={incomeCategorySummary}
                  title="Gelir Dağılımı"
                  type="income"
                />
              </div>

              {/* Expense Chart */}
              <div id="reports-expense-detail" className="w-full">
                <CategoryChart
                  data={expenseCategorySummary}
                  title="Gider Dağılımı"
                  type="expense"
                />
              </div>
            </div>
          </TabsContent>

          {/* Cheques and Notes Tab */}
          <TabsContent value="cheques_notes" className="space-y-6">
            <ChequeNoteManager
              chequesAndNotes={data.chequesAndNotes || []}
              projects={data.projects}
              categories={data.categories}
              onAdd={addChequeNote}
              onUpdate={updateChequeNote}
              onDelete={deleteChequeNote}
              onAddTransaction={handleAddTransaction}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" forceMount className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bulut Senkronizasyonu (Supabase) */}
              <CloudSync cloudSync={cloudSync} />

              {/* Password Settings */}
              <PasswordSettings 
                enableEncryption={enableEncryption}
                disableEncryption={disableEncryption}
              />

              {/* Uygulama Ayarları (Karanlık Mod ve Otomatik Kilit) */}
              <Card className="w-full dark:bg-slate-900 dark:border-white/10 dark:text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Uygulama Seçenekleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tema Seçici */}
                  <div className="space-y-2">
                    <Label htmlFor="theme-select" className="text-sm font-medium">Arayüz Teması</Label>
                    <select
                      id="theme-select"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-slate-800 dark:border-white/10 dark:text-white"
                    >
                      <option value="light">Açık Tema (Light Mode)</option>
                      <option value="dark">Koyu Tema (Dark Mode)</option>
                      <option value="system">Sistem Teması (System Default)</option>
                    </select>
                  </div>

                  {/* Para Birimi Seçici */}
                  <div className="space-y-2">
                    <Label htmlFor="currency-select" className="text-sm font-medium">Varsayılan Para Birimi</Label>
                    <select
                      id="currency-select"
                      value={currency}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrencyState(val);
                        localStorage.setItem('gelir-gider-currency', val);
                        toast.success(`Varsayılan para birimi ${val} olarak ayarlandı.`);
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-slate-800 dark:border-white/10 dark:text-white"
                    >
                      <option value="TRY">Türk Lirası (₺ - TRY)</option>
                      <option value="USD">Amerikan Doları ($ - USD)</option>
                      <option value="EUR">Euro (€ - EUR)</option>
                      <option value="GBP">İngiliz Sterlini (£ - GBP)</option>
                    </select>
                  </div>

                  {/* Otomatik Kilit Seçici */}
                  <div className="space-y-2">
                    <Label htmlFor="autolock-select" className="text-sm font-medium">Otomatik Kilit Süresi</Label>
                    <select
                      id="autolock-select"
                      value={autoLockTimeout}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setAutoLockTimeout(val);
                        localStorage.setItem('gelir-gider-autolock', val.toString());
                        toast.success(`Otomatik kilit süresi ${val === 0 ? 'devre dışı bırakıldı' : `${val} dakika olarak ayarlandı`}.`);
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring dark:bg-slate-800 dark:border-white/10 dark:text-white"
                    >
                      <option value="0">Devre Dışı (Kilitlenmesin)</option>
                      <option value="1">1 Dakika Hareketsizlik</option>
                      <option value="5">5 Dakika Hareketsizlik</option>
                      <option value="10">10 Dakika Hareketsizlik</option>
                      <option value="15">15 Dakika Hareketsizlik</option>
                      <option value="30">30 Dakika Hareketsizlik</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Uygulamada herhangi bir hareket olmazsa ekran otomatik olarak kilitlenir. (Sadece şifre koruması aktifken çalışır)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Yerel Veri Yedekleme ve Yükleme */}
              <Card className="w-full dark:bg-slate-900 dark:border-white/10 dark:text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Yerel Veri Yedekleme & Geri Yükleme
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Yerel verilerinizi JSON dosyası olarak bilgisayarınıza yedekleyebilir veya daha önce aldığınız bir yedek dosyasından verilerinizi geri yükleyebilirsiniz.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={handleExportBackup}
                      className="flex-1"
                    >
                      Yedek İndir (JSON)
                    </Button>
                    <div className="flex-1 relative">
                      <input
                        type="file"
                        id="backup-upload"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('backup-upload')?.click()}
                        className="w-full"
                      >
                        Yedek Yükle (JSON)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Manager */}
              <ProjectManager
                projects={data.projects}
                onAdd={handleAddProject}
                onUpdate={updateProject}
                onDelete={handleDeleteProject}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
              />

              {/* Category Manager */}
              <CategoryManager
                categories={data.categories}
                onAdd={handleAddCategory}
                onUpdate={updateCategory}
                onDelete={handleDeleteCategory}
              />

              {/* Recurring Transaction Manager */}
              <RecurringTransactionManager
                recurringTransactions={data.recurringTransactions}
                categories={data.categories}
                onToggleActive={(id, isActive) => updateRecurringTransaction(id, { isActive })}
                onDelete={deleteRecurringTransaction}
              />

              {/* Güncelleme Denetleyici */}
              {window.electronAPI?.isElectron && (
                <Card className="w-full dark:bg-slate-900 dark:border-white/10 dark:text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-blue-600" />
                      Uygulama Güncellemeleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Mevcut Sürüm</p>
                        <p className="text-xs text-gray-500">{appVersion}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleManualUpdateCheck}
                        disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                      >
                        {updateStatus === 'checking' ? 'Denetleniyor...' : 'Güncellemeleri Denetle'}
                      </Button>
                    </div>

                    {updateStatus === 'checking' && (
                      <p className="text-xs text-gray-500">Yeni sürümler kontrol ediliyor...</p>
                    )}

                    {updateStatus === 'available' && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                        Yeni sürüm ({updateVersion}) bulundu! İndiriliyor...
                      </p>
                    )}

                    {updateStatus === 'downloading' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Güncelleme indiriliyor...</span>
                          <span>%{updateProgress}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-200" 
                            style={{ width: `${updateProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {updateStatus === 'downloaded' && (
                      <div className="flex flex-col gap-2 p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-lg">
                        <p className="text-xs text-green-700 dark:text-green-300 font-semibold">
                          Yeni sürüm (v{updateVersion}) başarıyla indirildi. Yüklemek ve güncel sürümü başlatmak için tıklayın.
                        </p>
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-750 text-white" onClick={() => window.electronAPI?.installUpdate()}>
                          Güncelle ve Yeniden Başlat
                        </Button>
                      </div>
                    )}

                    {updateStatus === 'not-available' && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Uygulamanız en son sürümde.</p>
                    )}

                    {updateStatus === 'error' && (
                      <p className="text-xs text-red-500 font-medium">Güncelleme denetlenirken hata oluştu: {updateError}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t dark:border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Gelir Gider Takip - Kişisel finans yöneticiniz
          </p>
        </div>
      </footer>

      <PrintReport
        transactions={filteredTransactionsConverted}
        categories={data.categories}
        selectedProjectName={selectedProjectName}
        dateLabel={dateLabel}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={balance}
      />

      <Dialog open={showChangelog} onOpenChange={(open) => { if (!open) handleCloseChangelog(); }}>
        <DialogContent className="max-w-md md:max-w-lg bg-background border-border text-foreground p-6 rounded-2xl shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-white/10">
          <DialogHeader className="text-left pb-4 border-b border-border dark:border-white/10 flex flex-row items-center gap-3 space-y-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground dark:text-white">Yeni Güncelleme: v1.1.4</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Gelir Gider Takip yenilendi!</p>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Uygulamamıza çoklu para birimi ve gelişmiş Excel/CSV raporlama özelliklerini getirdik. İşte v1.1.4 sürümüyle gelen yenilikler:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 dark:bg-slate-800/40 dark:border-white/5 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1.5 text-blue-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Çoklu Para Birimi Desteği
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  İşlem bazlı döviz seçimi (TRY, USD, EUR) eklendi. Tüm finansal özetleriniz, grafikleriniz ve öngörüleriniz otomatik olarak seçtiğiniz varsayılan para biriminde hesaplanır.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 dark:bg-slate-800/40 dark:border-white/5 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1.5 text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Canlı Döviz Kurları
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Uygulama açılışında en güncel kurlar internet üzerinden otomatik çekilir, böylece anlık ve doğru bakiye çevrimleri yapılır. Çevrimdışı çalışırken ise güvenli varsayılan kurlar kullanılır.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 dark:bg-slate-800/40 dark:border-white/5 hover:border-violet-500/30 transition-all">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1.5 text-violet-500">
                  <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                  Excel (CSV) Dışa Aktarım
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Raporlar sekmesinden tüm işlem dökümlerinizi Türkçe karakter ve UTF-8 BOM uyumlu olarak Excel'e (CSV) tek tıkla aktarabilirsiniz.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 dark:bg-slate-800/40 dark:border-white/5 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-2 font-semibold text-sm mb-1.5 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Hata Düzeltmeleri & Grafik Düzeltimi
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Kasa akışı simülasyon grafiğindeki görsel kesik çizgi hatası giderildi, şablon hedeflerinin filtre senkronizasyonu mükemmelleştirildi.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-border dark:border-white/10 flex justify-end">
            <Button onClick={handleCloseChangelog} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-xl transition-all">
              Harika, Keşfedelim!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMobileUpdateDialog} onOpenChange={setShowMobileUpdateDialog}>
        <DialogContent className="max-w-md bg-background border-border text-foreground p-6 rounded-2xl shadow-2xl overflow-hidden dark:bg-slate-900 dark:border-white/10">
          <DialogHeader className="text-left pb-4 border-b border-border dark:border-white/10 flex flex-row items-center gap-3 space-y-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 animate-bounce">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground dark:text-white">Yeni Güncelleme Hazır!</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Gelir Gider Takip Mobil sürümü güncellendi.</p>
            </div>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-foreground">
              Yeni bir mobil güncelleme mevcut: <span className="font-semibold text-blue-500">{mobileUpdateInfo?.version}</span>
            </p>
            <div className="p-3 bg-secondary/50 dark:bg-slate-800/50 rounded-xl border border-border dark:border-white/5">
              <p className="text-xs font-semibold mb-1 text-muted-foreground">Güncelleme Notları:</p>
              <p className="text-xs text-foreground whitespace-pre-line leading-relaxed max-h-[150px] overflow-y-auto pr-1">
                {mobileUpdateInfo?.body}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              * "Güncelle" butonuna tıkladığınızda güncel APK dosyası indirilecektir. İndirme bittiğinde dosyayı açarak güncellemeyi tamamlayabilirsiniz.
            </p>
          </div>
          <div className="pt-4 border-t border-border dark:border-white/10 flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowMobileUpdateDialog(false)} className="w-full sm:w-auto rounded-xl">
              Daha Sonra
            </Button>
            <Button 
              onClick={() => {
                if (mobileUpdateInfo?.downloadUrl) {
                  window.open(mobileUpdateInfo.downloadUrl, '_system');
                }
              }} 
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-xl transition-all"
            >
              Güncelle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
