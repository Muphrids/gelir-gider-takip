import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, isSameMonth, isSameYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Transaction, Category, ViewMode, DateRange, MonthlySummary, CategorySummary } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const currency = localStorage.getItem('gelir-gider-currency') || 'TRY';
  let locale = 'tr-TR';
  if (currency === 'USD') locale = 'en-US';
  else if (currency === 'EUR') locale = 'de-DE';
  else if (currency === 'GBP') locale = 'en-GB';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getCurrencySymbol(): string {
  const currency = localStorage.getItem('gelir-gider-currency') || 'TRY';
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'TRY':
    default:
      return '₺';
  }
}

export function formatDate(dateString: string, formatStr: string = 'dd MMMM yyyy'): string {
  return format(parseISO(dateString), formatStr, { locale: tr });
}

export function formatShortDate(dateString: string): string {
  return format(parseISO(dateString), 'dd.MM.yyyy');
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getCurrentYear(): string {
  return format(new Date(), 'yyyy');
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  dateRange: DateRange
): Transaction[] {
  return transactions.filter(t => 
    isWithinInterval(parseISO(t.date), {
      start: parseISO(dateRange.startDate),
      end: parseISO(dateRange.endDate),
    })
  );
}

export function filterTransactionsByViewMode(
  transactions: Transaction[],
  viewMode: ViewMode,
  selectedDate: string
): Transaction[] {
  const date = parseISO(selectedDate);

  switch (viewMode) {
    case 'daily':
      return transactions.filter(t => t.date === selectedDate);
    
    case 'monthly':
      return transactions.filter(t => {
        const tDate = parseISO(t.date);
        return isSameMonth(tDate, date) && isSameYear(tDate, date);
      });
    
    case 'yearly':
      return transactions.filter(t => {
        const tDate = parseISO(t.date);
        return isSameYear(tDate, date);
      });
    
    default:
      return transactions;
  }
}

export function calculateTotals(transactions: Transaction[]): {
  totalIncome: number;
  totalExpense: number;
  balance: number;
} {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export function calculateCategorySummary(
  transactions: Transaction[],
  categories: Category[],
  type: 'income' | 'expense'
): CategorySummary[] {
  const filteredTransactions = transactions.filter(t => t.type === type);
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const categoryMap = new Map<string, { amount: number; count: number }>();

  filteredTransactions.forEach(t => {
    const current = categoryMap.get(t.categoryId) || { amount: 0, count: 0 };
    categoryMap.set(t.categoryId, {
      amount: current.amount + t.amount,
      count: current.count + 1,
    });
  });

  const summaries: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([categoryId, data]) => {
      const category = categories.find(c => c.id === categoryId);
      return {
        categoryId,
        categoryName: category?.name || 'Bilinmeyen Kategori',
        categoryColor: category?.color || '#6b7280',
        totalAmount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        transactionCount: data.count,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return summaries;
}

export function generateMonthlySummary(
  transactions: Transaction[],
  year: number
): MonthlySummary[] {
  const months: MonthlySummary[] = [];

  for (let month = 0; month < 12; month++) {
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(monthStart);

    const monthTransactions = transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start: monthStart, end: monthEnd });
    });

    const { totalIncome, totalExpense, balance } = calculateTotals(monthTransactions);

    months.push({
      year,
      month: month + 1,
      totalIncome,
      totalExpense,
      balance,
      transactionCount: monthTransactions.length,
    });
  }

  return months;
}

export function getAvailableYears(transactions: Transaction[]): number[] {
  const years = new Set<number>();
  transactions.forEach(t => {
    const year = parseISO(t.date).getFullYear();
    years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function getAvailableMonths(transactions: Transaction[], year: number): number[] {
  const months = new Set<number>();
  transactions.forEach(t => {
    const date = parseISO(t.date);
    if (date.getFullYear() === year) {
      months.add(date.getMonth() + 1);
    }
  });
  return Array.from(months).sort((a, b) => a - b);
}

export function groupTransactionsByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();
  
  transactions.forEach(t => {
    const current = grouped.get(t.date) || [];
    current.push(t);
    grouped.set(t.date, current);
  });

  // Sort dates in descending order
  return new Map([...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
