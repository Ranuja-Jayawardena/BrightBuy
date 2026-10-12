export interface RevenueDataPoint {
  period: string;
  revenue: number;
  order_count: number;
}

export interface TopProductDataPoint {
  product_id: number;
  product_name: string;
  variant_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface OrderStatusDataPoint {
  period: string;
  status: string;
  order_count: number;
}

export interface LowStockDataPoint {
  variant_id: number;
  variant_sku: string;
  product_name: string;
  variant_name: string;
  stock_quantity: number;
  price: number;
}

export interface InventorySummaryDataPoint {
  category_id: number;
  category_name: string;
  total_units: number;
  total_value: number;
}

export interface TopCustomerDataPoint {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  order_count: number;
  total_spend: number;
}

export interface CustomerGeographyDataPoint {
  region: string;
  order_count: number;
  total_spend: number;
  percentage?: number;
}

export type DateRangePreset = '7d' | '30d' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

export type ReportExportType = 'sales' | 'inventory' | 'customers' | 'revenue';
