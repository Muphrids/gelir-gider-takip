import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { parseISO, isSameMonth, isSameYear, format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import type { Transaction, Category } from '@/types';
import { Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BudgetProgressProps {
  transactions: Transaction[];
  categories: Category[];
  selectedDate: string;
  projectId?: string | null;
}

export function BudgetProgress({
  transactions,
  categories,
  selectedDate,
  projectId,
}: BudgetProgressProps) {
  const { t, language } = useLanguage();
  const locale = language === 'tr' ? tr : enUS;

  const parsedSelectedDate = useMemo(() => {
    try {
      return parseISO(selectedDate);
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  // Filter expenses for the selected month/year and optional project
  const monthlyExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (projectId && t.projectId !== projectId) return false;
      try {
        const tDate = parseISO(t.date);
        return (
          isSameMonth(tDate, parsedSelectedDate) &&
          isSameYear(tDate, parsedSelectedDate)
        );
      } catch {
        return false;
      }
    });
  }, [transactions, parsedSelectedDate, projectId]);

  // Find categories with a defined budget limit > 0
  const budgetedCategories = useMemo(() => {
    return categories.filter(
      (c) => c.type === 'expense' && c.budgetLimit && c.budgetLimit > 0
    );
  }, [categories]);

  // Calculate stats for each budgeted category
  const budgetStats = useMemo(() => {
    return budgetedCategories
      .map((cat) => {
        const totalSpent = monthlyExpenses
          .filter((t) => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);

        const limit = cat.budgetLimit || 0;
        const percentage = limit > 0 ? (totalSpent / limit) * 100 : 0;

        return {
          category: cat,
          spent: totalSpent,
          limit,
          percentage: Math.min(100, percentage),
          rawPercentage: percentage,
        };
      })
      .sort((a, b) => b.rawPercentage - a.rawPercentage); // Show closest to limit first
  }, [budgetedCategories, monthlyExpenses]);

  const monthName = useMemo(() => {
    return format(parsedSelectedDate, 'MMMM yyyy', { locale });
  }, [parsedSelectedDate, locale]);

  if (budgetStats.length === 0) {
    return null; // Don't show if no budgets are configured
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
          {t('cat.budgetTrackingTitle', {}, 'Aylık Bütçe Takip Limitleri')} ({monthName})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetStats.map(({ category, spent, limit, percentage, rawPercentage }) => {
            // Determine styling based on percentage
            let statusColor = 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-900/30';
            let barColor = '[&>[data-slot=progress-value]]:bg-green-500';
            let Icon = ShieldCheck;

            if (rawPercentage >= 100) {
              statusColor = 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/30';
              barColor = '[&>[data-slot=progress-value]]:bg-red-600';
              Icon = AlertTriangle;
            } else if (rawPercentage >= 80) {
              statusColor = 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-900/30';
              barColor = '[&>[data-slot=progress-value]]:bg-orange-500';
              Icon = AlertTriangle;
            }

            return (
              <div
                key={category.id}
                className="p-3 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50/50 dark:bg-slate-800/40 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-150 truncate">
                      {t(`category.${category.name}`, {}, category.name)}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>%{rawPercentage.toFixed(0)}</span>
                  </div>
                </div>

                <Progress value={percentage} className={`h-2.5 ${barColor}`} />

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('cat.spentLabel', {}, 'Harcama')}: <strong className="text-gray-700 dark:text-gray-200">{formatCurrency(spent)}</strong></span>
                  <span>{t('cat.limitLabel', {}, 'Limit')}: <strong className="text-gray-800 dark:text-gray-300">{formatCurrency(limit)}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
