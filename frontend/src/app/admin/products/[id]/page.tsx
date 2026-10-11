'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  AlertCircle, 
  Save, 
  Image as ImageIcon, 
  Trash2, 
  Star, 
  Plus,
  Upload
} from 'lucide-react';

interface CategoryNode {
  category_id: number;
  category_name: string;
  children?: CategoryNode[];
}

interface ImageType {
  image_id: number;
  sort_order: number;
  is_primary: boolean;
}

interface Attribute {
  attribute_name: string;
  attribute_value: string;
}

interface Variant {
  variant_id: number;
  variant_sku: string;
  variant_name: string | null;
  price: string | number;
  stock_quantity: number;
  is_active: boolean;
  attributes: Attribute[];
}

interface ProductDetail {
  product_id: number;
  product_name: string;
  brand: string | null;
  description: string | null;
  base_sku: string;
  is_active: boolean;
  categories: { category_id: number; category_name: string }[];
  images: ImageType[];
  variants: Variant[];
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    description: '',
    base_sku: '',
    category_ids: [] as number[]
  });
  const [isSaving, setIsSaving] = useState(false);

  // Variant modal state
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState({
    variant_sku: '',
    variant_name: '',
    price: '',
    stock_quantity: '0',
    attributes: [] as Attribute[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        apiFetch(`/api/admin/products/${productId}`),
        apiFetch('/api/admin/categories')
      ]);

      if (!prodRes.ok) throw new Error('Failed to load product');
      if (!catRes.ok) throw new Error('Failed to load categories');

      const prodData = await prodRes.json();
      const catData = await catRes.json();

      setProduct(prodData.product);
      setFormData({
        product_name: prodData.product.product_name || '',
        brand: prodData.product.brand || '',
        description: prodData.product.description || '',
        base_sku: prodData.product.base_sku || '',
        category_ids: prodData.product.categories?.map((c: any) => c.category_id) || []
      });

      const flatten = (nodes: CategoryNode[]): {id: number, name: string}[] => {
        let res: {id: number, name: string}[] = [];
        for (const n of nodes) {
          res.push({ id: n.category_id, name: n.category_name });
          if (n.children) res = res.concat(flatten(n.children));
        }
        return res;
      };
      setCategories(flatten(catData.categories || []));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  const handleCategoryToggle = (id: number) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter(cId => cId !== id)
        : [...prev.category_ids, id]
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        brand: formData.brand || null,
        description: formData.description || null,
      };
      const res = await apiFetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update product details');
      fetchData(); // reload
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await apiFetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header; fetch will set it with the boundary for FormData
      });
      if (!res.ok) throw new Error('Failed to upload image');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetPrimaryImage = async (imageId: number) => {
    try {
      const res = await apiFetch(`/api/admin/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true })
      });
      if (!res.ok) throw new Error('Failed to set primary image');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Delete this image?')) return;
    try {
      const res = await apiFetch(`/api/admin/images/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...variantForm,
        variant_name: variantForm.variant_name || null,
        price: Number(variantForm.price),
        stock_quantity: Number(variantForm.stock_quantity)
      };

      let res;
      if (editingVariant) {
        res = await apiFetch(`/api/admin/variants/${editingVariant.variant_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch(`/api/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save variant');
      }

      setIsVariantModalOpen(false);
      setEditingVariant(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVariant = async (id: number) => {
    if (!confirm('Deactivate this variant?')) return;
    try {
      const res = await apiFetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate variant');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading product details...</div>;
  if (!product) return <div className="p-12 text-center text-red-500">Product not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/admin/products" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Products
        </Link>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {product.is_active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Details */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Basic Details</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input required value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base SKU *</Label>
                  <Input required value={formData.base_sku} onChange={e => setFormData({...formData, base_sku: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Variants</h2>
              <Button size="sm" onClick={() => {
                setEditingVariant(null);
                setVariantForm({ variant_sku: '', variant_name: '', price: '', stock_quantity: '0', attributes: [] });
                setIsVariantModalOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" /> Add Variant
              </Button>
            </div>
            
            <div className="space-y-3">
              {product.variants.map(v => (
                <div key={v.variant_id} className={`flex items-center justify-between p-3 border rounded-lg ${v.is_active ? 'bg-background' : 'bg-muted opacity-60'}`}>
                  <div>
                    <p className="font-semibold">{v.variant_sku} {v.variant_name && <span className="text-muted-foreground font-normal">- {v.variant_name}</span>}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ${Number(v.price).toFixed(2)} | Stock: {v.stock_quantity}
                    </p>
                    {v.attributes.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {v.attributes.map(attr => (
                          <span key={attr.attribute_name} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded uppercase">
                            {attr.attribute_name}: {attr.attribute_value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingVariant(v);
                      setVariantForm({
                        variant_sku: v.variant_sku,
                        variant_name: v.variant_name || '',
                        price: String(v.price),
                        stock_quantity: String(v.stock_quantity),
                        attributes: [...v.attributes]
                      });
                      setIsVariantModalOpen(true);
                    }}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteVariant(v.variant_id)}>
                      Deactivate
                    </Button>
                  </div>
                </div>
              ))}
              {product.variants.length === 0 && <p className="text-sm text-muted-foreground italic">No variants yet.</p>}
            </div>
          </div>

        </div>

        {/* Right Col - Images */}
        <div className="space-y-8">
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" /> Images
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {product.images.sort((a,b) => a.sort_order - b.sort_order).map(img => (
                <div key={img.image_id} className={`relative group border rounded-lg overflow-hidden aspect-square ${img.is_primary ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                  <img src={`/api/products/images/${img.image_id}`} alt="Product" className="w-full h-full object-cover" />
                  
                  {img.is_primary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground p-1 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                    {!img.is_primary && (
                      <Button size="sm" variant="secondary" onClick={() => handleSetPrimaryImage(img.image_id)}>
                        Set Primary
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteImage(img.image_id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Click to upload image</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG, PNG up to 2MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleImageUpload} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* Variant Modal (Simplistic inline) */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingVariant ? 'Edit Variant' : 'New Variant'}</h2>
            <form onSubmit={handleSaveVariant} className="space-y-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input required value={variantForm.variant_sku} onChange={e => setVariantForm({...variantForm, variant_sku: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Variant Name</Label>
                <Input value={variantForm.variant_name} onChange={e => setVariantForm({...variantForm, variant_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price *</Label>
                  <Input required type="number" step="0.01" min="0" value={variantForm.price} onChange={e => setVariantForm({...variantForm, price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Stock Quantity *</Label>
                  <Input required type="number" min="0" value={variantForm.stock_quantity} onChange={e => setVariantForm({...variantForm, stock_quantity: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <Label>Attributes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    setVariantForm({
                      ...variantForm,
                      attributes: [...variantForm.attributes, { attribute_name: '', attribute_value: '' }]
                    })
                  }}>
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {variantForm.attributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="Name (e.g. Size)" required value={attr.attribute_name} onChange={e => {
                        const newAttrs = [...variantForm.attributes];
                        newAttrs[idx].attribute_name = e.target.value;
                        setVariantForm({...variantForm, attributes: newAttrs});
                      }} />
                      <Input placeholder="Value (e.g. XL)" required value={attr.attribute_value} onChange={e => {
                        const newAttrs = [...variantForm.attributes];
                        newAttrs[idx].attribute_value = e.target.value;
                        setVariantForm({...variantForm, attributes: newAttrs});
                      }} />
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => {
                        const newAttrs = [...variantForm.attributes];
                        newAttrs.splice(idx, 1);
                        setVariantForm({...variantForm, attributes: newAttrs});
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsVariantModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save Variant</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
