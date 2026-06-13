import { useState, useEffect, useCallback } from 'react';
import type { AppData, Transaction, Category, RecurringTransaction, Project, ChequeNote, SavingsGoal } from '@/types';
import { encryptData, decryptData } from '@/lib/encryption';
import { getToday } from '@/lib/utils';


const STORAGE_KEY = 'gelir-gider-data';
const USER_KEY = 'gelir-gider-user';

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Maaş', type: 'income', color: '#22c55e', icon: 'wallet' },
  { id: 'cat-2', name: 'Ek Gelir', type: 'income', color: '#10b981', icon: 'trending-up' },
  { id: 'cat-3', name: 'Yatırım', type: 'income', color: '#059669', icon: 'bar-chart' },
  { id: 'cat-4', name: 'Kira', type: 'expense', color: '#ef4444', icon: 'home' },
  { id: 'cat-5', name: 'Market', type: 'expense', color: '#f97316', icon: 'shopping-cart' },
  { id: 'cat-6', name: 'Ulaşım', type: 'expense', color: '#eab308', icon: 'car' },
  { id: 'cat-7', name: 'Faturalar', type: 'expense', color: '#3b82f6', icon: 'zap' },
  { id: 'cat-8', name: 'Sağlık', type: 'expense', color: '#ec4899', icon: 'heart' },
  { id: 'cat-9', name: 'Eğlence', type: 'expense', color: '#8b5cf6', icon: 'film' },
  { id: 'cat-10', name: 'Diğer', type: 'expense', color: '#6b7280', icon: 'more-horizontal' },
];

const defaultData: AppData = {
  transactions: [],
  categories: defaultCategories,
  recurringTransactions: [],
  projects: [],
  chequesAndNotes: [],
  savingsGoals: [],
  lastUpdated: new Date(0).toISOString(),
};

