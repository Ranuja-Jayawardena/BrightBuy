import { GetCategoriesResponse, GetProductsResponse } from "../types/catalog";
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
  }
};
