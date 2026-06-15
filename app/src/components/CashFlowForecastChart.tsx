import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import type { RecurringTransaction, Transaction, SavingsGoal } from '@/types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  Plus, 
  Trash2, 
  HelpCircle,
  RefreshCw,
  Target
} from 'lucide-react';
import { parseISO, addMonths } from 'date-fns';

interface CashFlowForecastChartProps {
  recurringTransactions: RecurringTransaction[];
  transactions: Transaction[];
  currentBalance: number;
  selectedDate: string;
  savingsGoals?: SavingsGoal[];
}

interface SimulatedItem {
  id: string;
  monthIndex: number; // 0 to 5
  amount: number;
  type: 'income' | 'expense';
  description: string;
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

export function CashFlowForecastChart({
  recurringTransactions,
  transactions,
  currentBalance,
  selectedDate,
  savingsGoals = [],
}: CashFlowForecastChartProps) {
  // 1. State for Critical Balance limit
  const [criticalBalance, setCriticalBalance] = useState<number>(() => {
    const saved = localStorage.getItem('gelir-gider-critical-balance');
    return saved ? parseFloat(saved) : 0;
  });

  // Save to localStorage when it changes
  const handleCriticalBalanceChange = (val: number) => {
    setCriticalBalance(val);
    localStorage.setItem('gelir-gider-critical-balance', val.toString());
  };

  // 2. State for Scenario Simulation (Ya Şöyle Olursa?)
  const [simulatedItems, setSimulatedItems] = useState<SimulatedItem[]>([]);
  const showSimulatedCurve = simulatedItems.length > 0;
  const [simMonth, setSimMonth] = useState<number>(0);
  const [simAmount, setSimAmount] = useState<string>('');
  const [simType, setSimType] = useState<'income' | 'expense'>('income');
  const [simDesc, setSimDesc] = useState<string>('');

  // 3. State for Series Visibility Toggles
  const [visibleSeries, setVisibleSeries] = useState({
    balance: true,
    simulated: true,
    income: false,
    expense: false,
  });
  const [isSimulationExpanded, setIsSimulationExpanded] = useState(false);

  // Calculate target dates for the dropdown menu in simulation form
  const simulationMonths = useMemo(() => {
    let startDate: Date;
    try {
      startDate = parseISO(selectedDate);
    } catch {
      startDate = new Date();
    }
    return Array.from({ length: 6 }).map((_, i) => {
      const d = addMonths(startDate, i);
      return {
        index: i,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      };
    });
  }, [selectedDate]);

  // Handle add simulated transaction
  const handleAddSimulatedItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(simAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newItem: SimulatedItem = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      monthIndex: simMonth,
      amount: amt,
      type: simType,
      description: simDesc.trim() || (simType === 'income' ? 'Simüle Gelir' : 'Simüle Gider'),
    };

    setSimulatedItems((prev) => [...prev, newItem]);
    setSimAmount('');
    setSimDesc('');
  };

