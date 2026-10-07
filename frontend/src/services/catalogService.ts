import { GetCategoriesResponse, GetProductsResponse, ProductSummary } from "../types/catalog";

// Mock Data
const MOCK_CATEGORIES = [
  {
    category_id: 1,
    category_name: "Electronics",
    children: [
      { category_id: 4, category_name: "Smartphones" },
      { category_id: 5, category_name: "Laptops" },
      { category_id: 6, category_name: "Audio" }
    ]
  },
  {
    category_id: 2,
    category_name: "Clothing",
    children: [
      { category_id: 7, category_name: "Men's Apparel" },
      { category_id: 8, category_name: "Women's Apparel" }
    ]
  },
  {
    category_id: 3,
    category_name: "Home & Kitchen",
    children: [
      { category_id: 9, category_name: "Appliances" },
      { category_id: 10, category_name: "Furniture" }
    ]
  }
];

const MOCK_PRODUCTS: ProductSummary[] = Array.from({ length: 45 }).map((_, i) => {
  const brands = ["Samsung", "Apple", "Sony", "Nike", "Adidas", "LG"];
  const brand = brands[i % brands.length];
  const categories = MOCK_CATEGORIES.flatMap(c => c.children || []);
  const category = categories[i % categories.length];
  
  return {
    product_id: i + 1,
    product_name: `${brand} Awesome Product ${i + 1}`,
    brand,
    base_sku: `SKU-${brand.toUpperCase().substring(0, 3)}-${i.toString().padStart(3, "0")}`,
    min_price: 49.99 + (i * 10),
    max_price: 89.99 + (i * 10),
    variant_count: 2 + (i % 4),
    categories: [{ category_id: category.category_id, category_name: category.category_name }]
  };
});

export const catalogService = {
  async getCategories(): Promise<GetCategoriesResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return { categories: MOCK_CATEGORIES };
  },

  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    brand?: string;
    sort?: string;
  }): Promise<GetProductsResponse> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let filtered = [...MOCK_PRODUCTS];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.product_name.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q)
      );
    }

    if (params.category_id) {
      filtered = filtered.filter(p => 
        p.categories.some(c => c.category_id === Number(params.category_id))
      );
    }

    if (params.brand && params.brand !== 'All') {
      filtered = filtered.filter(p => p.brand === params.brand);
    }

    if (params.sort) {
      switch (params.sort) {
        case "price_asc":
          filtered.sort((a, b) => a.min_price - b.min_price);
          break;
        case "price_desc":
          filtered.sort((a, b) => b.min_price - a.min_price);
          break;
        case "name_asc":
          filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
          break;
        case "name_desc":
          filtered.sort((a, b) => b.product_name.localeCompare(a.product_name));
          break;
      }
    }

    const page = params.page || 1;
    const limit = params.limit || 12;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const paginated = filtered.slice(start, end);

    return {
      products: paginated,
      pagination: {
        page,
        limit,
        total_count: filtered.length,
        total_pages: Math.ceil(filtered.length / limit)
      }
    };
  }
};
