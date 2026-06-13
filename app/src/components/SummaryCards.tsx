import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from 'lucide-react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  onIncomeClick?: () => void;
  onExpenseClick?: () => void;
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  transactionCount,
  onIncomeClick,
  onExpenseClick,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Total Income */}
      <Card 
        className={`bg-gradient-to-br from-green-50 to-green-100 border-green-200 ${onIncomeClick ? 'cursor-pointer hover:shadow-md hover:border-green-300 transition-all duration-200' : ''}`}
        onClick={onIncomeClick}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-green-700 flex items-center gap-1.5 sm:gap-2 select-none">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className={onIncomeClick ? 'hover:underline' : ''}>Toplam Gelir</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-700 select-all truncate">
            {formatCurrency(totalIncome)}
          </div>
        </CardContent>
      </Card>

      {/* Total Expense */}
      <Card 
        className={`bg-gradient-to-br from-red-50 to-red-100 border-red-200 ${onExpenseClick ? 'cursor-pointer hover:shadow-md hover:border-red-300 transition-all duration-200' : ''}`}
        onClick={onExpenseClick}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-red-700 flex items-center gap-1.5 sm:gap-2 select-none">
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className={onExpenseClick ? 'hover:underline' : ''}>Toplam Gider</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-700 select-all truncate">
            {formatCurrency(totalExpense)}
          </div>
        </CardContent>
      </Card>

      {/* Balance */}
      <Card className={`bg-gradient-to-br ${
        balance >= 0 
          ? 'from-blue-50 to-blue-100 border-blue-200' 
          : 'from-orange-50 to-orange-100 border-orange-200'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 ${
            balance >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Bakiye
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-lg sm:text-xl md:text-2xl font-bold truncate ${
            balance >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            {formatCurrency(balance)}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Count */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-purple-700 flex items-center gap-1.5 sm:gap-2">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            İşlem Sayısı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-700 truncate">
            {transactionCount}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