  // Delete simulated item
  const handleDeleteSimulatedItem = (id: string) => {
    setSimulatedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all simulated items
  const handleClearSimulation = () => {
    setSimulatedItems([]);
  };

  // Single useMemo to process all forecast data (Optimized O(N) calculations)
  const forecastResult = useMemo(() => {
    let startDate: Date;
    try {
      startDate = parseISO(selectedDate);
    } catch {
      startDate = new Date();
    }

    // --- HISTORICAL VARIABLE TREND ANALYSIS ---
    // Create Set of recurring keys to identify and filter them out to prevent double-counting
    const recurringKeys = new Set(
      recurringTransactions.map(
        (r) => `${r.description.trim().toLowerCase()}_${r.amount}_${r.type}`
      )
    );

    let earliestDate = new Date();
    let totalVariableIncome = 0;
    let totalVariableExpense = 0;
    let hasTransactions = false;

    // Single pass over transactions to gather historical data
    transactions.forEach((t) => {
      hasTransactions = true;
      const tDate = new Date(t.date);
      if (tDate < earliestDate) {
        earliestDate = tDate;
      }

      // Check if it's recurring
      const key = `${t.description.trim().toLowerCase()}_${t.amount}_${t.type}`;
      if (!recurringKeys.has(key)) {
        if (t.type === 'income') {
          totalVariableIncome += t.amount;
        } else {
          totalVariableExpense += t.amount;
        }
      }
    });

    const today = new Date();
    const startYear = earliestDate.getFullYear();
    const startMonth = earliestDate.getMonth();
    const endYear = today.getFullYear();
    const endMonth = today.getMonth();

    // Months elapsed count
    const rawMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    const monthsCount = hasTransactions ? Math.max(1, rawMonths) : 1;

    const avgVariableIncome = totalVariableIncome / monthsCount;
    const avgVariableExpense = totalVariableExpense / monthsCount;

    // --- FORECASTING FUTURE 6 MONTHS ---
    const dataPoints = [];
    let runningBalance = currentBalance;
    let runningSimulatedBalance = currentBalance;

    let normalDips = false;
    let simulatedDips = false;
    const dippedMonthsNormal: string[] = [];
    const dippedMonthsSimulated: string[] = [];

    for (let i = 0; i < 6; i++) {
      const targetDate = addMonths(startDate, i);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1; // 1-indexed
      const monthName = MONTH_NAMES[targetMonth - 1];
      const label = `${monthName} ${targetYear.toString().slice(-2)}`;

      // 1. Calculate Recurring configurations
      let projectedIncome = 0;
      let projectedExpense = 0;

      recurringTransactions.forEach((rec) => {
        if (!rec.isActive) return;

        const recStart = new Date(rec.startDate);
        const recEnd = rec.endDate ? new Date(rec.endDate) : null;

        const targetStartCompare = new Date(targetYear, targetMonth - 1, 28);
        const targetEndCompare = new Date(targetYear, targetMonth - 1, 1);

        const isAfterStart = targetStartCompare >= new Date(recStart.getFullYear(), recStart.getMonth(), 1);
        const isBeforeEnd = !recEnd || targetEndCompare <= new Date(recEnd.getFullYear(), recEnd.getMonth(), 28);

        if (isAfterStart && isBeforeEnd) {
          if (rec.type === 'income') {
            projectedIncome += rec.amount;
          } else {
            projectedExpense += rec.amount;
          }
        }
      });

      // 2. Add the average historical variable trend
      projectedIncome += avgVariableIncome;
      projectedExpense += avgVariableExpense;

      const netChange = projectedIncome - projectedExpense;
      runningBalance += netChange;

      // 3. Process simulated adjustments
      let simulatedIncomeChange = 0;
      let simulatedExpenseChange = 0;

      simulatedItems.forEach((item) => {
        if (item.monthIndex === i) {
          if (item.type === 'income') {
            simulatedIncomeChange += item.amount;
          } else {
            simulatedExpenseChange += item.amount;
          }
        }
      });

      const simulatedNetChange = netChange + (simulatedIncomeChange - simulatedExpenseChange);
      runningSimulatedBalance += simulatedNetChange;

      if (runningBalance < criticalBalance) {
        normalDips = true;
        dippedMonthsNormal.push(label);
      }
      if (runningSimulatedBalance < criticalBalance) {
        simulatedDips = true;
        dippedMonthsSimulated.push(label);
      }

      dataPoints.push({
        name: label,
        'Tahmini Bakiye': Math.round(runningBalance * 100) / 100,
        'Simüle Edilen Bakiye': Math.round(runningSimulatedBalance * 100) / 100,
        'Beklenen Gelir': Math.round(projectedIncome * 100) / 100,
        'Beklenen Gider': Math.round(projectedExpense * 100) / 100,
        simulatedIncome: Math.round((projectedIncome + simulatedIncomeChange) * 100) / 100,
        simulatedExpense: Math.round((projectedExpense + simulatedExpenseChange) * 100) / 100,
      });
    }

    return {
      dataPoints,
      avgVariableIncome: Math.round(avgVariableIncome * 100) / 100,
      avgVariableExpense: Math.round(avgVariableExpense * 100) / 100,
      monthsCount,
      normalDips,
      simulatedDips,
      dippedMonthsNormal,
      dippedMonthsSimulated,
    };
  }, [transactions, recurringTransactions, currentBalance, selectedDate, simulatedItems, criticalBalance]);

  // Process goal statuses and match them with projection months
  const goalsAnalysis = useMemo(() => {
    let startDate: Date;
    try {
      startDate = parseISO(selectedDate);
    } catch {
      startDate = new Date();
    }

    return (savingsGoals || [])
      .filter(g => g.currentAmount < g.targetAmount) // only active/unachieved goals
      .map(goal => {
        const remaining = goal.targetAmount - goal.currentAmount;
        let goalDate: Date;
        try {
          goalDate = parseISO(goal.targetDate);
        } catch {
          goalDate = new Date();
        }

        // Calculate months difference between startDate and goalDate
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();
        const goalYear = goalDate.getFullYear();
        const goalMonth = goalDate.getMonth();
        
        const monthsDiff = (goalYear - startYear) * 12 + (goalMonth - startMonth);
        
        let status: 'feasible' | 'at_risk' | 'long_term' | 'overdue' = 'long_term';
        let projectedBalanceAtGoal = 0;
        let targetMonthLabel = '';

        if (monthsDiff < 0) {
          status = 'overdue';
        } else if (monthsDiff >= 0 && monthsDiff < 6) {
          // It falls within the 6-month projection window!
          const dataPoint = forecastResult.dataPoints[monthsDiff];
          if (dataPoint) {
            projectedBalanceAtGoal = showSimulatedCurve 
              ? dataPoint['Simüle Edilen Bakiye'] 
              : dataPoint['Tahmini Bakiye'];
            targetMonthLabel = dataPoint.name;
            status = projectedBalanceAtGoal >= remaining ? 'feasible' : 'at_risk';
          }
        } else {
          status = 'long_term';
        }

        // Calculate suggested monthly contribution if at risk
        let suggestedMonthly = 0;
        if (status === 'at_risk') {
          const monthsLeft = Math.max(1, monthsDiff);
          const deficit = remaining - projectedBalanceAtGoal;
          suggestedMonthly = Math.ceil((deficit / monthsLeft) * 100) / 100;
        }

        return {
          ...goal,
          remaining,
          monthsDiff,
          status,
          projectedBalanceAtGoal,
          targetMonthLabel,
          suggestedMonthly,
        };
      });
  }, [savingsGoals, forecastResult.dataPoints, selectedDate, showSimulatedCurve]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-4 border dark:border-white/10 rounded-xl shadow-xl space-y-2 text-xs">
          <p className="font-bold text-gray-900 dark:text-white mb-2 pb-1 border-b dark:border-white/5 flex items-center justify-between">
            <span>{label} (Öngörü)</span>
          </p>
          <div className="space-y-1.5 min-w-[180px]">
            {payload.find((p: any) => p.dataKey === 'Beklenen Gelir') && (
              <p className="text-green-600 dark:text-green-400 flex items-center justify-between gap-4">
                <span>Beklenen Gelir:</span>
                <span className="font-semibold">{formatCurrency(payload.find((p: any) => p.dataKey === 'Beklenen Gelir').value)}</span>
              </p>
            )}
            {payload.find((p: any) => p.dataKey === 'Beklenen Gider') && (
              <p className="text-red-600 dark:text-red-400 flex items-center justify-between gap-4">
                <span>Beklenen Gider:</span>
                <span className="font-semibold">{formatCurrency(payload.find((p: any) => p.dataKey === 'Beklenen Gider').value)}</span>
              </p>
            )}
            {payload.find((p: any) => p.dataKey === 'Tahmini Bakiye') && (
              <p className="text-blue-600 dark:text-blue-400 flex items-center justify-between gap-4 border-t dark:border-white/5 pt-1.5 font-semibold">
                <span>Tahmini Bakiye:</span>
                <span>{formatCurrency(payload.find((p: any) => p.dataKey === 'Tahmini Bakiye').value)}</span>
              </p>
            )}
            {simulatedItems.length > 0 && payload.find((p: any) => p.dataKey === 'Simüle Edilen Bakiye') && (
              <p className="text-purple-600 dark:text-purple-400 flex items-center justify-between gap-4 border-t dark:border-white/5 pt-1 font-semibold">
                <span>Simüle Bakiye:</span>
                <span>{formatCurrency(payload.find((p: any) => p.dataKey === 'Simüle Edilen Bakiye').value)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <Card className="w-full col-span-full dark:bg-slate-900 dark:border-white/10 transition-all duration-200">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b dark:border-white/5">
        <div>
          <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Gelişmiş Nakit Akışı Öngörüsü
          </CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sabit planlamalar ve geçmiş değişken harcama alışkanlıklarına göre 6 aylık akış tahmini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-200/50 dark:border-blue-900/30 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Tüm Geçmiş Trend Analizi Aktif
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* TOP PANEL: Controls & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-2xl border dark:border-white/5">
          {/* Critical Balance Slider */}
          <div className="col-span-1 lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="critical-balance-input" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                Kritik Bakiye Sınırı
                <span title="Bakiyeniz bu limitin altına indiğinde grafik ve uyarı afişi sizi uyarır.">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                </span>
              </label>
              <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-200/50 dark:border-red-900/20">
                {formatCurrency(criticalBalance)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="critical-balance-slider"
                type="range"
                min="0"
                max={Math.max(100000, currentBalance * 1.5)}
                step="1000"
                value={criticalBalance}
                onChange={(e) => handleCriticalBalanceChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <input
                id="critical-balance-input"
                type="number"
                value={criticalBalance}
                onChange={(e) => handleCriticalBalanceChange(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2.5 py-1 text-xs font-medium text-right rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="col-span-1 lg:col-span-7 space-y-3">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Grafikte Gösterilecek Veriler</span>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-gray-600 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={visibleSeries.balance}
                  onChange={(e) => setVisibleSeries(prev => ({ ...prev, balance: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Tahmini Bakiye
                </span>
              </label>

              {showSimulatedCurve && (
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-gray-600 dark:text-gray-300 select-none animate-in fade-in zoom-in-95 duration-200">
                  <input
                    type="checkbox"
                    checked={visibleSeries.simulated}
                    onChange={(e) => setVisibleSeries(prev => ({ ...prev, simulated: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-1 border-t-2 border-dashed border-purple-500"></span>
                    Simüle Edilen Bakiye
                  </span>
                </label>
              )}

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-gray-600 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={visibleSeries.income}
                  onChange={(e) => setVisibleSeries(prev => ({ ...prev, income: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-slate-700 text-green-600 focus:ring-green-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Beklenen Gelir
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-gray-600 dark:text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={visibleSeries.expense}
                  onChange={(e) => setVisibleSeries(prev => ({ ...prev, expense: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-slate-700 text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Beklenen Gider
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* CRITICAL LIMIT WARNING BANNERS */}
        {criticalBalance > 0 && (
          <div className="space-y-2 animate-in slide-in-from-top duration-300">
            {forecastResult.normalDips && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div className="text-xs">
                  <span className="font-bold">Bakiye Düşüş Uyarısı:</span> Cari tahmin gidişatınızda bakiyeniz,{' '}
                  <span className="font-semibold">{forecastResult.dippedMonthsNormal.join(', ')}</span> aylarında belirlediğiniz kritik limit olan{' '}
                  <span className="font-bold">{formatCurrency(criticalBalance)}</span> altına düşüyor! Finansal tedbir almayı düşünebilirsiniz.
                </div>
              </div>
            )}
            
            {showSimulatedCurve && forecastResult.simulatedDips && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/30 text-purple-800 dark:text-purple-300 animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-purple-600" />
                <div className="text-xs">
                  <span className="font-bold">Simüle Bakiye Düşüş Uyarısı:</span> Eklediğiniz simülasyon senaryosuna göre bakiyeniz,{' '}
                  <span className="font-semibold">{forecastResult.dippedMonthsSimulated.join(', ')}</span> aylarında kritik sınırın altına geriliyor.
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHART DISPLAY */}
        <div className="h-80 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecastResult.dataPoints}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-slate-800" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${getCurrencySymbol()}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, display: 'none' }} />

              {/* Conditional Reference Line for Critical Limit */}
              {criticalBalance > 0 && (
                <ReferenceLine
                  y={criticalBalance}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}

              {/* Reference Lines for Savings Goals */}
              {goalsAnalysis
                .filter(g => g.status === 'feasible' || g.status === 'at_risk')
                .map(g => (
                  <ReferenceLine
                    key={g.id}
                    x={g.targetMonthLabel}
                    stroke={g.status === 'feasible' ? '#10b981' : '#f59e0b'}
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: `🎯 ${g.name} (${formatCurrency(g.remaining)})`,
                      position: 'top',
                      fill: g.status === 'feasible' ? '#10b981' : '#f59e0b',
                      fontSize: 9,
                      fontWeight: 'bold',
                    }}
                  />
                ))}

              {/* Standard Balance Curve (Solid Area) */}
              {visibleSeries.balance && (
                <Area
                  type="monotone"
                  dataKey="Tahmini Bakiye"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                  strokeWidth={2.5}
                  animationDuration={300}
                />
              )}

              {/* Simulated Balance Curve (Dashed line) */}
              {showSimulatedCurve && visibleSeries.simulated && (
                <Line
                  type="monotone"
                  dataKey="Simüle Edilen Bakiye"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 2, fill: '#fff' }}
                  animationDuration={300}
                />
              )}

              {/* Projected Income (Optional Line) */}
              {visibleSeries.income && (
                <Line
                  type="monotone"
                  dataKey="Beklenen Gelir"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  animationDuration={300}
                />
              )}

              {/* Projected Expense (Optional Line) */}
              {visibleSeries.expense && (
                <Line
                  type="monotone"
                  dataKey="Beklenen Gider"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  animationDuration={300}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* BOTTOM METRICS: Info on Historical Trend Calculation */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/40 dark:bg-slate-800/20 border border-blue-150/40 dark:border-white/5 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-gray-800 dark:text-gray-200">Değişken Gider & Gelir Analizi Nasıl Hesaplanır?</span>
              <p className="text-gray-500 dark:text-gray-400">
                Girdiğiniz tüm geçmiş ({forecastResult.monthsCount} ay) veriler taranarak, her ay yinelenen sabit işlemleriniz ayıklandıktan sonra kalan değişken gelir/giderlerinizin aylık ortalaması alınır ve tahmin modeline dahil edilir.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 shrink-0 border-t md:border-t-0 md:border-l border-gray-200 dark:border-white/10 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Ort. Değişken Gelir</span>
              <span className="font-bold text-green-600">+{formatCurrency(forecastResult.avgVariableIncome)}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Ort. Değişken Gider</span>
              <span className="font-bold text-red-500">-{formatCurrency(forecastResult.avgVariableExpense)}</span>
            </div>
          </div>
        </div>

        {/* PANEL: "Ya Şöyle Olursa?" Scenario Simulation */}
        <div className="border-t dark:border-white/5 pt-6 space-y-4">
          <div 
            className="flex items-center justify-between cursor-pointer md:cursor-default"
            onClick={() => { if (window.innerWidth < 768) setIsSimulationExpanded(!isSimulationExpanded); }}
          >
            <h4 className="text-sm font-bold flex items-center gap-1.5 text-gray-800 dark:text-white">
              <HelpCircle className="w-4.5 h-4.5 text-purple-600" />
              "Ya Şöyle Olursa?" Senaryo Simülasyonu
            </h4>
            <div className="flex items-center gap-2">
              <span className="md:hidden text-xs text-purple-500 font-semibold">{isSimulationExpanded ? 'Gizle' : 'Göster'}</span>
              {simulatedItems.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClearSimulation(); }}
                  className="text-[11px] font-semibold text-purple-600 hover:text-purple-750 flex items-center gap-1 bg-purple-50 dark:bg-purple-950/20 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-900/30 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Senaryoyu Sıfırla
                </button>
              )}
            </div>
          </div>
          
          <div className={isSimulationExpanded ? 'block space-y-4' : 'hidden md:block md:space-y-4'}>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gelecek 6 aya ait tahmini gelir veya gider senaryoları ekleyerek bakiyenizin nasıl etkileneceğini anlık olarak grafikte gözlemleyin. Eklediğiniz işlemler geçicidir ve veri tabanına kaydedilmez.
            </p>

            <form onSubmit={handleAddSimulatedItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end bg-purple-50/10 dark:bg-purple-950/5 p-3 sm:p-4 rounded-xl border border-purple-200/30 dark:border-purple-900/10">
              {/* Month Dropdown */}
              <div className="sm:col-span-3 space-y-1">
                <label htmlFor="sim-month" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hedef Ay</label>
                <select
                  id="sim-month"
                  value={simMonth}
                  onChange={(e) => setSimMonth(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-semibold px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {simulationMonths.map((m) => (
                    <option key={m.index} value={m.index} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Selector */}
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="sim-type" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tür</label>
                <select
                  id="sim-type"
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as 'income' | 'expense')}
                  className="w-full text-xs font-semibold px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="income" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Gelir (+)</option>
                  <option value="expense" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Gider (-)</option>
                </select>
              </div>

              {/* Amount input */}
              <div className="sm:col-span-3 space-y-1">
                <label htmlFor="sim-amount" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tutar ({getCurrencySymbol()})</label>
                <input
                  id="sim-amount"
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder="Örn: 25000"
                  className="w-full text-xs font-semibold px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Description input */}
              <div className="sm:col-span-3 space-y-1">
                <label htmlFor="sim-desc" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Açıklama</label>
                <input
                  id="sim-desc"
                  type="text"
                  value={simDesc}
                  onChange={(e) => setSimDesc(e.target.value)}
                  placeholder="Örn: Yeni sözleşme, prim"
                  className="w-full text-xs font-semibold px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Submit button */}
              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center p-1.5 sm:p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow hover:shadow-md cursor-pointer h-8 sm:h-9"
                  title="İşlem Ekle"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </form>

            {/* List of Simulated Items */}
            {simulatedItems.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-200">
                {simulatedItems.map((item) => {
                  const targetMonthLabel = simulationMonths.find((m) => m.index === item.monthIndex)?.label || '';
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] ${
                        item.type === 'income'
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      <span>
                        {targetMonthLabel.split(' ')[0]}: {item.description} ({item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSimulatedItem(item.id)}
                        className="rounded-full p-0.5 hover:bg-gray-250 dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 shrink-0 transition-colors cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 border border-dashed dark:border-white/5 rounded-xl">
                Henüz simüle edilmiş işlem bulunmuyor. Yukarıdaki formdan ekleyebilirsiniz.
              </div>
            )}
          </div>
        </div>

        {/* PANEL: Savings Goals Feasibility Analysis */}
        {goalsAnalysis.length > 0 && (
          <div className="border-t dark:border-white/5 pt-6 space-y-4 animate-in fade-in duration-200">
            <h4 className="text-sm font-bold flex items-center gap-1.5 text-gray-800 dark:text-white">
              <Target className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              Tasarruf Hedefleri & Nakit Akışı Uyumluluk Analizi
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gelecek 6 aylık tahmini nakit akışınıza göre, aktif hedeflerinize vade tarihlerinde ulaşıp ulaşamayacağınız analiz edilmiştir.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goalsAnalysis.map(goal => (
                <div 
                  key={goal.id} 
                  className={`p-4 rounded-xl border text-xs flex flex-col justify-between gap-3 shadow-sm ${
                    goal.status === 'feasible' 
                      ? 'bg-green-50/20 dark:bg-green-950/10 border-green-200 dark:border-green-900/30' 
                      : goal.status === 'at_risk'
                      ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30'
                      : goal.status === 'overdue'
                      ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200 dark:border-red-900/30'
                      : 'bg-slate-50/40 dark:bg-slate-800/10 border-slate-200 dark:border-white/5'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 dark:text-white text-sm">🎯 {goal.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        goal.status === 'feasible' 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
                          : goal.status === 'at_risk'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : goal.status === 'overdue'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20'
                      }`}>
                        {goal.status === 'feasible' && 'Ulaşılabilir'}
                        {goal.status === 'at_risk' && 'Risk Altında'}
                        {goal.status === 'overdue' && 'Süresi Geçmiş'}
                        {goal.status === 'long_term' && 'Uzun Vadeli'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">Kalan Hedef Tutar:</span>
                        <span className="font-bold text-gray-800 dark:text-slate-200">{formatCurrency(goal.remaining)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">Vade Tarihi:</span>
                        <span className="font-bold text-gray-800 dark:text-slate-200">{goal.targetMonthLabel || goal.targetDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[11px] pt-2 border-t border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300">
                    {goal.status === 'feasible' && (
                      <p className="flex items-start gap-1.5">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>
                          Vade ayında ({goal.targetMonthLabel}) öngörülen kasanız <strong>{formatCurrency(goal.projectedBalanceAtGoal)}</strong>, kalan hedefinizden fazla. Bu hedefi rahatlıkla karşılayabilirsiniz.
                        </span>
                      </p>
                    )}
                    {goal.status === 'at_risk' && (
                      <div className="space-y-1.5">
                        <p className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-pulse" />
                          <span>
                            Vade ayında ({goal.targetMonthLabel}) kasanızın <strong>{formatCurrency(goal.projectedBalanceAtGoal)}</strong> olması öngörülüyor. Hedefi tamamlamak için <strong>{formatCurrency(goal.remaining - goal.projectedBalanceAtGoal)}</strong> açığınız kalabilir.
                          </span>
                        </p>
                        <p className="bg-amber-500/5 p-2 rounded border border-amber-500/10 text-gray-700 dark:text-gray-300">
                          💡 <strong>Katkı Önerisi:</strong> Kalan {Math.max(1, goal.monthsDiff)} ay boyunca her ay ortalama en az <strong>{formatCurrency(goal.suggestedMonthly)}</strong> ek tasarruf yapmanız veya simülasyona ek gelir senaryosu eklemeniz önerilir.
                        </p>
                      </div>
                    )}
                    {goal.status === 'overdue' && (
                      <p className="flex items-start gap-1.5 text-red-500">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Hedefinizin vadesi geçmiş durumda. Hedef tarihini güncelleyerek yeniden analiz alabilirsiniz.</span>
                      </p>
                    )}
                    {goal.status === 'long_term' && (
                      <p className="flex items-start gap-1.5 text-gray-500">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Hedef vadeniz 6 aydan uzun olduğu için nakit akışı grafiğinde doğrudan analiz edilmemiştir.</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
