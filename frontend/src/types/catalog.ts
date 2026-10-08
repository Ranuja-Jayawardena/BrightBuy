export interface Category {
  category_id: number;
  category_name: string;
  parent_category_id?: number | null;
  children?: Category[];
}

export interface ProductSummary {
  product_id: number;
  product_name: string;
  brand: string;
  base_sku: string;
  primary_image_id?: number | null;
  min_price: number;
  max_price: number;
  variant_count: number;
  categories: { category_id: number; category_name: string }[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_count: number;
  total_pages: number;
}

export interface GetProductsResponse {
  products: ProductSummary[];
  pagination: PaginationMeta;
}

export interface GetCategoriesResponse {
  categories: Category[];
}
