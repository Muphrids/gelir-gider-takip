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

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  projects?: Project[];
  showProjectBadge?: boolean;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  title?: string;
}

export function TransactionList({
  transactions,
  categories,
  projects = [],
  showProjectBadge = false,
  onDelete,
  onUpdate,
  title = 'İşlemler',
}: TransactionListProps) {
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
    const headers = ['Tarih', 'Şirket', 'Kategori', 'Açıklama', 'Ödeme Yöntemi', 'Tür', 'Tutar'];
    const rows = filteredTransactions.map((t) => {
      const cat = getCategory(t.categoryId);
      return [
        formatShortDate(t.date),
        getProjectName(t.projectId),
        cat?.name || 'Bilinmeyen',
        (t.description || '').replace(/"/g, '""'),
        t.paymentMethod === 'cash' ? 'Nakit' : t.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Belirtilmedi',
        t.type === 'income' ? 'Gelir' : 'Gider',
        t.amount.toFixed(2),
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
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="İşlemlerde ara..."
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
            <span className="hidden md:inline">CSV İndir</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aradığınız kriterlere uygun işlem bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
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
                                {transaction.paymentMethod === 'cash' ? '💵 Nakit' : '💳 Kredi Kartı'}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            isIncome ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
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
            <DialogTitle>İşlemi Düzenle</DialogTitle>
            <DialogDescription>
              Seçili işlemin detaylarını güncelleyin.
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
                Gelir
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
                Gider
              </Button>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Tutar</Label>
              <div className="relative">
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="pl-10"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {getCurrencySymbol()}
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
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
              <Label htmlFor="edit-payment-method">Ödeme Yöntemi (Opsiyonel)</Label>
              <Select 
                value={editPaymentMethod} 
                onValueChange={(val) => setEditPaymentMethod(val as 'cash' | 'credit_card' | 'none')}
              >
                <SelectTrigger id="edit-payment-method">
                  <SelectValue placeholder="Ödeme yöntemi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belirtilmemiş</SelectItem>
                  <SelectItem value="cash">💵 Nakit</SelectItem>
                  <SelectItem value="credit_card">💳 Kredi Kartı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Tarih</Label>
              <CalendarPicker
                date={editDate}
                onDateChange={setEditDate}
                label="Tarih seçin"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Açıklama (Opsiyonel)</Label>
              <Textarea
                id="edit-description"
                placeholder="İşlem hakkında not..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTransaction(null)}>
                İptal
              </Button>
              <Button type="submit" disabled={!editAmount || !editCategoryId}>
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşlemi Sil</DialogTitle>
            <DialogDescription>
              Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
