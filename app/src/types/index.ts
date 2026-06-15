export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
  budgetLimit?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  type: TransactionType;
  date: string; // ISO format: YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  projectId?: string; // Optional project/company association
  paymentMethod?: 'cash' | 'credit_card';
  currency?: string; // e.g. 'TRY', 'USD', 'EUR'
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  type: TransactionType;
  startDate: string;
  endDate?: string; // Optional end date
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  paymentMethod?: 'cash' | 'credit_card';
  currency?: string; // e.g. 'TRY', 'USD', 'EUR'
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export type ViewMode = 'daily' | 'monthly' | 'yearly';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export interface YearlySummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthlyData: MonthlySummary[];
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  transactions: Transaction[];
  categories: Category[];
  recurringTransactions: RecurringTransaction[];
  projects: Project[];
  chequesAndNotes?: ChequeNote[]; // Support for Cheques and Notes
  savingsGoals?: SavingsGoal[]; // Savings goals
  lastSync?: string;
  userId?: string; // For user-specific data
  lastUpdated?: string; // Client timestamp for last local mutation
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; // Hashed password for local auth
  isPasswordProtected: boolean;
}

export interface ChequeNote {
  id: string;
  type: 'cheque' | 'promissory_note'; // Çek veya Senet
  direction: 'receivable' | 'payable'; // Alacak veya Borç
  amount: number; // Tutar
  dueDate: string; // Vade Tarihi (YYYY-MM-DD)
  issueDate: string; // Keşide/Düzenleme Tarihi (YYYY-MM-DD)
  serialNumber: string; // Seri Numarası
  debtor: string; // Borçlu / Ödeyecek Kişi
  bank?: string; // Banka / Şube (Opsiyonel)
  status: 'pending' | 'paid' | 'cancelled' | 'returned'; // Beklemede, Tahsil Edildi/Ödendi, İptal, Karşılıksız/İade
  projectId?: string; // İlişkili Şirket/Proje (Opsiyonel)
  description?: string; // Açıklama (Opsiyonel)
  createdAt: string;
  updatedAt: string;
}
