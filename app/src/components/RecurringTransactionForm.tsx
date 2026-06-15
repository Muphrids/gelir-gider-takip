import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { TransactionType, Category } from '@/types';
import { getToday, getCurrencySymbol } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, Repeat } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/contexts/LanguageContext';

interface RecurringTransactionFormProps {
  categories: Category[];
  activeCurrency?: string;
  onSubmit: (data: {
    amount: number;
    description: string;
    categoryId: string;
    type: TransactionType;
    startDate: string;
    endDate?: string;
    isActive: boolean;
    paymentMethod?: 'cash' | 'credit_card';
    currency?: string;
  }) => void;
}

export function RecurringTransactionForm({ categories, activeCurrency = 'TRY', onSubmit }: RecurringTransactionFormProps) {
  const { t } = useLanguage();
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(getToday());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'none'>('none');
  const [currency, setCurrency] = useState(activeCurrency);

  useEffect(() => {
    setCurrency(activeCurrency);
  }, [activeCurrency]);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !categoryId) return;

    onSubmit({
      amount: parseFloat(amount),
      description,
      categoryId,
      type,
      startDate,
      endDate: hasEndDate ? endDate : undefined,
      isActive,
      paymentMethod: paymentMethod !== 'none' ? paymentMethod : undefined,
      currency,
    });

    // Reset form
    setAmount('');
    setDescription('');
    setCategoryId('');
    setHasEndDate(false);
    setEndDate('');
    setPaymentMethod('none');
  };

  const filteredCategories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Repeat className="w-5 h-5" />
          {t('form.addNewRecurring')}
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
                type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {t('general.income')}
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              onClick={() => {
                setType('expense');
                setCategoryId('');
              }}
              className={`flex items-center gap-2 ${
                type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              {t('general.expense')}
            </Button>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="rec-amount">{t('general.amount')}</Label>
              <div className="relative">
                <Input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 text-foreground"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {getCurrencySymbol(currency)}
                </span>
              </div>
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="rec-currency">{t('general.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency} required>
                <SelectTrigger id="rec-currency">
                  <SelectValue placeholder={t('general.currency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="rec-category">{t('general.category')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder={t('form.selectCategory')} />
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
            <Label>{t('general.paymentMethod')}</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(val) => setPaymentMethod(val as 'cash' | 'credit_card' | 'none')}
              className="flex flex-row gap-6 items-center pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="rec-pm-none" />
                <Label htmlFor="rec-pm-none" className="cursor-pointer font-normal">{t('general.none')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="rec-pm-cash" />
                <Label htmlFor="rec-pm-cash" className="cursor-pointer font-normal">{t('general.cashEmoji')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit_card" id="rec-pm-card" />
                <Label htmlFor="rec-pm-card" className="cursor-pointer font-normal">{t('general.cardEmoji')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>{t('form.startDate')}</Label>
            <CalendarPicker
              date={startDate}
              onDateChange={setStartDate}
              label={t('form.selectStartDate')}
            />
          </div>

          {/* End Date Option */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasEndDate"
              checked={hasEndDate}
              onCheckedChange={(checked) => setHasEndDate(checked as boolean)}
            />
            <Label htmlFor="hasEndDate" className="cursor-pointer">
              {t('form.hasEndDate')}
            </Label>
          </div>

          {hasEndDate && (
            <div className="space-y-2">
              <Label>{t('form.endDate')}</Label>
              <CalendarPicker
                date={endDate}
                onDateChange={setEndDate}
                label={t('form.selectEndDate')}
              />
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              {t('form.isActive')}
            </Label>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="rec-description">{t('form.descriptionOptional')}</Label>
            <Textarea
              id="rec-description"
              placeholder={t('form.notePlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!amount || !categoryId}
          >
            <Plus className="w-4 h-4 mr-2" />
            {type === 'income' ? t('form.addRecurringIncome') : t('form.addRecurringExpense')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
