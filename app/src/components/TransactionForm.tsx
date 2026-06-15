import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TransactionType, Category, Transaction } from '@/types';
import { getToday, getCurrencySymbol } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface TransactionFormProps {
  categories: Category[];
  transactions: Transaction[];
  activeCurrency?: string;
  onSubmit: (data: {
    amount: number;
    description: string;
    categoryId: string;
    type: TransactionType;
    date: string;
    paymentMethod?: 'cash' | 'credit_card';
    currency?: string;
  }) => void;
}

// Safely evaluate math expression containing numbers, basic arithmetic operators, dots, and parentheses
function safeEvaluateMath(expression: string): number | null {
  const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
  if (!sanitized.trim()) return null;
  
  try {
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
  } catch (e) {
    // Quietly catch errors for incomplete or invalid expressions
  }
  return null;
}

export function TransactionForm({ categories, transactions, activeCurrency = 'TRY', onSubmit }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'none'>('none');
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState(activeCurrency);

  useEffect(() => {
    setCurrency(activeCurrency);
  }, [activeCurrency]);

  useEffect(() => {
    if (pendingCategoryId) {
      setCategoryId(pendingCategoryId);
      setPendingCategoryId(null);
    }
  }, [type, pendingCategoryId]);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Dynamically compute the user's top 4 frequently used categories as Quick Templates
  const quickTemplates = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    const categoryCounts: Record<string, number> = {};
    const categoryAmounts: Record<string, Record<number, number>> = {};

    transactions.forEach(t => {
      categoryCounts[t.categoryId] = (categoryCounts[t.categoryId] || 0) + 1;
      
      if (!categoryAmounts[t.categoryId]) {
        categoryAmounts[t.categoryId] = {};
      }
      categoryAmounts[t.categoryId][t.amount] = (categoryAmounts[t.categoryId][t.amount] || 0) + 1;
    });

    // Sort category IDs by frequency descending
    const sortedCategoryIds = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    return sortedCategoryIds
      .slice(0, 4)
      .map(catId => {
        const category = categories.find(c => c.id === catId);
        if (!category) return null;

        // Find if there is any amount entered for this category at least 10 times
        const amountsObj = categoryAmounts[catId] || {};
        let prefilledAmount = '';
        
        for (const amtStr of Object.keys(amountsObj)) {
          const amt = parseFloat(amtStr);
          const count = amountsObj[amt];
          if (count >= 10) {
            prefilledAmount = amt.toString();
            break;
          }
        }

        return {
          categoryId: catId,
          name: category.name,
          type: category.type as TransactionType,
          color: category.color,
          amount: prefilledAmount
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  }, [transactions, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = safeEvaluateMath(amount);
    if (parsedAmount === null || isNaN(parsedAmount) || parsedAmount <= 0 || !categoryId) return;

    onSubmit({
      amount: parsedAmount,
      description,
      categoryId,
      type,
      date,
      paymentMethod: (paymentMethod && paymentMethod !== 'none') ? paymentMethod : undefined,
      currency,
    });

    // Reset form
    setAmount('');
    setDescription('');
    setCategoryId('');
    setPaymentMethod('none');
  };

  const handleAmountBlur = () => {
    if (!amount) return;
    const evaluated = safeEvaluateMath(amount);
    if (evaluated !== null) {
      setAmount(evaluated.toString());
    }
  };

  const filteredCategories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Yeni İşlem Ekle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              onClick={() => {
                setType('income');
                setCategoryId('');
              }}
              className={`flex items-center gap-2 ${
                type === 'income' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Gelir
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              onClick={() => {
                setType('expense');
                setCategoryId('');
              }}
              className={`flex items-center gap-2 ${
                type === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Gider
            </Button>
          </div>

          {/* Quick Templates */}
          {quickTemplates.length > 0 && (
            <div className="space-y-1.5 select-none animate-in fade-in duration-200">
              <Label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Hızlı Şablonlar</Label>
              <div className="flex flex-wrap gap-1.5">
                {quickTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setType(template.type);
                      setAmount(template.amount); // Prefill if used 10+ times, else set to empty
                      if (type !== template.type) {
                        setPendingCategoryId(template.categoryId);
                      } else {
                        setCategoryId(template.categoryId);
                      }
                    }}
                    className={`text-[11px] font-semibold py-1 px-2.5 rounded-full border transition-all cursor-pointer hover:-translate-y-0.5 flex items-center gap-1.5 ${
                      template.type === 'income'
                        ? 'border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/10 text-green-700 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-950/30'
                        : 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 text-red-700 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/30'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: template.color }}
                    />
                    {template.name} {template.amount ? `(${template.amount})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="amount">Tutar</Label>
              <div className="relative group">
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00 veya 100+50-20..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={handleAmountBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAmountBlur();
                    }
                  }}
                  className="pl-10 pr-24 text-foreground"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium select-none pointer-events-none">
                  {getCurrencySymbol(currency)}
                </span>
                {/[+\-*/()]/.test(amount) && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded border border-green-200 dark:border-green-800/30 transition-all select-none pointer-events-none">
                    {(() => {
                      const res = safeEvaluateMath(amount);
                      return res !== null ? `= ${res} ${getCurrencySymbol(currency)}` : '?';
                    })()}
                  </span>
                )}
              </div>
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="currency">Döviz</Label>
              <Select value={currency} onValueChange={setCurrency} required>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Döviz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Ödeme Yöntemi</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(val) => setPaymentMethod(val as 'cash' | 'credit_card' | 'none')}
              className="flex flex-row gap-6 items-center pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="pm-none" />
                <Label htmlFor="pm-none" className="cursor-pointer font-normal">Belirtilmemiş</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="pm-cash" />
                <Label htmlFor="pm-cash" className="cursor-pointer font-normal">💵 Nakit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit_card" id="pm-card" />
                <Label htmlFor="pm-card" className="cursor-pointer font-normal">💳 Kredi Kartı</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date with Calendar Picker */}
          <div className="space-y-2">
            <Label>Tarih</Label>
            <CalendarPicker
              date={date}
              onDateChange={setDate}
              label="Tarih seçin"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
            <Textarea
              id="description"
              placeholder="İşlem hakkında not..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-foreground"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!amount || !categoryId}
          >
            <Plus className="w-4 h-4 mr-2" />
            {type === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
