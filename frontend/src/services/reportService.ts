import { apiFetch } from './api';
import {
  RevenueDataPoint,
  TopProductDataPoint,
  OrderStatusDataPoint,
  LowStockDataPoint,
  InventorySummaryDataPoint,
  TopCustomerDataPoint,
  CustomerGeographyDataPoint,
  ReportExportType,
} from '@/types/reports';

// Mock data presets for development & UI foundation testing
export const MOCK_REVENUE_DATA: RevenueDataPoint[] = [
  { period: '2026-04', revenue: 12450.0, order_count: 85 },
  { period: '2026-05', revenue: 15800.5, order_count: 112 },
  { period: '2026-06', revenue: 18920.0, order_count: 134 },
  { period: '2026-07', revenue: 14200.0, order_count: 98 },
  { period: '2026-08', revenue: 21600.75, order_count: 156 },
  { period: '2026-09', revenue: 25400.0, order_count: 182 },
  { period: '2026-10', revenue: 28950.25, order_count: 204 },
];

export const MOCK_ORDER_STATUS_DATA: OrderStatusDataPoint[] = [
  { period: '2026-04', status: 'delivered', order_count: 75 },
  { period: '2026-04', status: 'shipped', order_count: 10 },
  { period: '2026-05', status: 'delivered', order_count: 98 },
  { period: '2026-05', status: 'shipped', order_count: 14 },
  { period: '2026-06', status: 'delivered', order_count: 120 },
  { period: '2026-06', status: 'shipped', order_count: 14 },
  { period: '2026-07', status: 'delivered', order_count: 85 },
  { period: '2026-07', status: 'shipped', order_count: 13 },
  { period: '2026-08', status: 'delivered', order_count: 140 },
  { period: '2026-08', status: 'shipped', order_count: 16 },
  { period: '2026-09', status: 'delivered', order_count: 165 },
  { period: '2026-09', status: 'shipped', order_count: 17 },
  { period: '2026-10', status: 'delivered', order_count: 180 },
  { period: '2026-10', status: 'shipped', order_count: 24 },
];

export const MOCK_TOP_PRODUCTS: TopProductDataPoint[] = [
  {
    product_id: 1,
    product_name: 'Wireless Noise-Canceling Headphones',
    variant_name: 'Midnight Black',
    total_quantity: 142,
    total_revenue: 28400.0,
  },
  {
    product_id: 2,
    product_name: 'Mechanical Gaming Keyboard',
    variant_name: 'RGB Tactile Switches',
    total_quantity: 98,
    total_revenue: 12740.0,
  },
  {
    product_id: 3,
    product_name: 'Ergonomic Standing Desk Converter',
    variant_name: 'Walnut Finish',
    total_quantity: 45,
    total_revenue: 11250.0,
  },
  {
    product_id: 4,
    product_name: 'Ultra-HD 4K Webcam',
    variant_name: 'Graphite',
    total_quantity: 88,
    total_revenue: 8800.0,
  },
  {
    product_id: 5,
    product_name: 'Smart Fitness Tracker Pro',
    variant_name: 'Navy Blue Silicone',
    total_quantity: 110,
    total_revenue: 7700.0,
  },
];

export const MOCK_LOW_STOCK: LowStockDataPoint[] = [
  {
    variant_id: 101,
    variant_sku: 'AUDIO-WH-BLK-01',
    product_name: 'Wireless Noise-Canceling Headphones',
    variant_name: 'Midnight Black',
    stock_quantity: 4,
    price: 199.99,
  },
  {
    variant_id: 105,
    variant_sku: 'KB-MECH-RGB-02',
    product_name: 'Mechanical Gaming Keyboard',
    variant_name: 'Linear Red Switches',
    stock_quantity: 2,
    price: 129.99,
  },
  {
    variant_id: 108,
    variant_sku: 'DESK-ERG-OAK-01',
    product_name: 'Ergonomic Standing Desk Converter',
    variant_name: 'Solid Oak',
    stock_quantity: 1,
    price: 249.99,
  },
  {
    variant_id: 112,
    variant_sku: 'MOUSE-ERG-SLV-01',
    product_name: 'Precision Wireless Mouse',
    variant_name: 'Silver Edition',
    stock_quantity: 5,
    price: 69.99,
  },
];

export const MOCK_INVENTORY_SUMMARY: InventorySummaryDataPoint[] = [
  { category_id: 1, category_name: 'Electronics', total_units: 840, total_value: 68400.0 },
  { category_id: 2, category_name: 'Office & Desk', total_units: 420, total_value: 39500.0 },
  { category_id: 3, category_name: 'Audio', total_units: 310, total_value: 34200.0 },
  { category_id: 4, category_name: 'Accessories', total_units: 950, total_value: 19800.0 },
  { category_id: 5, category_name: 'Wearables', total_units: 240, total_value: 16800.0 },
];

