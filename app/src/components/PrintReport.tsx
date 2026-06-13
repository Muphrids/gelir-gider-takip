import type { Transaction, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface PrintReportProps {
  transactions: Transaction[];
  categories: Category[];
  selectedProjectName: string;
  dateLabel: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function PrintReport({
  transactions,
  categories,
  selectedProjectName,
  dateLabel,
  totalIncome,
  totalExpense,
  balance,
}: PrintReportProps) {
  // Group categories for table representation
  const categorySummary = categories.map((cat) => {
    const projTransactions = transactions.filter((t) => t.categoryId === cat.id);
    const sum = projTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    return {
      name: cat.name,
      type: cat.type,
      color: cat.color,
      amount: sum,
    };
  }).filter(c => c.amount > 0);

  const incomeCategories = categorySummary.filter(c => c.type === 'income');
  const expenseCategories = categorySummary.filter(c => c.type === 'expense');

  return (
    <div id="print-report-root" className="hidden print:block print:p-8 bg-white text-black min-h-screen">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase text-black">Mali Durum Raporu</h1>
          <p className="text-xs text-gray-600 mt-1 font-medium">
            Şirket / Proje: <span className="font-bold">{selectedProjectName}</span>
          </p>
        </div>
        <div className="text-right text-xs text-gray-600 font-medium">
          <p>Dönem: <span className="font-bold">{dateLabel}</span></p>
          <p>Raporlama Tarihi: <span className="font-bold">{new Date().toLocaleDateString('tr-TR')}</span></p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-black p-3.5 rounded-lg bg-gray-50/50">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Toplam Gelir</span>
          <div className="text-lg font-bold text-green-700 mt-1">+{formatCurrency(totalIncome)}</div>
        </div>
        <div className="border border-black p-3.5 rounded-lg bg-gray-50/50">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Toplam Gider</span>
          <div className="text-lg font-bold text-red-700 mt-1">-{formatCurrency(totalExpense)}</div>
        </div>
        <div className="border border-black p-3.5 rounded-lg bg-gray-50/50">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Net Bakiye</span>
          <div className={`text-lg font-bold mt-1 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      {/* Category Breakdowns */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Income Categories */}
        <div className="border border-black p-4 rounded-lg bg-white">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-1.5 mb-3 text-green-700">Gelir Kategori Dağılımı</h3>
          {incomeCategories.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-300 font-bold">
                  <th className="py-1">Kategori</th>
                  <th className="py-1 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {incomeCategories.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/10" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </td>
                    <td className="py-1 text-right font-bold text-green-700">+{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">Bu dönemde gelir bulunmuyor.</p>
          )}
        </div>

        {/* Expense Categories */}
        <div className="border border-black p-4 rounded-lg bg-white">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-1.5 mb-3 text-red-700">Gider Kategori Dağılımı</h3>
          {expenseCategories.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-300 font-bold">
                  <th className="py-1">Kategori</th>
                  <th className="py-1 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/10" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </td>
                    <td className="py-1 text-right font-bold text-red-700">-{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">Bu dönemde gider bulunmuyor.</p>
          )}
        </div>
      </div>

      {/* Transaction Details Table */}
      <div className="border border-black p-4 rounded-lg bg-white page-break-before-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-1.5 mb-3">Detaylı İşlem Listesi ({transactions.length} İşlem)</h3>
        {transactions.length > 0 ? (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-black font-bold bg-gray-50">
                <th className="py-1.5 px-2">Tarih</th>
                <th className="py-1.5 px-2">Açıklama</th>
                <th className="py-1.5 px-2">Kategori</th>
                <th className="py-1.5 px-2">Ödeme Yöntemi</th>
                <th className="py-1.5 px-2 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const category = categories.find((c) => c.id === t.categoryId);
                return (
                  <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50/50 page-break-inside-avoid">
                    <td className="py-2 px-2 whitespace-nowrap">{t.date}</td>
                    <td className="py-2 px-2 font-medium">{t.description || 'Açıklama yok'}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block border border-black/10" style={{ backgroundColor: category?.color }} />
                        {category?.name || 'Belirsiz'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500 font-medium">
                      {t.paymentMethod === 'cash' ? '💵 Nakit' : t.paymentMethod === 'credit_card' ? '💳 Kredi Kartı' : '-'}
                    </td>
                    <td className={`py-2 px-2 text-right font-bold ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-gray-400">Bu dönemde yapılmış bir işlem bulunamadı.</p>
        )}
      </div>

      {/* Footer / Signature */}
      <div className="mt-12 pt-6 border-t border-dashed border-gray-400 flex justify-between items-start text-xs text-gray-500">
        <div>
          <p>Gelir Gider Takip Sistemi tarafından otomatik üretilmiştir.</p>
          <p className="mt-0.5">Güvenli ve şifreli yerel finansal veri yöneticisi.</p>
        </div>
        <div className="w-48 text-center border-t border-black mt-6 pt-1 text-black font-bold uppercase tracking-wider text-[10px]">
          İmza / Kaşe
        </div>
      </div>
    </div>
  );
}
