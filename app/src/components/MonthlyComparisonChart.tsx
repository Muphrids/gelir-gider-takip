import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { generateMonthlySummary, formatCurrency, getCurrencySymbol } from '@/lib/utils';
import type { Transaction } from '@/types';
import { BarChart3 } from 'lucide-react';
import { parseISO } from 'date-fns';

interface MonthlyComparisonChartProps {
  transactions: Transaction[];
  selectedDate: string;
  projectId?: string | null;
}

const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export function MonthlyComparisonChart({
  transactions,
  selectedDate,
  projectId,
}: MonthlyComparisonChartProps) {
  // Extract year from selectedDate
  const year = useMemo(() => {
    try {
      return parseISO(selectedDate).getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  }, [selectedDate]);

  // Filter transactions by project if a project is selected
  const projectTransactions = useMemo(() => {
    if (!projectId) return transactions;
    return transactions.filter((t) => t.projectId === projectId);
  }, [transactions, projectId]);

  // Generate monthly summary data for the selected year
  const chartData = useMemo(() => {
    const monthlySummary = generateMonthlySummary(projectTransactions, year);
    return monthlySummary.map((summary) => ({
      name: MONTH_NAMES[summary.month - 1],
      Gelir: summary.totalIncome,
      Gider: summary.totalExpense,
      Bakiye: summary.balance,
    }));
  }, [projectTransactions, year]);

  const hasData = useMemo(() => {
    return chartData.some((d) => d.Gelir > 0 || d.Gider > 0);
  }, [chartData]);

  // Totals for the selected year
  const yearlyTotals = useMemo(() => {
    return chartData.reduce(
      (acc, cur) => {
        acc.income += cur.Gelir;
        acc.expense += cur.Gider;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [chartData]);

  const yearlyBalance = yearlyTotals.income - yearlyTotals.expense;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{label} ({year})</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600 flex items-center justify-between gap-8">
              <span>Gelir:</span>
              <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-red-600 flex items-center justify-between gap-8">
              <span>Gider:</span>
              <span className="font-semibold">{formatCurrency(payload[1].value)}</span>
            </p>
            <p className="text-blue-600 flex items-center justify-between gap-8 border-t pt-1 mt-1">
              <span>Bakiye:</span>
              <span className="font-semibold">
                {formatCurrency(payload[0].value - payload[1].value)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full col-span-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Aylık Karşılaştırmalı Trend ({year})
        </CardTitle>
        {hasData && (
          <div className="flex items-center gap-3 text-xs font-medium bg-gray-50 dark:bg-slate-800/40 p-2 rounded-lg border border-gray-200 dark:border-white/10">
            <span className="text-green-600 dark:text-green-400">
              Yıllık Gelir: {formatCurrency(yearlyTotals.income)}
            </span>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <span className="text-red-600 dark:text-red-400">
              Yıllık Gider: {formatCurrency(yearlyTotals.expense)}
            </span>
            <span className="text-gray-300 dark:text-slate-700">|</span>
            <span className={yearlyBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
              Net: {formatCurrency(yearlyBalance)}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{year} yılı için henüz gelir veya gider verisi bulunmuyor.</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${getCurrencySymbol()}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.4 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
