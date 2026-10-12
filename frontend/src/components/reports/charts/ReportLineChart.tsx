'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface LineConfig {
  key: string;
  name: string;
  stroke: string;
  strokeWidth?: number;
}

export interface ReportLineChartProps {
  data: any[];
  xKey: string;
  lines: LineConfig[];
  title?: string;
  description?: string;
  height?: number;
  formatYAxis?: (val: number) => string;
  formatTooltip?: (value: any, name: string) => [string, string];
  emptyMessage?: string;
  isLoading?: boolean;
}

export const ReportLineChart: React.FC<ReportLineChartProps> = ({
  data,
  xKey,
  lines,
  title,
  description,
  height = 320,
  formatYAxis,
  formatTooltip,
  emptyMessage = 'No chart data available for the selected period.',
  isLoading = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        {title && <h3 className="font-semibold text-lg">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        <div style={{ height }} className="flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border/60 animate-pulse">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
          <span className="text-xs text-muted-foreground font-medium">Loading chart data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-lg text-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {data.length === 0 ? (
        <div style={{ height }} className="flex items-center justify-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey={xKey}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '13px' }} />
              {lines.map((line: LineConfig) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth || 2.5}
                  dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
