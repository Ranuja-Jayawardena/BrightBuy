'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface BarConfig {
  key: string;
  name: string;
  fill: string;
}

export interface ReportBarChartProps {
  data: any[];
  xKey: string;
  bars: BarConfig[];
  title?: string;
  description?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  formatYAxis?: (val: number) => string;
  formatTooltip?: (value: any, name: string) => [string, string];
  emptyMessage?: string;
}

export const ReportBarChart: React.FC<ReportBarChartProps> = ({
  data,
  xKey,
  bars,
  title,
  description,
  height = 320,
  layout = 'horizontal',
  formatYAxis,
  formatTooltip,
  emptyMessage = 'No data available for the selected period.',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        {title && <h3 className="font-semibold text-lg">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        <div style={{ height }} className="flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
          <span className="text-sm text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    );
  }

  const isVertical = layout === 'vertical';

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
            <BarChart
              data={data}
              layout={layout}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              {isVertical ? (
                <>
                  <XAxis
                    type="number"
                    tickFormatter={formatYAxis}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey={xKey}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    width={110}
                  />
                </>
              ) : (
                <>
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
                </>
              )}
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
              {bars.map((bar) => (
                <Bar
                  key={bar.key}
                  dataKey={bar.key}
                  name={bar.name}
                  fill={bar.fill}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