export function useStorage() {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);

  // Helper function to hash password asynchronously (identical to PasswordProtection)
  const hashPassword = async (password: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        // Load current user
        const user = localStorage.getItem(USER_KEY);
        if (user) {
          setCurrentUser(user);
        }

        const passwordSet = !!localStorage.getItem('gelir-gider-password');
        if (passwordSet) {
          // Locked state: mark loaded, but do not decrypt until key is provided
          setIsLoaded(true);
          return;
        }

        // Load data for current user or default
        const storageKey = user ? `${STORAGE_KEY}-${user}` : STORAGE_KEY;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setData({
            ...defaultData,
            ...parsed,
            categories: parsed.categories?.length > 0 ? parsed.categories : defaultCategories,
            chequesAndNotes: parsed.chequesAndNotes || [],
            savingsGoals: parsed.savingsGoals || [],
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setIsLoaded(true);
    };
    loadData();
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const saveEncrypted = async () => {
      if (isLoaded) {
        const passwordSet = !!localStorage.getItem('gelir-gider-password');
        // Guard: do not write defaultData if database is encrypted and not unlocked yet
        if (passwordSet && !decryptionKey) {
          return;
        }

        const storageKey = currentUser ? `${STORAGE_KEY}-${currentUser}` : STORAGE_KEY;
        let rawData = JSON.stringify(data);
        if (passwordSet && decryptionKey) {
          rawData = await encryptData(rawData, decryptionKey);
        }
        localStorage.setItem(storageKey, rawData);
      }
    };
    void saveEncrypted();
  }, [data, isLoaded, currentUser, decryptionKey]);

  const setUser = useCallback((userId: string | null) => {
    if (userId) {
      localStorage.setItem(USER_KEY, userId);
    } else {
      localStorage.removeItem(USER_KEY);
    }
    setCurrentUser(userId);
    
    const passwordSet = !!localStorage.getItem('gelir-gider-password');
    if (passwordSet) {
      setDecryptionKey(null);
      setData(defaultData);
      return;
    }

    // Reload data for new user
    const storageKey = userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData({
          ...defaultData,
          ...parsed,
          categories: parsed.categories?.length > 0 ? parsed.categories : defaultCategories,
          chequesAndNotes: parsed.chequesAndNotes || [],
          savingsGoals: parsed.savingsGoals || [],
        });
      } catch {
        setData(defaultData);
      }
    } else {
      setData(defaultData);
    }
  }, []);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      lastUpdated: new Date().toISOString(),
    }));
    return newTransaction;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  // Recurring Transactions
  const addRecurringTransaction = useCallback((transaction: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecurring: RecurringTransaction = {
      ...transaction,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      recurringTransactions: [...prev.recurringTransactions, newRecurring],
      lastUpdated: new Date().toISOString(),
    }));
    return newRecurring;
  }, []);

  const deleteRecurringTransaction = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      recurringTransactions: prev.recurringTransactions.filter(t => t.id !== id),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const updateRecurringTransaction = useCallback((id: string, updates: Partial<RecurringTransaction>) => {
    setData(prev => ({
      ...prev,
      recurringTransactions: prev.recurringTransactions.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  // Generate transactions from recurring ones
  const generateRecurringTransactions = useCallback((targetYear?: number, targetMonth?: number): Transaction[] => {
    const generated: Transaction[] = [];
    const todayStr = getToday();
    const todayDate = new Date(todayStr);

    data.recurringTransactions.forEach(recurring => {
      if (!recurring.isActive) return;
      
      const startDate = new Date(recurring.startDate);
      const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
      
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      
      // Determine limits of generation range
      let endYear = todayDate.getFullYear();
      let endMonth = todayDate.getMonth();
      
      if (targetYear !== undefined && targetMonth !== undefined) {
        endYear = targetYear;
        endMonth = targetMonth - 1;
      }
      
      const monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (monthDiff < 0) return;
      
      for (let step = 0; step <= monthDiff; step++) {
        const tempDate = new Date(startYear, startMonth + step, 1);
        const y = tempDate.getFullYear();
        const m = tempDate.getMonth();
        
        // Get the last day of the month to avoid overflow
        const maxDays = new Date(y, m + 1, 0).getDate();
        const actualDay = Math.min(startDay, maxDays);
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
        
        // Ensure within limits
        const isBeforeOrEqualEnd = !endDate || dateStr <= recurring.endDate!;
        const isBeforeOrEqualLimit = (targetYear !== undefined && targetMonth !== undefined) || dateStr <= todayStr;
        
        if (dateStr >= recurring.startDate && isBeforeOrEqualEnd && isBeforeOrEqualLimit) {
          // Check if already generated
          const alreadyExists = data.transactions.some(
            t => t.date === dateStr &&
                 t.description === recurring.description &&
                 t.amount === recurring.amount
          );
          
          if (!alreadyExists) {
            generated.push({
              id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              amount: recurring.amount,
              description: recurring.description,
              categoryId: recurring.categoryId,
              type: recurring.type,
              date: dateStr,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              projectId: recurring.projectId,
              paymentMethod: recurring.paymentMethod,
            });
          }
        }
      }
    });
    
    return generated;
  }, [data.recurringTransactions, data.transactions]);

  // Projects
  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      lastUpdated: new Date().toISOString(),
    }));
    return newProject;
  }, []);

  const deleteProject = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      transactions: prev.transactions.map(t => 
        t.projectId === id ? { ...t, projectId: undefined } : t
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
      lastUpdated: new Date().toISOString(),
    }));
    return newCategory;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
      transactions: prev.transactions.map(t =>
        t.categoryId === id ? { ...t, categoryId: 'cat-10' } : t
      ),
      recurringTransactions: prev.recurringTransactions.map(rt =>
        rt.categoryId === id ? { ...rt, categoryId: 'cat-10' } : rt
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const exportData = useCallback((): string => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setData({
        ...defaultData,
        ...parsed,
        categories: parsed.categories?.length > 0 ? parsed.categories : defaultCategories,
        chequesAndNotes: parsed.chequesAndNotes || [],
        savingsGoals: parsed.savingsGoals || [],
      });
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }, []);

  const setAllData = useCallback((newData: AppData) => {
    setData({
      ...defaultData,
      ...newData,
      categories: newData.categories?.length > 0 ? newData.categories : defaultCategories,
      chequesAndNotes: newData.chequesAndNotes || [],
      savingsGoals: newData.savingsGoals || [],
    });
  }, []);

  const unlockStorage = useCallback(async (password: string): Promise<boolean> => {
    try {
      const storedPassword = localStorage.getItem('gelir-gider-password');
      if (!storedPassword) return true;

      const hashed = await hashPassword(password);
      if (storedPassword !== hashed) {
        return false;
      }

      setDecryptionKey(hashed);

      const storageKey = currentUser ? `${STORAGE_KEY}-${currentUser}` : STORAGE_KEY;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const decrypted = await decryptData(stored, hashed);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          setData({
            ...defaultData,
            ...parsed,
            categories: parsed.categories?.length > 0 ? parsed.categories : defaultCategories,
            chequesAndNotes: parsed.chequesAndNotes || [],
            savingsGoals: parsed.savingsGoals || [],
          });
        } else {
          setData(defaultData);
        }
      } else {
        setData(defaultData);
      }
      return true;
    } catch (error) {
      console.error('Failed to unlock storage:', error);
      return false;
    }
  }, [currentUser]);

  const enableEncryption = useCallback(async (password: string) => {
    const hashed = await hashPassword(password);
    localStorage.setItem('gelir-gider-password', hashed);
    setDecryptionKey(hashed);

    const storageKey = currentUser ? `${STORAGE_KEY}-${currentUser}` : STORAGE_KEY;
    const rawData = await encryptData(JSON.stringify(data), hashed);
    localStorage.setItem(storageKey, rawData);
  }, [data, currentUser]);

  const disableEncryption = useCallback(() => {
    localStorage.removeItem('gelir-gider-password');
    setDecryptionKey(null);

    const storageKey = currentUser ? `${STORAGE_KEY}-${currentUser}` : STORAGE_KEY;
    const rawData = JSON.stringify(data);
    localStorage.setItem(storageKey, rawData);
  }, [data, currentUser]);

  const lockStorage = useCallback(() => {
    setDecryptionKey(null);
    setData(defaultData);
  }, []);

  // Cheque & Note CRUD operations
  const addChequeNote = useCallback((chequeNote: Omit<ChequeNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newChequeNote: ChequeNote = {
      ...chequeNote,
      id: `cn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      chequesAndNotes: [newChequeNote, ...(prev.chequesAndNotes || [])],
      lastUpdated: new Date().toISOString(),
    }));
    return newChequeNote;
  }, []);

  const updateChequeNote = useCallback((id: string, updates: Partial<ChequeNote>) => {
    setData(prev => ({
      ...prev,
      chequesAndNotes: (prev.chequesAndNotes || []).map(cn =>
        cn.id === id ? { ...cn, ...updates, updatedAt: new Date().toISOString() } : cn
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const deleteChequeNote = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      chequesAndNotes: (prev.chequesAndNotes || []).filter(cn => cn.id !== id),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  // Savings Goals CRUD operations
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      savingsGoals: [newGoal, ...(prev.savingsGoals || [])],
      lastUpdated: new Date().toISOString(),
    }));
    return newGoal;
  }, []);

  const updateSavingsGoal = useCallback((id: string, updates: Partial<SavingsGoal>) => {
    setData(prev => ({
      ...prev,
      savingsGoals: (prev.savingsGoals || []).map(g =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      savingsGoals: (prev.savingsGoals || []).filter(g => g.id !== id),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  return {
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
    exportData,
    importData,
    setAllData,
    unlockStorage,
    enableEncryption,
    disableEncryption,
    lockStorage,
    isDecrypted: !localStorage.getItem('gelir-gider-password') || !!decryptionKey,
  };
}
