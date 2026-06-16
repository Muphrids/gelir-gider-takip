import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { PieChart as PieChartIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface OverallChartProps {
  totalIncome: number;
  totalExpense: number;
  title?: string;
}

export function OverallChart({ totalIncome, totalExpense, title = 'Gelir vs Gider' }: OverallChartProps) {
  const { t } = useLanguage();

  const chartData = [
    {
      name: t('general.income', {}, 'Gelir'),
      value: totalIncome,
      color: '#22c55e',
    },
    {
      name: t('general.expense', {}, 'Gider'),
      value: totalExpense,
      color: '#ef4444',
    },
  ];

  const total = totalIncome + totalExpense;
  const balance = totalIncome - totalExpense;

  if (total === 0) {
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
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(item.value)} ({percentage.toFixed(1)}%)
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
                labelLine={true}
                label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                  if (percent < 0.02) return null; // Hide labels for < 2% to avoid overlapping
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 20;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill={name === 'Gelir' ? '#22c55e' : '#ef4444'}
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      className="text-xs font-bold"
                    >
                      {`${name} ${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-medium">{t('summary.totalIncome', {}, 'Toplam Gelir')}</span>
            </div>
            <span className="font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="font-medium">{t('summary.totalExpense', {}, 'Toplam Gider')}</span>
            </div>
            <span className="font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </span>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg ${
            balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'
          }`}>
            <span className="font-medium">{t('summary.netBalance', {}, 'Net Bakiye')}</span>
            <span className={`font-bold ${
              balance >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
