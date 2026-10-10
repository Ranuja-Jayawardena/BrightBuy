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

export interface ProductImage {
  image_id: number;
  sort_order: number;
  is_primary: boolean;
}

export interface VariantAttribute {
  attribute_name: string;
  attribute_value: string;
}

export interface ProductVariant {
  variant_id: number;
  variant_sku: string;
  variant_name: string;
  price: string | number;
  stock_quantity: number;
  attributes: VariantAttribute[];
}

export interface ProductDetail {
  product_id: number;
  product_name: string;
  brand: string;
  description: string;
  base_sku: string;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: { category_id: number; category_name: string }[];
}

export interface GetProductByIdResponse {
  product: ProductDetail;
}

