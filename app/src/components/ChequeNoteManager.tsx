import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { ChequeNote, Project, Category } from '@/types';
import { formatCurrency, getToday } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Edit,
  Search,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Banknote,
} from 'lucide-react';

interface ChequeNoteManagerProps {
  chequesAndNotes: ChequeNote[];
  projects: Project[];
  categories: Category[];
  onAdd: (item: Omit<ChequeNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<ChequeNote>) => void;
  onDelete: (id: string) => void;
  onAddTransaction: (transaction: {
    amount: number;
    description: string;
    categoryId: string;
    type: 'income' | 'expense';
    date: string;
  }) => void;
}

export function ChequeNoteManager({
  chequesAndNotes = [],
  projects = [],
  categories = [],
  onAdd,
  onUpdate,
  onDelete,
  onAddTransaction,
}: ChequeNoteManagerProps) {
  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentItem, setPaymentItem] = useState<ChequeNote | null>(null);

  // Form States
  const [type, setType] = useState<'cheque' | 'promissory_note'>('cheque');
  const [direction, setDirection] = useState<'receivable' | 'payable'>('receivable');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getToday());
  const [issueDate, setIssueDate] = useState(getToday());
  const [serialNumber, setSerialNumber] = useState('');
  const [debtor, setDebtor] = useState('');
  const [bank, setBank] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ChequeNote['status']>('pending');

  // Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Status/Payment confirmation States
  const [addToLedger, setAddToLedger] = useState(true);
  const [selectedLedgerCategory, setSelectedLedgerCategory] = useState<string>('');

  // Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  const todayStr = getToday();

  // Categories helper
  const filteredCategoriesForPayment = useMemo(() => {
    if (!paymentItem) return [];
    const targetType = paymentItem.direction === 'receivable' ? 'income' : 'expense';
    return categories.filter((c) => c.type === targetType);
  }, [paymentItem, categories]);

  // Set default category when paymentItem changes
  const handleOpenPayment = (item: ChequeNote) => {
    setPaymentItem(item);
    setAddToLedger(true);
    const targetType = item.direction === 'receivable' ? 'income' : 'expense';
    const relatedCats = categories.filter((c) => c.type === targetType);
    if (relatedCats.length > 0) {
      setSelectedLedgerCategory(relatedCats[0].id);
    } else {
      setSelectedLedgerCategory('cat-10'); // Default "Diğer"
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !debtor || !serialNumber) return;

    onAdd({
      type,
      direction,
      amount: parseFloat(amount),
      dueDate,
      issueDate,
      serialNumber: serialNumber.trim(),
      debtor: debtor.trim(),
      bank: bank.trim() || undefined,
      projectId: projectId === 'none' ? undefined : projectId,
      description: description.trim() || undefined,
      status: 'pending',
    });

    // Reset Form
    setType('cheque');
    setDirection('receivable');
    setAmount('');
    setDueDate(getToday());
    setIssueDate(getToday());
    setSerialNumber('');
    setDebtor('');
    setBank('');
    setProjectId('none');
    setDescription('');
    setIsAddOpen(false);
  };

  const handleStartEdit = (item: ChequeNote) => {
    setEditingId(item.id);
    setType(item.type);
    setDirection(item.direction);
    setAmount(item.amount.toString());
    setDueDate(item.dueDate);
    setIssueDate(item.issueDate);
    setSerialNumber(item.serialNumber);
    setDebtor(item.debtor);
    setBank(item.bank || '');
    setProjectId(item.projectId || 'none');
    setDescription(item.description || '');
    setStatus(item.status);
    setIsEditOpen(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !amount || !debtor || !serialNumber) return;

    onUpdate(editingId, {
      type,
      direction,
      amount: parseFloat(amount),
      dueDate,
      issueDate,
      serialNumber: serialNumber.trim(),
      debtor: debtor.trim(),
      bank: bank.trim() || undefined,
      projectId: projectId === 'none' ? undefined : projectId,
      description: description.trim() || undefined,
      status,
    });

    setIsEditOpen(false);
    setEditingId(null);
  };

  const handleConfirmPayment = () => {
    if (!paymentItem) return;

    // 1. Update status to paid
    onUpdate(paymentItem.id, { status: 'paid' });

    // 2. Add to Ledger if checked
    if (addToLedger && selectedLedgerCategory) {
      onAddTransaction({
        amount: paymentItem.amount,
        description: `${paymentItem.type === 'cheque' ? 'Çek' : 'Senet'} Tahsilatı/Ödemesi: ${paymentItem.debtor} (Seri No: ${paymentItem.serialNumber})`,
        categoryId: selectedLedgerCategory,
        type: paymentItem.direction === 'receivable' ? 'income' : 'expense',
        date: todayStr,
      });
    }

    setPaymentItem(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  // Summaries Calculations
  const stats = useMemo(() => {
    const pendingItems = chequesAndNotes.filter((c) => c.status === 'pending');
    
    const receivableTotal = pendingItems
      .filter((c) => c.direction === 'receivable')
      .reduce((sum, c) => sum + c.amount, 0);

    const payableTotal = pendingItems
      .filter((c) => c.direction === 'payable')
      .reduce((sum, c) => sum + c.amount, 0);

    const alerts = pendingItems.filter((c) => c.dueDate <= todayStr);
    const alertTotal = alerts.reduce((sum, c) => sum + c.amount, 0);

    return {
      receivableTotal,
      payableTotal,
      alertCount: alerts.length,
      alertTotal,
    };
  }, [chequesAndNotes, todayStr]);

  // Filtered Cheques & Notes
  const filteredItems = useMemo(() => {
    return chequesAndNotes.filter((item) => {
      // Search term filter
      const searchMatch =
        item.debtor.toLowerCase().includes(filterSearch.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(filterSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(filterSearch.toLowerCase()));

      // Type filter
      const typeMatch = filterType === 'all' || item.type === filterType;

      // Direction filter
      const directionMatch = filterDirection === 'all' || item.direction === filterDirection;

      // Status filter
      const statusMatch = filterStatus === 'all' || item.status === filterStatus;

      // Project filter
      const projectMatch = filterProject === 'all' || item.projectId === filterProject;

      return searchMatch && typeMatch && directionMatch && statusMatch && projectMatch;
    });
  }, [chequesAndNotes, filterSearch, filterType, filterDirection, filterStatus, filterProject]);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Çek & Senet Hatırlatıcı</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vadeli alacak ve borç belgelerinizi yönetin.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Belge Ekle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* Receivables */}
        <Card className="dark:bg-slate-900 dark:border-white/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Toplam Alacak</p>
              <h3 className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.receivableTotal)}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Beklemedeki tahsilatlar</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg shrink-0">
              <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Payables */}
        <Card className="dark:bg-slate-900 dark:border-white/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Toplam Borç</p>
              <h3 className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(stats.payableTotal)}
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Beklemedeki ödemeler</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg shrink-0">
              <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Alerts / Overdue */}
        <Card className="col-span-2 md:col-span-1 dark:bg-slate-900 dark:border-white/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vadesi Gelenler / Geçenler</p>
              <h3 className={`text-lg sm:text-2xl font-bold mt-1 ${stats.alertCount > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>
                {stats.alertCount} Adet
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Toplam: {formatCurrency(stats.alertTotal)}</p>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${stats.alertCount > 0 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="dark:bg-slate-900 dark:border-white/10">
        <CardHeader className="pb-3 border-b dark:border-white/10">
          <CardTitle className="text-base font-semibold flex flex-col md:flex-row md:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Borçlu adı, seri no veya açıklama ara..."
                className="pl-9 w-full dark:bg-slate-800 dark:border-white/10"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[110px] dark:bg-slate-800 dark:border-white/10 text-xs">
                  <SelectValue placeholder="Tür" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Belgeler</SelectItem>
                  <SelectItem value="cheque">Çek</SelectItem>
                  <SelectItem value="promissory_note">Senet</SelectItem>
                </SelectContent>
              </Select>

              {/* Direction Filter */}
              <Select value={filterDirection} onValueChange={setFilterDirection}>
                <SelectTrigger className="w-[110px] dark:bg-slate-800 dark:border-white/10 text-xs">
                  <SelectValue placeholder="Yön" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Yönler</SelectItem>
                  <SelectItem value="receivable">Alacak</SelectItem>
                  <SelectItem value="payable">Borç</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] dark:bg-slate-800 dark:border-white/10 text-xs">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="paid">Tahsil Edildi/Ödendi</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                  <SelectItem value="returned">Karşılıksız/İade</SelectItem>
                </SelectContent>
              </Select>

              {/* Company/Project Filter */}
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[130px] dark:bg-slate-800 dark:border-white/10 text-xs">
                  <SelectValue placeholder="Şirket/Proje" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şirketler</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                  <th className="px-4 py-3.5">Belge Detayı</th>
                  <th className="px-4 py-3.5">Seri No / Banka</th>
                  <th className="px-4 py-3.5">Vade / Keşide</th>
                  <th className="px-4 py-3.5">Tutar</th>
                  <th className="px-4 py-3.5">Durum</th>
                  <th className="px-4 py-3.5 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/10">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Gösterilecek çek veya senet kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const relatedProject = projects.find((p) => p.id === item.projectId);
                    const isOverdue = item.status === 'pending' && item.dueDate < todayStr;
                    const isDueToday = item.status === 'pending' && item.dueDate === todayStr;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                          isOverdue ? 'bg-red-500/5 dark:bg-red-500/5' : ''
                        } ${isDueToday ? 'bg-amber-500/5 dark:bg-amber-500/5' : ''}`}
                      >
                        {/* Doc details */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                item.type === 'cheque'
                                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                  : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {item.type === 'cheque' ? 'Çek' : 'Senet'}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                item.direction === 'receivable'
                                  ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {item.direction === 'receivable' ? 'Alacak' : 'Borç'}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1.5">{item.debtor}</p>
                          {relatedProject && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] mt-1 px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: relatedProject.color }}
                            >
                              {relatedProject.name}
                            </span>
                          )}
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                          )}
                        </td>

                        {/* Serial & Bank */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-700 dark:text-gray-300">{item.serialNumber}</p>
                          {item.bank ? (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3" /> {item.bank}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 italic mt-0.5">Banka belirtilmemiş</p>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium text-gray-700 dark:text-gray-300">Vade: {item.dueDate}</span>
                              {isOverdue && (
                                <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 py-0.2 rounded font-bold flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Gecikti
                                </span>
                              )}
                              {isDueToday && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded font-bold">
                                  Bugün!
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400 pl-5">Keşide: {item.issueDate}</p>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${
                            item.direction === 'receivable' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(item.amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.status === 'pending'
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                                : item.status === 'paid'
                                ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                                : item.status === 'returned'
                                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                                : 'bg-gray-150 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border'
                            }`}
                          >
                            {item.status === 'pending' && 'Beklemede'}
                            {item.status === 'paid' && 'Ödendi/Tahsil Edildi'}
                            {item.status === 'returned' && 'Karşılıksız/İade'}
                            {item.status === 'cancelled' && 'İptal'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'pending' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={() => handleOpenPayment(item)}
                                title="Tahsil Edildi / Ödendi İşaretle"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800"
                              onClick={() => handleStartEdit(item)}
                              title="Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => setDeleteId(item.id)}
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block lg:hidden divide-y dark:divide-white/10">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Gösterilecek çek veya senet kaydı bulunmuyor.
              </div>
            ) : (
              filteredItems.map((item) => {
                const relatedProject = projects.find((p) => p.id === item.projectId);
                const isOverdue = item.status === 'pending' && item.dueDate < todayStr;
                const isDueToday = item.status === 'pending' && item.dueDate === todayStr;

                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-3 transition-colors ${
                      isOverdue ? 'bg-red-500/5' : ''
                    } ${isDueToday ? 'bg-amber-500/5' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            item.type === 'cheque'
                              ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                              : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {item.type === 'cheque' ? 'Çek' : 'Senet'}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            item.direction === 'receivable'
                              ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {item.direction === 'receivable' ? 'Alacak' : 'Borç'}
                        </span>
                      </div>
                      <div className={`font-bold text-base ${
                        item.direction === 'receivable' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 text-[10px] block font-medium">Borçlu/Alacaklı</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{item.debtor}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block font-medium">Seri No / Banka</span>
                        <span className="text-gray-750 dark:text-gray-300">{item.serialNumber} {item.bank ? `/ ${item.bank}` : ''}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block font-medium">Vade Tarihi</span>
                        <span className={`font-medium ${isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.dueDate} {isOverdue && '(Gecikti)'} {isDueToday && '(Bugün!)'}
                        </span>
                        <span className="text-[10px] text-gray-400 block">Keşide: {item.issueDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] block font-medium">Durum</span>
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                            item.status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                              : item.status === 'paid'
                              ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                              : item.status === 'returned'
                              ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                              : 'bg-gray-150 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border'
                          }`}
                        >
                          {item.status === 'pending' && 'Beklemede'}
                          {item.status === 'paid' && 'Ödendi/Tahsil'}
                          {item.status === 'returned' && 'Karşılıksız/İade'}
                          {item.status === 'cancelled' && 'İptal'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t dark:border-white/5">
                      <div className="flex flex-wrap gap-1 items-center max-w-[60%]">
                        {relatedProject && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: relatedProject.color }}
                          >
                            {relatedProject.name}
                          </span>
                        )}
                        {item.description && (
                          <p className="text-[11px] text-gray-500 truncate" title={item.description}>
                            "{item.description}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === 'pending' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                            onClick={() => handleOpenPayment(item)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800"
                          onClick={() => handleStartEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Document Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg dark:bg-slate-900 dark:text-white dark:border-white/10">
          <DialogHeader>
            <DialogTitle>Yeni Çek veya Senet Ekle</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Vadeli alacak veya borç belgesi detaylarını girin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Belge Türü</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Çek</SelectItem>
                    <SelectItem value="promissory_note">Senet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Yön / İşlem</Label>
                <Select value={direction} onValueChange={(val: any) => setDirection(val)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Alacak (Alınan)</SelectItem>
                    <SelectItem value="payable">Borç (Verilen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Tutar (TL)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Seri Numarası</Label>
                <Input
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Çek/Senet Seri No..."
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Vade Tarihi</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueDate">Keşide / Düzenleme Tarihi</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="debtor">Borçlu / Ödeyecek Kişi</Label>
                <Input
                  id="debtor"
                  value={debtor}
                  onChange={(e) => setDebtor(e.target.value)}
                  placeholder="Ad Soyad / Firma..."
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank">Banka / Şube</Label>
                <Input
                  id="bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Garanti, Akbank vb..."
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>İlişkili Şirket / Proje</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                  <SelectValue placeholder="Şirket Seçin (Opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">İlişkilendirme Yok</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ek notlar girin..."
                rows={2}
                className="dark:bg-slate-800 dark:border-white/10"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="dark:border-white/10">
                İptal
              </Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg dark:bg-slate-900 dark:text-white dark:border-white/10">
          <DialogHeader>
            <DialogTitle>Belgeyi Düzenle</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Mevcut çek veya senet kaydını düzenleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Belge Türü</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheque">Çek</SelectItem>
                    <SelectItem value="promissory_note">Senet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Yön / İşlem</Label>
                <Select value={direction} onValueChange={(val: any) => setDirection(val)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Alacak (Alınan)</SelectItem>
                    <SelectItem value="payable">Borç (Verilen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Tutar (TL)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-serial">Seri Numarası</Label>
                <Input
                  id="edit-serial"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-duedate">Vade Tarihi</Label>
                <Input
                  id="edit-duedate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-issuedate">Keşide / Düzenleme Tarihi</Label>
                <Input
                  id="edit-issuedate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-debtor">Borçlu / Ödeyecek Kişi</Label>
                <Input
                  id="edit-debtor"
                  value={debtor}
                  onChange={(e) => setDebtor(e.target.value)}
                  required
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bank">Banka / Şube</Label>
                <Input
                  id="edit-bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="dark:bg-slate-800 dark:border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Belge Durumu</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Durum Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="paid">Tahsil Edildi/Ödendi</SelectItem>
                    <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    <SelectItem value="returned">Karşılıksız/İade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>İlişkili Şirket / Proje</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">İlişkilendirme Yok</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Açıklama (Opsiyonel)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ek notlar..."
                rows={2}
                className="dark:bg-slate-800 dark:border-white/10"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="dark:border-white/10">
                İptal
              </Button>
              <Button type="submit">Kaydet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Payment Confirmation Dialog */}
      <Dialog open={!!paymentItem} onOpenChange={(open) => !open && setPaymentItem(null)}>
        <DialogContent className="max-w-md dark:bg-slate-900 dark:text-white dark:border-white/10">
          <DialogHeader>
            <DialogTitle>
              {paymentItem?.type === 'cheque' ? 'Çek' : 'Senet'} Durumunu Güncelle
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Bu belgeyi **Tahsil Edildi / Ödendi** olarak işaretlemek üzeresiniz.
            </DialogDescription>
          </DialogHeader>

          {paymentItem && (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-gray-50 dark:bg-slate-800 border dark:border-white/10 rounded-lg space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Belge Detayları</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-150">
                  {paymentItem.debtor} - Seri No: {paymentItem.serialNumber}
                </p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(paymentItem.amount)}
                </p>
              </div>

              {/* Ledger Integration */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="add-ledger-check"
                    checked={addToLedger}
                    onCheckedChange={(checked) => setAddToLedger(checked as boolean)}
                  />
                  <Label htmlFor="add-ledger-check" className="cursor-pointer font-medium text-sm flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-blue-600" />
                    Kasaya (İşlemlere) otomatik gelir/gider olarak kaydet
                  </Label>
                </div>

                {addToLedger && (
                  <div className="space-y-2 pl-6">
                    <Label className="text-xs text-gray-500 dark:text-gray-400">İşlemin Ekleneceği Kategori</Label>
                    <Select value={selectedLedgerCategory} onValueChange={setSelectedLedgerCategory}>
                      <SelectTrigger className="dark:bg-slate-800 dark:border-white/10">
                        <SelectValue placeholder="Kategori Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategoriesForPayment.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentItem(null)} className="dark:border-white/10">
              Vazgeç
            </Button>
            <Button onClick={handleConfirmPayment}>Tahsil Et / Ödendi İşaretle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="dark:bg-slate-900 dark:text-white dark:border-white/10">
          <DialogHeader>
            <DialogTitle>Kayıt Silinecek</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Bu çek/senet kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="dark:border-white/10">
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
