'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export interface DonutDataItem {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

export interface ReportDonutChartProps {
  data: DonutDataItem[];
  title?: string;
  description?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  formatValue?: (val: number) => string;
  emptyMessage?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const ReportDonutChart: React.FC<ReportDonutChartProps> = ({
  data,
  title,
  description,
  height = 320,
  innerRadius = 60,
  outerRadius = 90,
  colors = DEFAULT_COLORS,
  formatValue,
  emptyMessage = 'No breakdown data available.',
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

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-lg text-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {data.length === 0 || total === 0 ? (
        <div style={{ height }} className="flex items-center justify-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <Tooltip
                formatter={(val: any, name: any) => {
                  const num = Number(val);
                  const formatted = formatValue ? formatValue(num) : num.toLocaleString();
                  const pct = total > 0 ? ((num / total) * 100).toFixed(1) : '0';
                  return [`${formatted} (${pct}%)`, String(name)];
                }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || colors[index % colors.length]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
