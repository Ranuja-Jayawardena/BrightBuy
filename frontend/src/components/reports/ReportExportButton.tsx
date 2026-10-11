'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportExportType } from '@/types/reports';
import { reportService } from '@/services/reportService';

export interface ReportExportButtonProps {
  type: ReportExportType;
  params?: {
    start_date?: string;
    end_date?: string;
  };
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  type,
  params,
  label = 'Export CSV',
  variant = 'outline',
  size = 'sm',
  className = '',
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await reportService.exportCsv(type, params);
    } catch (error) {
      console.error('Failed to export report CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 rounded-lg text-xs font-medium transition-colors ${className}`}
    >
      {exporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
};
