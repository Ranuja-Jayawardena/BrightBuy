import { GetCategoriesResponse, GetProductsResponse, GetProductByIdResponse } from "../types/catalog";
import { apiFetch } from "./api";

export const catalogService = {
  async getCategories(): Promise<GetCategoriesResponse> {
    const res = await apiFetch('/api/categories');
    if (!res.ok) {
      throw new Error('Failed to fetch categories');
    }
    return res.json();
  },

  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    brand?: string;
    sort?: string;
  }): Promise<GetProductsResponse> {
    const query = new URLSearchParams();
    
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.category_id) query.set('category_id', params.category_id.toString());
    if (params.brand && params.brand !== 'All') query.set('brand', params.brand);
    if (params.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const url = `/api/products${queryString ? `?${queryString}` : ''}`;
    
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }
    return res.json();
  },

  async getProductById(id: string | number): Promise<GetProductByIdResponse> {
    const res = await apiFetch(`/api/products/${id}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error('Failed to fetch product');
    }
    return res.json();
  }
};
