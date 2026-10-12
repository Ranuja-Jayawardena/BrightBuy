'use client';

import React, { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRange, DateRangePreset } from '@/types/reports';

export interface ReportDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const formatDate = (d: Date): string => {
  return d.toISOString().split('T')[0];
};

export const getPresetDates = (preset: DateRangePreset): { startDate: string; endDate: string } => {
  const now = new Date();
  const end = formatDate(now);

  if (preset === '7d') {
    const start = new Date();
    start.setDate(now.getDate() - 7);
    return { startDate: formatDate(start), endDate: end };
  }

  if (preset === '30d') {
    const start = new Date();
    start.setDate(now.getDate() - 30);
    return { startDate: formatDate(start), endDate: end };
  }

  if (preset === 'quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterMonth, 1);
    return { startDate: formatDate(start), endDate: end };
  }

  if (preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { startDate: formatDate(start), endDate: end };
  }

  return {
    startDate: formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    endDate: end,
  };
};

export const ReportDateRangePicker: React.FC<ReportDateRangePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      onChange({ ...value, preset: 'custom' });
    } else {
      setShowCustom(false);
      const dates = getPresetDates(preset);
      onChange({
        startDate: dates.startDate,
        endDate: dates.endDate,
        preset,
      });
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
    onChange({
      ...value,
      [field]: val,
      preset: 'custom',
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 bg-card p-2 rounded-xl border shadow-sm ${className}`}>
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Filter className="h-3.5 w-3.5" />
        <span>Period:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={value.preset === '7d' ? 'default' : 'outline'}
          onClick={() => handlePresetSelect('7d')}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          Last 7 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.preset === '30d' ? 'default' : 'outline'}
          onClick={() => handlePresetSelect('30d')}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          Last 30 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.preset === 'quarter' ? 'default' : 'outline'}
          onClick={() => handlePresetSelect('quarter')}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          This Quarter
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.preset === 'year' ? 'default' : 'outline'}
          onClick={() => handlePresetSelect('year')}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          This Year
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.preset === 'custom' ? 'default' : 'outline'}
          onClick={() => handlePresetSelect('custom')}
          className="h-8 px-2.5 text-xs rounded-lg"
        >
          Custom
        </Button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 pl-2 border-l border-border text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={value.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('startDate', e.target.value)}
            className="border rounded-md px-2 py-1 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={value.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange('endDate', e.target.value)}
            className="border rounded-md px-2 py-1 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
};
