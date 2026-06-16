import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2, Repeat, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RecurringTransaction, Category } from '@/types';

interface RecurringTransactionManagerProps {
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export function RecurringTransactionManager({
  recurringTransactions,
  categories,
  onToggleActive,
  onDelete,
}: RecurringTransactionManagerProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { t } = useLanguage();

  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Repeat className="w-5 h-5 text-blue-600" />
          {t('rec.title', {}, 'Sabit İşlem Yöneticisi')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Repeat className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              {t('rec.noItems', {}, 'Henüz sabit işlem tanımlanmamış.')}
            </div>
          ) : (
            recurringTransactions.map((rec) => {
              const category = getCategory(rec.categoryId);
              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900/60 border border-gray-100 dark:border-white/10 rounded-lg hover:shadow-sm transition-all gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1">
                      {rec.type === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {rec.description || t('rec.noDescription', {}, 'Açıklamasız Sabit İşlem')}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: (category?.color || '#e2e8f0') + '15',
                            color: category?.color || '#475569',
                          }}
                        >
                          {t(`category.${category?.name}`, {}, category?.name || t('rec.uncategorized', {}, 'Kategorisiz'))}
                        </span>
                        {rec.paymentMethod && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                            rec.paymentMethod === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40'
                          }`}>
                            {rec.paymentMethod === 'cash' ? t('general.cashEmoji', {}, '💵 Nakit') : t('general.cardEmoji', {}, '💳 Kredi Kartı')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {t('rec.monthlyDay', { day: new Date(rec.startDate).getDate() }, `Her Ayın ${new Date(rec.startDate).getDate()}'i`)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        rec.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {rec.type === 'income' ? '+' : '-'}
                      {formatCurrency(rec.amount)}
                    </span>
                    <div className="flex items-center gap-2 border-l pl-3">
                      <Switch
                        checked={rec.isActive}
                        onCheckedChange={(checked) => onToggleActive(rec.id, checked)}
                        aria-label={t('general.active', {}, 'Aktif') + '/' + t('general.passive', {}, 'Pasif')}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => setDeleteId(rec.id)}
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

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rec.deleteTitle', {}, 'Sabit İşlemi Sil')}</DialogTitle>
            <DialogDescription>
              {t('rec.deleteDesc', {}, 'Bu sabit işlemi silmek istediğinizden emin misiniz? Artık bu işlem her ay otomatik olarak eklenmeyecektir.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('general.cancel', {}, 'İptal')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('general.delete', {}, 'Sil')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
