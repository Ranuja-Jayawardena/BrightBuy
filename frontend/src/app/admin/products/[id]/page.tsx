'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  AlertCircle, 
  Save, 
  Image as ImageIcon, 
  Trash2, 
  Star, 
  Plus,
  Upload,
  Loader2,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';

type UploadStage =
  | 'idle'
  | 'validating'
  | 'requesting_permission'
  | 'uploading'
  | 'confirming'
  | 'complete'
  | 'error';

interface CategoryNode {
  category_id: number;
  category_name: string;
  children?: CategoryNode[];
}

interface ImageType {
  image_id: number;
  image_url: string;
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
  const [stockReason, setStockReason] = useState('');
  const [variantForm, setVariantForm] = useState({
    variant_sku: '',
    variant_name: '',
    price: '',
    stock_quantity: '0',
    attributes: [] as Attribute[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stagedPublicUrl, setStagedPublicUrl] = useState<string | null>(null);
  const [stagedUploadId, setStagedUploadId] = useState<string | null>(null);
  const [updatingImageId, setUpdatingImageId] = useState<number | null>(null);
  const [imageToDelete, setImageToDelete] = useState<ImageType | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  // Clean up any in-flight XHR on component unmount
  useEffect(() => {
    return () => {
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
        activeXhrRef.current = null;
      }
    };
  }, []);

  const sanitizeMediaError = (err: unknown, defaultMsg: string): string => {
    if (!err) return defaultMsg;
    const raw = err instanceof Error ? err.message : String(err);
    if (/AWS|Signature|NoSuchKey|AccessDenied|s3\.amazonaws\.com|X-Amz/i.test(raw)) {
      return 'Cloud storage communication error. Please verify your connection and try again.';
    }
    if (/duplicate key|violates|foreign key|syntax error|relation/i.test(raw)) {
      return 'Catalog database error while updating media record. Please retry.';
    }
    return raw || defaultMsg;
  };

  const handleCancelUpload = () => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    setUploadStage('idle');
    setUploadProgress(null);
    setUploadStatus('');
    setUploadError(null);
    setSelectedFile(null);
    setStagedPublicUrl(null);
    setStagedUploadId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadStage('error');
      setUploadError('Invalid format: Please select a JPEG, PNG, or WebP image.');
      setSelectedFile(null);
      setStagedPublicUrl(null);
      setStagedUploadId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size === 0) {
      setUploadStage('error');
      setUploadError('Selected file is empty (0 bytes).');
      setSelectedFile(null);
      setStagedPublicUrl(null);
      setStagedUploadId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadStage('error');
      setUploadError('File size exceeds the 5MB limit.');
      setSelectedFile(null);
      setStagedPublicUrl(null);
      setStagedUploadId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setStagedPublicUrl(null);
    setStagedUploadId(null);
    setUploadError(null);
    executeUpload(file);
  };

  const executeUpload = async (file: File) => {
    try {
      setUploadStage('requesting_permission');
      setUploadProgress(0);
      setUploadStatus('Requesting S3 pre-signed upload URL...');
      setUploadError(null);

      // 1. Request S3 Pre-signed URL
      const presignRes = await apiFetch(`/api/admin/products/${productId}/images/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: file.type,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const d = await presignRes.json().catch(() => ({}));
        throw new Error(d.message || d.error || 'Failed to authorize S3 upload');
      }

      const { uploadId, uploadUrl, publicUrl, requiredHeaders } = await presignRes.json();
      setStagedUploadId(uploadId || null);
      setStagedPublicUrl(publicUrl || null);

      // 2. Upload file directly to S3 with real-time progress indicator
      setUploadStage('uploading');
      setUploadStatus('Uploading directly to AWS S3...');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrRef.current = xhr;
        xhr.open('PUT', uploadUrl);
        const headerContentType = requiredHeaders?.['Content-Type'] || file.type;
        xhr.setRequestHeader('Content-Type', headerContentType);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            setUploadProgress(percent);
            setUploadStatus(`Uploading to S3: ${percent}%`);
          }
        };
        xhr.onload = () => {
          activeXhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Direct S3 upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => {
          activeXhrRef.current = null;
          reject(new Error('Network error during direct S3 upload'));
        };
        xhr.onabort = () => {
          activeXhrRef.current = null;
          reject(new Error('Upload was cancelled'));
        };
        xhr.send(file);
      });

      // 3. Confirm image record creation in catalog database
      await confirmUploadedImage(uploadId, publicUrl);
    } catch (err: unknown) {
      setUploadStage('error');
      const sanitized = sanitizeMediaError(err, 'Failed to upload image to cloud storage');
      setUploadError(sanitized);
    }
  };

  const confirmUploadedImage = async (uploadId?: string | null, publicUrl?: string | null) => {
    try {
      setUploadStage('confirming');
      setUploadStatus('Registering image in catalog database...');
      setUploadError(null);

      const targetUploadId = uploadId || stagedUploadId;
      const targetPublicUrl = publicUrl || stagedPublicUrl;

      const sortOrder = product?.images?.length || 0;
      const isPrimary = !product?.images || product.images.length === 0;

      const confirmPayload: Record<string, unknown> = {
        sort_order: sortOrder,
        is_primary: isPrimary,
      };

      if (targetUploadId) {
        confirmPayload.uploadId = targetUploadId;
      }
      if (targetPublicUrl) {
        confirmPayload.image_url = targetPublicUrl;
      }

      const confirmRes = await apiFetch(`/api/admin/products/${productId}/images/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmPayload),
      });

