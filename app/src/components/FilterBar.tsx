import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { ViewMode, Transaction, Category } from '@/types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Search, 
  X 
} from 'lucide-react';
import { format, parseISO, addMonths, subMonths, addYears, subYears, addDays, subDays } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

function MonthPicker({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (date: Date) => void }) {
  const { t } = useLanguage();
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const months = [
    t('month.jan'), t('month.feb'), t('month.mar'), t('month.apr'), t('month.may'), t('month.jun'),
    t('month.jul'), t('month.aug'), t('month.sep'), t('month.oct'), t('month.nov'), t('month.dec')
  ];

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border dark:border-white/10 rounded-md w-[280px]">
      <div className="flex items-center justify-between mb-2 px-1">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentYear(y => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm dark:text-white">{currentYear}</span>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentYear(y => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map((month, idx) => {
          const isSelected = selectedDate.getFullYear() === currentYear && selectedDate.getMonth() === idx;
          return (
            <Button
              key={month}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className="h-9 text-xs py-1"
              onClick={() => {
                const newDate = new Date(currentYear, idx, 1);
                onSelect(newDate);
              }}
            >
              {month}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function YearPicker({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (date: Date) => void }) {
  const selectedYear = selectedDate.getFullYear();
  const [baseYear, setBaseYear] = useState(Math.floor(selectedYear / 12) * 12);
  const years = Array.from({ length: 12 }, (_, i) => baseYear + i);

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border dark:border-white/10 rounded-md w-[280px]">
      <div className="flex items-center justify-between mb-2 px-1">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setBaseYear(y => y - 12)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm dark:text-white">{baseYear} - {baseYear + 11}</span>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setBaseYear(y => y + 12)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {years.map((year) => {
          const isSelected = selectedYear === year;
          return (
            <Button
              key={year}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className="h-9 text-xs py-1"
              onClick={() => {
                const newDate = new Date(year, 0, 1);
                onSelect(newDate);
              }}
            >
              {year}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface FilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  useCustomRange: boolean;
  onUseCustomRangeChange: (use: boolean) => void;
  transactions?: Transaction[];
  categories?: Category[];

  // Advanced Filter Props
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedPaymentMethod: string;
  onSelectedPaymentMethodChange: (method: string) => void;
  selectedCategories: string[];
  onSelectedCategoriesChange: (categories: string[]) => void;
  minAmount: string;
  onMinAmountChange: (amount: string) => void;
  maxAmount: string;
  onMaxAmountChange: (amount: string) => void;
}

export function FilterBar({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectedDateChange,
  dateRange,
  onDateRangeChange,
  useCustomRange,
  onUseCustomRangeChange,
  transactions = [],
  categories = [],
  searchQuery,
  onSearchQueryChange,
  selectedPaymentMethod,
  onSelectedPaymentMethodChange,
  selectedCategories,
  onSelectedCategoriesChange,
  minAmount,
  onMinAmountChange,
  maxAmount,
  onMaxAmountChange,
}: FilterBarProps) {
  const { t, language } = useLanguage();
  const currentLocale = language === 'tr' ? tr : enUS;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const transactionDayMap = useMemo(() => {
    const map: Record<string, { hasIncome: boolean; hasExpense: boolean }> = {};
    transactions.forEach((t) => {
      if (!map[t.date]) {
        map[t.date] = { hasIncome: false, hasExpense: false };
      }
      if (t.type === 'income') {
        map[t.date].hasIncome = true;
      } else if (t.type === 'expense') {
        map[t.date].hasExpense = true;
      }
    });
    return map;
  }, [transactions]);

  const handlePrevious = () => {
    const date = parseISO(selectedDate);
    let newDate: Date;

    switch (viewMode) {
      case 'daily':
        newDate = subDays(date, 1);
        break;
      case 'monthly':
        newDate = subMonths(date, 1);
        break;
      case 'yearly':
        newDate = subYears(date, 1);
        break;
      default:
        newDate = date;
    }

    onSelectedDateChange(format(newDate, 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    const date = parseISO(selectedDate);
    let newDate: Date;

    switch (viewMode) {
      case 'daily':
        newDate = addDays(date, 1);
        break;
      case 'monthly':
        newDate = addMonths(date, 1);
        break;
      case 'yearly':
        newDate = addYears(date, 1);
        break;
      default:
        newDate = date;
    }

    onSelectedDateChange(format(newDate, 'yyyy-MM-dd'));
  };

  const getDisplayText = () => {
    const date = parseISO(selectedDate);

    switch (viewMode) {
      case 'daily':
        return format(date, 'dd MMMM yyyy', { locale: currentLocale });
      case 'monthly':
        return format(date, 'MMMM yyyy', { locale: currentLocale });
      case 'yearly':
        return format(date, 'yyyy');
      default:
        return '';
    }
  };

  const handleDateSelect = (selected: Date | undefined) => {
    if (selected) {
      onSelectedDateChange(format(selected, 'yyyy-MM-dd'));
      setCalendarOpen(false);
    }
  };

  // Toggle category choice
  const handleToggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      onSelectedCategoriesChange(selectedCategories.filter(id => id !== catId));
    } else {
      onSelectedCategoriesChange([...selectedCategories, catId]);
    }
  };

  // Check if any advanced filter is active
  const isFilterActive = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedPaymentMethod !== 'all' ||
      selectedCategories.length > 0 ||
      minAmount !== '' ||
      maxAmount !== ''
    );
  }, [searchQuery, selectedPaymentMethod, selectedCategories, minAmount, maxAmount]);

  const handleClearFilters = () => {
    onSearchQueryChange('');
    onSelectedPaymentMethodChange('all');
    onSelectedCategoriesChange([]);
    onMinAmountChange('');
    onMaxAmountChange('');
  };

  return (
    <Card className="w-full dark:bg-slate-900 dark:border-white/10">
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Main Filters Row */}
        <div className="flex flex-col lg:flex-row gap-2.5 lg:gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2.5 sm:gap-4 items-center">
            {/* View Mode Selection */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{t('filter.view')}</span>
              <div className="flex gap-0.5 sm:gap-1">
                <Button
                  variant={viewMode === 'daily' ? 'default' : 'outline'}
                  className="h-8 px-2 text-xs sm:h-9 sm:px-3"
                  onClick={() => onViewModeChange('daily')}
                >
                  {t('filter.daily')}
                </Button>
                <Button
                  variant={viewMode === 'monthly' ? 'default' : 'outline'}
                  className="h-8 px-2 text-xs sm:h-9 sm:px-3"
                  onClick={() => onViewModeChange('monthly')}
                >
                  {t('filter.monthly')}
                </Button>
                <Button
                  variant={viewMode === 'yearly' ? 'default' : 'outline'}
                  className="h-8 px-2 text-xs sm:h-9 sm:px-3"
                  onClick={() => onViewModeChange('yearly')}
                >
                  {t('filter.yearly')}
                </Button>
              </div>
            </div>

            {/* Custom Range Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 select-none">
              <input
                type="checkbox"
                id="customRange"
                checked={useCustomRange}
                onChange={(e) => onUseCustomRangeChange(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 sm:h-4 sm:w-4 cursor-pointer"
              />
              <Label htmlFor="customRange" className="text-xs sm:text-sm cursor-pointer dark:text-gray-350">
                {t('filter.customRange')}
              </Label>
            </div>
          </div>

          {/* Navigation and Date Selection */}
          <div className="flex flex-wrap gap-3 items-center">
            {useCustomRange ? (
              <div className="flex gap-2 items-center flex-wrap">
                <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-auto justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.startDate ? format(parseISO(dateRange.startDate), 'dd.MM.yyyy') : t('form.startDateShort')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.startDate ? parseISO(dateRange.startDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          onDateRangeChange({ ...dateRange, startDate: format(date, 'yyyy-MM-dd') });
                          setStartCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      locale={currentLocale}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-gray-500">-</span>
                <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-auto justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.endDate ? format(parseISO(dateRange.endDate), 'dd.MM.yyyy') : t('form.endDateShort')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.endDate ? parseISO(dateRange.endDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          onDateRangeChange({ ...dateRange, endDate: format(date, 'yyyy-MM-dd') });
                          setEndCalendarOpen(false);
                        }
                      }}
                      initialFocus
                      locale={currentLocale}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={handlePrevious}>
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2 min-w-[130px] sm:min-w-[150px] justify-center h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
                      <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="font-medium truncate">{getDisplayText()}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center" side="bottom" sideOffset={4}>
                    {viewMode === 'daily' && (
                      <Calendar
                        mode="single"
                        selected={parseISO(selectedDate)}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={currentLocale}
                        className="rounded-md border"
                        defaultMonth={parseISO(selectedDate)}
                        transactionDayMap={transactionDayMap}
                      />
                    )}
                    {viewMode === 'monthly' && (
                      <MonthPicker
                        selectedDate={parseISO(selectedDate)}
                        onSelect={(newDate) => {
                          onSelectedDateChange(format(newDate, 'yyyy-MM-dd'));
                          setCalendarOpen(false);
                        }}
                      />
                    )}
                    {viewMode === 'yearly' && (
                      <YearPicker
                        selectedDate={parseISO(selectedDate)}
                        onSelect={(newDate) => {
                          onSelectedDateChange(format(newDate, 'yyyy-MM-dd'));
                          setCalendarOpen(false);
                        }}
                      />
                    )}
                  </PopoverContent>
                </Popover>
                
                <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" onClick={handleNext}>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            )}

            {/* Collapsible Advanced Filters Trigger */}
            <Button
              variant={isFilterActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-7 sm:h-8 text-xs sm:text-sm px-2.5 sm:px-3"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />
              {t('filter.advanced')}
              {isFilterActive && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        {showAdvanced && (
          <div className="bg-slate-50/50 dark:bg-slate-800/10 p-4 rounded-xl border dark:border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Description Search */}
              <div className="md:col-span-4 space-y-1.5">
                <Label htmlFor="search-input" className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('filter.txDesc')}</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder={t('filter.searchPlaceholder')}
                    className="w-full text-xs pl-9 pr-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchQueryChange('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method Filter */}
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="payment-method-filter" className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('general.paymentMethod')}</Label>
                <select
                  id="payment-method-filter"
                  value={selectedPaymentMethod}
                  onChange={(e) => onSelectedPaymentMethodChange(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{t('filter.allMethods')}</option>
                  <option value="cash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{t('filter.cashOnly')}</option>
                  <option value="credit_card" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{t('filter.cardOnly')}</option>
                  <option value="none" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{t('general.none')}</option>
                </select>
              </div>

              {/* Amount Range Filter */}
              <div className="md:col-span-5 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('filter.amountRange')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => onMinAmountChange(e.target.value)}
                    placeholder={t('filter.minAmount')}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => onMaxAmountChange(e.target.value)}
                    placeholder={t('filter.maxAmount')}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Category Multi-Select Tags */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('filter.categories')}</span>
                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectedCategoriesChange([])}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-750 uppercase"
                    >
                      {t('filter.clearSelection')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span 
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer buttons inside Advanced Panel */}
            {isFilterActive && (
              <div className="flex justify-end pt-1 border-t dark:border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('filter.resetAll')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
