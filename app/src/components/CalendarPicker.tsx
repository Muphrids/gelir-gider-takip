import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

interface CalendarPickerProps {
  date: string;
  onDateChange: (date: string) => void;
  label?: string;
}

export function CalendarPicker({ date, onDateChange, label }: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onDateChange(format(selectedDate, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(parseISO(date), 'dd MMMM yyyy', { locale: tr }) : label || 'Tarih seçin'}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={date ? parseISO(date) : undefined}
          onSelect={handleSelect}
          initialFocus
          locale={tr}
          className="rounded-md border p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