      if (!confirmRes.ok) {
        const d = await confirmRes.json().catch(() => ({}));
        throw new Error(d.message || d.error || 'Failed to register image in catalog');
      }

      setUploadStage('complete');
      setUploadStatus('Image registered successfully!');
      setSelectedFile(null);
      setStagedPublicUrl(null);
      setStagedUploadId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await fetchData();

      setTimeout(() => {
        setUploadStage('idle');
        setUploadStatus('');
        setUploadProgress(null);
      }, 1800);
    } catch (err: unknown) {
      setUploadStage('error');
      const sanitized = sanitizeMediaError(err, 'Failed to register image in catalog database');
      setUploadError(sanitized);
    }
  };

  const handleSetPrimaryImage = async (imageId: number) => {
    if (updatingImageId !== null || uploadStage === 'uploading' || uploadStage === 'confirming') return;
    try {
      setUpdatingImageId(imageId);
      const res = await apiFetch(`/api/admin/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to set primary image');
      }
      await fetchData();
    } catch (err: unknown) {
      alert(sanitizeMediaError(err, 'Failed to set primary image'));
      await fetchData();
    } finally {
      setUpdatingImageId(null);
    }
  };

  const handleUpdateSortOrder = async (imageId: number, sortOrder: number) => {
    if (updatingImageId !== null || uploadStage === 'uploading' || uploadStage === 'confirming') return;
    try {
      setUpdatingImageId(imageId);
      const res = await apiFetch(`/api/admin/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: sortOrder })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update sort order');
      }
      await fetchData();
    } catch (err: unknown) {
      alert(sanitizeMediaError(err, 'Failed to update sort order'));
      await fetchData();
    } finally {
      setUpdatingImageId(null);
    }
  };

  const handleConfirmDeleteImage = async () => {
    if (!imageToDelete || deletingImageId !== null) return;
    try {
      setDeletingImageId(imageToDelete.image_id);
      const res = await apiFetch(`/api/admin/images/${imageToDelete.image_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete image');
      }
      setImageToDelete(null);
      await fetchData();
    } catch (err: unknown) {
      alert(sanitizeMediaError(err, 'Failed to delete image'));
      await fetchData();
    } finally {
      setDeletingImageId(null);
      setImageToDelete(null);
    }
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...variantForm,
        variant_name: variantForm.variant_name || null,
        price: Number(variantForm.price),
        stock_quantity: Number(variantForm.stock_quantity),
        ...(editingVariant && Number(variantForm.stock_quantity) !== editingVariant.stock_quantity
          ? { reason: stockReason.trim() }
          : {})
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
        throw new Error(errData.message || errData.error || 'Failed to save variant');
      }

      setIsVariantModalOpen(false);
      setEditingVariant(null);
      setStockReason('');
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

  const handleToggleProductActive = async () => {
    if (!product) return;
    const nextStatus = !product.is_active;
    setProduct(prev => prev ? { ...prev, is_active: nextStatus } : null);
    try {
      const res = await apiFetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to update product status');
      }
    } catch (err: unknown) {
      setProduct(prev => prev ? { ...prev, is_active: !nextStatus } : null);
      const message = err instanceof Error ? err.message : 'Failed to update product status';
      setError(message);
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
        <div className="flex items-center gap-2.5">
          <Switch
            checked={product.is_active}
            disabled={isSaving}
            onCheckedChange={handleToggleProductActive}
            aria-label="Toggle product active status"
          />
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.is_active ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}`}>
            {product.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
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
                setStockReason('');
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
                      setStockReason('');
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {product.images.sort((a,b) => a.sort_order - b.sort_order).map(img => (
                <div 
                  key={img.image_id} 
                  className={`relative group border rounded-lg overflow-hidden bg-muted/20 flex flex-col ${
                    img.is_primary ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-background">
                    <img 
                      src={img.image_url || `/api/images/${img.image_id}`} 
                      alt="Product" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-product.svg';
                      }}
                    />
                    
                    {img.is_primary && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Star className="w-3 h-3 fill-current" /> Primary
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2 p-2">
                      {!img.is_primary && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          disabled={updatingImageId === img.image_id}
                          onClick={() => handleSetPrimaryImage(img.image_id)}
                          className="w-28 text-xs"
                        >
                          {updatingImageId === img.image_id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Star className="w-3 h-3 mr-1" />
                          )}
                          Set Primary
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => setImageToDelete(img)}
                        className="w-28 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* Image Metadata / Sort Order Controls */}
                  <div className="p-2.5 border-t bg-card flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-medium">Order:</span>
                      <input 
                        type="number" 
                        min="0"
                        defaultValue={img.sort_order}
                        key={`${img.image_id}-${img.sort_order}`}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val !== img.sort_order && !isNaN(val)) {
                            handleUpdateSortOrder(img.image_id, val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Number((e.target as HTMLInputElement).value);
                            if (val !== img.sort_order && !isNaN(val)) {
                              handleUpdateSortOrder(img.image_id, val);
                            }
                          }
                        }}
                        disabled={updatingImageId === img.image_id}
                        className="w-14 h-7 px-2 rounded border text-center font-mono text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {img.is_primary ? (
                      <span className="text-[11px] font-semibold text-primary">Primary Media</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Gallery</span>
                    )}
                  </div>
                </div>
              ))}
              {product.images.length === 0 && (
                <p className="text-sm text-muted-foreground italic col-span-full py-4 text-center">
                  No images uploaded yet.
                </p>
              )}
            </div>

            {/* Upload Zone / State Display */}
            {uploadStage === 'error' ? (
              <div className="border-2 border-dashed border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 rounded-lg p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                    {stagedUploadId || stagedPublicUrl ? 'Registration Failed' : 'Upload Failed'}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 max-w-sm mx-auto">
                    {uploadError || 'An error occurred during image processing.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {stagedUploadId || stagedPublicUrl ? (
                    <Button 
                      size="sm" 
                      onClick={() => confirmUploadedImage(stagedUploadId, stagedPublicUrl)}
                      className="gap-1.5 text-xs shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Registration
                    </Button>
                  ) : selectedFile ? (
                    <Button 
                      size="sm" 
                      onClick={() => executeUpload(selectedFile)}
                      className="gap-1.5 text-xs shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Upload
                    </Button>
                  ) : null}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCancelUpload}
                    className="text-xs"
                  >
                    Cancel / Choose New File
                  </Button>
                </div>
              </div>
            ) : uploadStage === 'complete' ? (
              <div className="border-2 border-dashed border-green-300 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 rounded-lg p-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto animate-in zoom-in-75 duration-200" />
                <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                  {uploadStatus || 'Image registered successfully!'}
                </p>
                <p className="text-xs text-muted-foreground">Gallery updated</p>
              </div>
            ) : uploadStage === 'idle' ? (
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload image</p>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP up to 5MB (Direct S3)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileSelect} 
                />
              </div>
            ) : (
              /* In-flight states: validating, requesting_permission, uploading, confirming */
              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/40 space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {uploadStatus || 'Processing image...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploadStage === 'requesting_permission' && 'Authorizing S3 pre-signed upload'}
                    {uploadStage === 'uploading' && 'Transferring bytes directly to cloud storage'}
                    {uploadStage === 'confirming' && 'Saving image metadata into catalog'}
                  </p>
                </div>
                {uploadProgress !== null && uploadStage === 'uploading' && (
                  <div className="w-full max-w-xs mx-auto space-y-1">
                    <div className="bg-muted rounded-full h-2 overflow-hidden border">
                      <div 
                        className="bg-primary h-full transition-all duration-150 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{uploadProgress}%</p>
                  </div>
                )}
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelUpload}
                    className="text-xs text-muted-foreground hover:text-foreground h-7"
                  >
                    Cancel Upload
                  </Button>
                </div>
              </div>
            )}
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
              {editingVariant && Number(variantForm.stock_quantity) !== editingVariant.stock_quantity && (
                <div className="space-y-2">
                  <Label htmlFor="stock-reason">Reason for stock change *</Label>
                  <Input
                    id="stock-reason"
                    required
                    maxLength={255}
                    value={stockReason}
                    onChange={e => setStockReason(e.target.value)}
                  />
                </div>
              )}
              
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

      {/* Image Deletion Confirmation Modal */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl max-w-sm w-full p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
            <h3 className="text-lg font-bold">Delete Product Image?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to permanently remove this image from the product gallery? This action cannot be undone.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border aspect-video max-h-36 bg-muted/20 flex items-center justify-center">
              <img 
                src={imageToDelete.image_url || `/api/images/${imageToDelete.image_id}`} 
                alt="Image to delete" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-product.svg';
                }}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={deletingImageId !== null}
                onClick={() => setImageToDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                disabled={deletingImageId !== null}
                onClick={handleConfirmDeleteImage}
              >
                {deletingImageId !== null ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Image'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
