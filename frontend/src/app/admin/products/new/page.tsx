'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface CategoryNode {
  category_id: number;
  category_name: string;
  children?: CategoryNode[];
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    description: '',
    base_sku: '',
    category_ids: [] as number[]
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await apiFetch('/api/admin/categories');
        if (res.ok) {
          const data = await res.json();
          const flatten = (nodes: CategoryNode[]): {id: number, name: string}[] => {
            let res: {id: number, name: string}[] = [];
            for (const n of nodes) {
              res.push({ id: n.category_id, name: n.category_name });
              if (n.children) res = res.concat(flatten(n.children));
            }
            return res;
          };
          setCategories(flatten(data.categories || []));
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);

  const handleCategoryToggle = (id: number) => {
    setFormData(prev => {
      const isSelected = prev.category_ids.includes(id);
      return {
        ...prev,
        category_ids: isSelected 
          ? prev.category_ids.filter(cId => cId !== id)
          : [...prev.category_ids, id]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        brand: formData.brand || null,
        description: formData.description || null,
      };

      const res = await apiFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      router.push(`/admin/products/${data.product.product_id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/products" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-8">Add New Product</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-2">
          <Label>Product Name *</Label>
          <Input 
            required 
            value={formData.product_name}
            onChange={e => setFormData({...formData, product_name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Base SKU *</Label>
            <Input 
              required 
              value={formData.base_sku}
              onChange={e => setFormData({...formData, base_sku: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input 
              value={formData.brand}
              onChange={e => setFormData({...formData, brand: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="border rounded-md p-4 max-h-48 overflow-y-auto grid grid-cols-2 gap-2 bg-muted/20">
            {categories.map(c => (
              <label key={c.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                <input 
                  type="checkbox"
                  checked={formData.category_ids.includes(c.id)}
                  onChange={() => handleCategoryToggle(c.id)}
                  className="rounded border-gray-300"
                />
                <span>{c.name}</span>
              </label>
            ))}
            {categories.length === 0 && <span className="text-muted-foreground text-sm col-span-2">Loading categories...</span>}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