export const MOCK_TOP_CUSTOMERS: TopCustomerDataPoint[] = [
  {
    customer_id: 1,
    first_name: 'Alexander',
    last_name: 'Wright',
    email: 'alexander.wright@example.com',
    order_count: 14,
    total_spend: 3420.5,
  },
  {
    customer_id: 2,
    first_name: 'Sophia',
    last_name: 'Martinez',
    email: 'sophia.m@example.com',
    order_count: 11,
    total_spend: 2890.0,
  },
  {
    customer_id: 3,
    first_name: 'David',
    last_name: 'Kim',
    email: 'david.kim@example.com',
    order_count: 9,
    total_spend: 2150.25,
  },
  {
    customer_id: 4,
    first_name: 'Emma',
    last_name: 'Johnson',
    email: 'emma.j@example.com',
    order_count: 8,
    total_spend: 1840.0,
  },
];

export const MOCK_CUSTOMER_GEOGRAPHY: CustomerGeographyDataPoint[] = [
  { region: 'Metro Texas (Dallas/Austin/Houston)', order_count: 620, total_spend: 89400.0, percentage: 68 },
  { region: 'Regional Texas', order_count: 280, total_spend: 39800.0, percentage: 32 },
];

export const reportService = {
  // Sales Revenue Report
  async getRevenue(params?: { period?: string; start_date?: string; end_date?: string }): Promise<RevenueDataPoint[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await apiFetch(`/api/reports/sales/revenue${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      return json.data || json;
    } catch {
      return MOCK_REVENUE_DATA;
    }
  },

  // Top Products
  async getTopProducts(params?: { limit?: number; sort_by?: string; start_date?: string; end_date?: string }): Promise<TopProductDataPoint[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await apiFetch(`/api/reports/sales/top-products${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      return json.data || json;
    } catch {
      return MOCK_TOP_PRODUCTS;
    }
  },

  // Low Stock
  async getLowStock(threshold: number = 10): Promise<LowStockDataPoint[]> {
    try {
      const res = await apiFetch(`/api/reports/inventory/low-stock?threshold=${threshold}`);
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      return json.data || json;
    } catch {
      return MOCK_LOW_STOCK;
    }
  },

  // Inventory Summary
  async getInventorySummary(): Promise<InventorySummaryDataPoint[]> {
    try {
      const res = await apiFetch('/api/reports/inventory/summary');
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      return json.data || json;
    } catch {
      return MOCK_INVENTORY_SUMMARY;
    }
  },

  // Sales Orders Volume Report
  async getOrders(params?: { period?: string; start_date?: string; end_date?: string }): Promise<OrderStatusDataPoint[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await apiFetch(`/api/reports/sales/orders${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      return json.data || json;
    } catch {
      return MOCK_ORDER_STATUS_DATA;
    }
  },

  // Top Customers
  async getTopCustomers(params?: { limit?: number; sort_by?: 'orders' | 'spend'; start_date?: string; end_date?: string }): Promise<TopCustomerDataPoint[]> {
    try {
      const query = new URLSearchParams({
        limit: String(params?.limit || 10),
        sort_by: params?.sort_by || 'spend',
        ...(params?.start_date ? { start_date: params.start_date } : {}),
        ...(params?.end_date ? { end_date: params.end_date } : {}),
      }).toString();
      const res = await apiFetch(`/api/reports/customers/top?${query}`);
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      return json.data || json;
    } catch {
      return MOCK_TOP_CUSTOMERS;
    }
  },

  // Customer Geography
  async getCustomerGeography(params?: { start_date?: string; end_date?: string }): Promise<CustomerGeographyDataPoint[]> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await apiFetch(`/api/reports/customers/geography${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('API request failed');
      const json = await res.json();
      const data = json.data || json;
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          region: item.region || item.city_name || 'Unknown',
          order_count: Number(item.order_count) || 0,
          total_spend: Number(item.total_spend ?? item.revenue) || 0,
          percentage: item.percentage !== undefined ? Number(item.percentage) : undefined,
        }));
      }
      return data;
    } catch {
      return MOCK_CUSTOMER_GEOGRAPHY;
    }
  },

  // CSV Export with automated download and client-side fallback
  async exportCsv(type: ReportExportType, params?: { start_date?: string; end_date?: string }): Promise<void> {
    const query = new URLSearchParams(params as any).toString();
    const endpoint = `/api/reports/export/${type}${query ? `?${query}` : ''}`;
    
    try {
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brightbuy-${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Backend export unavailable, using client-side CSV generation fallback', e);
    }

    // Fallback: generate CSV client-side from mock data
    let csvContent = '';
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (type === 'sales' || type === 'revenue') {
      csvContent = 'Period,Order Count,Revenue\n' + 
        MOCK_REVENUE_DATA.map(r => `${r.period},${r.order_count},${r.revenue}`).join('\n');
    } else if (type === 'inventory') {
      csvContent = 'SKU,Product Name,Variant,Stock Quantity,Price\n' + 
        MOCK_LOW_STOCK.map(i => `"${i.variant_sku}","${i.product_name}","${i.variant_name}",${i.stock_quantity},${i.price}`).join('\n');
    } else if (type === 'customers') {
      csvContent = 'Customer ID,First Name,Last Name,Email,Orders,Total Spend\n' + 
        MOCK_TOP_CUSTOMERS.map(c => `${c.customer_id},"${c.first_name}","${c.last_name}","${c.email}",${c.order_count},${c.total_spend}`).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brightbuy-${type}-report-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
