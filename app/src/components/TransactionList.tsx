import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarPicker } from './CalendarPicker';
import type { Transaction, Category, Project } from '@/types';
import { formatCurrency, formatShortDate, getCurrencySymbol } from '@/lib/utils';
import { Trash2, Calendar, Search, Download, Edit, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  projects?: Project[];
  showProjectBadge?: boolean;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  title?: string;
  activeCurrency?: string;
  exchangeRates?: Record<string, number>;
}

export function TransactionList({
  transactions,
  categories,
  projects = [],
  showProjectBadge = false,
  onDelete,
  onUpdate,
  title = 'İşlemler',
  activeCurrency = 'TRY',
  exchangeRates = { TRY: 1, USD: 33.0, EUR: 35.5 },
}: TransactionListProps) {
  const { t } = useLanguage();
  const displayTitle = title === 'İşlemler' ? t('nav.transactions') : title;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'credit_card' | 'none'>('none');
  const [editCurrency, setEditCurrency] = useState('TRY');

  const convertAmount = (amount: number, from: string = 'TRY', to: string = 'TRY') => {
    if (!exchangeRates) return amount;
    const fromRate = exchangeRates[from] || 1;
    const toRate = exchangeRates[to] || 1;
    return (amount * fromRate) / toRate;
  };

  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'Genel';
    return projects.find(p => p.id === projectId)?.name || 'Genel';
  };

  const getProjectColor = (projectId?: string) => {
    if (!projectId) return '#6b7280';
    return projects.find(p => p.id === projectId)?.color || '#6b7280';
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const handleStartEdit = (t: Transaction) => {
    setEditTransaction(t);
    setEditAmount(t.amount.toString());
    setEditDescription(t.description || '');
    setEditCategoryId(t.categoryId);
    setEditDate(t.date);
    setEditType(t.type);
    setEditPaymentMethod(t.paymentMethod || 'none');
    setEditCurrency(t.currency || 'TRY');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTransaction || !editAmount || !editCategoryId) return;

    if (onUpdate) {
      onUpdate(editTransaction.id, {
        amount: parseFloat(editAmount),
        description: editDescription,
        categoryId: editCategoryId,
        type: editType,
        date: editDate,
        paymentMethod: editPaymentMethod === 'none' ? undefined : editPaymentMethod,
        currency: editCurrency,
      });
    }
    setEditTransaction(null);
  };

  // Filter transactions based on search query (optimized with useMemo and O(1) category mapping)
  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return transactions;

    const categoryMap = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));

    return transactions.filter((t) => {
      const categoryName = categoryMap.get(t.categoryId) || '';
      const desc = (t.description || '').toLowerCase();
      const amountStr = t.amount.toString();

      return (
        desc.includes(query) ||
        categoryName.includes(query) ||
        amountStr.includes(query)
      );
    });
  }, [transactions, categories, searchTerm]);

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    const headers = [
      t('general.date'),
      t('general.project'),
      t('general.category'),
      t('general.description'),
      t('general.paymentMethod'),
      t('general.type'),
      t('general.amount')
    ];
    const rows = filteredTransactions.map((tx) => {
      const cat = getCategory(tx.categoryId);
      return [
        formatShortDate(tx.date),
        getProjectName(tx.projectId),
        cat?.name || t('general.unknown'),
        (tx.description || '').replace(/"/g, '""'),
        tx.paymentMethod === 'cash' ? t('general.cash') : tx.paymentMethod === 'credit_card' ? t('general.creditCard') : t('general.none'),
        tx.type === 'income' ? t('general.income') : t('general.expense'),
        tx.amount.toFixed(2),
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((r) => r.map((val) => `"${val}"`).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `gelir_gider_raporu_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editFilteredCategories =
    editType === 'income'
      ? categories.filter((c) => c.type === 'income')
      : categories.filter((c) => c.type === 'expense');

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="text-lg">{displayTitle}</CardTitle>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t('general.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          {/* CSV Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 h-9 shrink-0 text-sm"
            disabled={filteredTransactions.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{t('general.downloadCSV')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('list.noItems')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('general.date')}</TableHead>
                  <TableHead>{t('general.category')}</TableHead>
                  <TableHead>{t('general.description')}</TableHead>
                  <TableHead className="text-right">{t('general.amount')}</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const category = getCategory(transaction.categoryId);
                  const isIncome = transaction.type === 'income';

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatShortDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category?.color || '#6b7280' }}
                          />
                          <span className="truncate max-w-[120px]">
                            {category?.name || 'Bilinmeyen'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="truncate max-w-[150px] block" title={transaction.description}>
                            {transaction.description || '-'}
                          </span>
                          <div className="flex gap-1.5 flex-wrap mt-1">
                            {showProjectBadge && transaction.projectId && (
                              <span 
                                className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit border"
                                style={{
                                  backgroundColor: `${getProjectColor(transaction.projectId)}15`,
                                  color: getProjectColor(transaction.projectId),
                                  borderColor: `${getProjectColor(transaction.projectId)}30`
                                }}
                              >
                                {getProjectName(transaction.projectId)}
                              </span>
                            )}
                            {transaction.paymentMethod && (
                              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-white/10">
                                {transaction.paymentMethod === 'cash' ? t('general.cashEmoji') : t('general.cardEmoji')}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-semibold whitespace-nowrap ${
                              isIncome ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(transaction.amount, transaction.currency || 'TRY')}
                          </span>
                          {(transaction.currency || 'TRY') !== activeCurrency && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 whitespace-nowrap">
                              ({isIncome ? '+' : '-'}{formatCurrency(convertAmount(transaction.amount, transaction.currency || 'TRY', activeCurrency), activeCurrency)})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleStartEdit(transaction)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(transaction.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={() => setEditTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('form.editTransaction')}</DialogTitle>
            <DialogDescription>
              {t('form.editTransactionDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={editType === 'income' ? 'default' : 'outline'}
                onClick={() => {
                  setEditType('income');
                  setEditCategoryId('');
                }}
                className={`flex items-center gap-2 ${
                  editType === 'income' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                {t('general.income')}
              </Button>
              <Button
                type="button"
                variant={editType === 'expense' ? 'default' : 'outline'}
                onClick={() => {
                  setEditType('expense');
                  setEditCategoryId('');
                }}
                className={`flex items-center gap-2 ${
                  editType === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                {t('general.expense')}
              </Button>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-amount">{t('general.amount')}</Label>
                <div className="relative">
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="pl-10 text-foreground"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol(editCurrency)}
                  </span>
                </div>
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="edit-currency">{t('general.currency')}</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency} required>
                  <SelectTrigger id="edit-currency">
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
              <Label htmlFor="edit-category">{t('general.category')}</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {editFilteredCategories.map((category) => (
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
              <Label htmlFor="edit-payment-method">{t('form.paymentMethodOptional')}</Label>
              <Select 
                value={editPaymentMethod} 
                onValueChange={(val) => setEditPaymentMethod(val as 'cash' | 'credit_card' | 'none')}
              >
                <SelectTrigger id="edit-payment-method">
                  <SelectValue placeholder={t('form.selectPaymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('general.none')}</SelectItem>
                  <SelectItem value="cash">{t('general.cashEmoji')}</SelectItem>
                  <SelectItem value="credit_card">{t('general.cardEmoji')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>{t('general.date')}</Label>
              <CalendarPicker
                date={editDate}
                onDateChange={setEditDate}
                label={t('form.selectDate')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('form.descriptionOptional')}</Label>
              <Textarea
                id="edit-description"
                placeholder={t('form.notePlaceholder')}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTransaction(null)}>
                {t('general.cancel')}
              </Button>
              <Button type="submit" disabled={!editAmount || !editCategoryId}>
                {t('general.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.deleteTransaction')}</DialogTitle>
            <DialogDescription>
              {t('list.deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('general.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('general.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
