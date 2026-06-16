import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CategoryChartProps {
  data: CategorySummary[];
  title?: string;
  type: 'income' | 'expense';
}

export function CategoryChart({ data, title, type }: CategoryChartProps) {
  const { t } = useLanguage();

  const chartData = data.map(item => ({
    name: t(`category.${item.categoryName}`, {}, item.categoryName),
    value: item.totalAmount,
    color: item.categoryColor,
    percentage: item.percentage,
  }));

  const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0);

  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <PieChartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('chart.noData', {}, 'Henüz veri bulunmuyor.')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />

            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="mt-4 space-y-2">
          {data.map((item) => (
            <div
              key={item.categoryId}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-transparent dark:border-white/5"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.categoryColor }}
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t(`category.${item.categoryName}`, {}, item.categoryName)}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.totalAmount)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">{t('general.total', {}, 'Toplam')}</span>
            <span className={`font-bold ${
              type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
