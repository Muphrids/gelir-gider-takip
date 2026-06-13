import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category, TransactionType } from '@/types';
import { Plus, Trash2, TrendingUp, TrendingDown, ShieldAlert, Edit } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (category: Omit<Category, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#f43f5e', '#78716c', '#6b7280', '#374151', '#1f2937',
];

export function CategoryManager({ categories, onAdd, onUpdate, onDelete }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [budgetLimit, setBudgetLimit] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setColor(category.color);
    setBudgetLimit(category.budgetLimit ? category.budgetLimit.toString() : '');
    setIsOpen(true);
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCategory) {
      onUpdate(editingCategory.id, {
        name: name.trim(),
        type,
        color,
        budgetLimit: type === 'expense' && budgetLimit.trim() ? parseFloat(budgetLimit) : undefined,
      });
    } else {
      onAdd({
        name: name.trim(),
        type,
        color,
        budgetLimit: type === 'expense' && budgetLimit.trim() ? parseFloat(budgetLimit) : undefined,
      });
    }

    setName('');
    setColor(PRESET_COLORS[0]);
    setBudgetLimit('');
    setEditingCategory(null);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const CategoryList = ({ items, title, icon: Icon }: { 
    items: Category[]; 
    title: string;
    icon: React.ElementType;
  }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{category.name}</span>
            {category.budgetLimit && category.budgetLimit > 0 && (
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold ml-1">
                L: {formatCurrency(category.budgetLimit)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1 text-blue-500 hover:text-blue-750 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => handleEditClick(category)}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1 text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDeleteId(category.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Kategoriler</span>
          <Button size="sm" onClick={() => {
            setEditingCategory(null);
            setName('');
            setType('expense');
            setColor(PRESET_COLORS[0]);
            setBudgetLimit('');
            setIsOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-1" />
            Yeni
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CategoryList 
          items={incomeCategories} 
          title="Gelir Kategorileri" 
          icon={TrendingUp}
        />
        <CategoryList 
          items={expenseCategories} 
          title="Gider Kategorileri" 
          icon={TrendingDown}
        />
      </CardContent>

      {/* Add Category Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setEditingCategory(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Kategori detaylarını güncelleyin.' : 'Yeni bir gelir veya gider kategorisi oluşturun.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Kategori Adı</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Market, Ulaşım..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tür</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === 'income' ? 'default' : 'outline'}
                  onClick={() => {
                    setType('income');
                    setBudgetLimit('');
                  }}
                  className={type === 'income' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Gelir
                </Button>
                <Button
                  type="button"
                  variant={type === 'expense' ? 'default' : 'outline'}
                  onClick={() => setType('expense')}
                  className={type === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                >
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Gider
                </Button>
              </div>
            </div>

            {/* Budget Limit Field - Only for Expense Categories */}
            {type === 'expense' && (
              <div className="space-y-2">
                <Label htmlFor="budgetLimit">Aylık Bütçe Limiti ({getCurrencySymbol()}) (Opsiyonel)</Label>
                <Input
                  id="budgetLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  placeholder="Örn: 5000"
                />
                <p className="text-[11px] text-gray-500">
                  Bu harcama kategorisi için aylık maksimum limit belirler.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Renk</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsOpen(false);
                setEditingCategory(null);
              }}>
                İptal
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                {editingCategory ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />
              Kategoriyi Sil
            </DialogTitle>
            <DialogDescription>
              Bu kategoriyi silmek istediğinizden emin misiniz? Bu kategoriye ait işlemler otomatik olarak <strong>"Diğer"</strong> kategorisine atanacaktır.
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
