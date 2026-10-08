'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { catalogService } from '@/services/catalogService';
import { ProductDetail, ProductVariant } from '@/types/catalog';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, AlertCircle, ShoppingCart, Check, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const productId = params.id as string;
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        const data = await catalogService.getProductById(productId);
        setProduct(data.product);
        
        // Initialize default selections
        if (data.product.images?.length > 0) {
          const primary = data.product.images.find(img => img.is_primary) || data.product.images[0];
          setSelectedImageId(primary.image_id);
        }
        
        if (data.product.variants?.length > 0) {
          const firstVariant = data.product.variants[0];
          const initialAttrs: Record<string, string> = {};
          firstVariant.attributes.forEach(attr => {
            initialAttrs[attr.attribute_name] = attr.attribute_value;
          });
          setSelectedAttributes(initialAttrs);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const attributeOptions = useMemo(() => {
    if (!product?.variants) return {};
    
    const options: Record<string, Set<string>> = {};
    product.variants.forEach(variant => {
      variant.attributes.forEach(attr => {
        if (!options[attr.attribute_name]) {
          options[attr.attribute_name] = new Set();
        }
        options[attr.attribute_name].add(attr.attribute_value);
      });
    });
    
    // Convert Sets to Arrays
    const result: Record<string, string[]> = {};
    Object.keys(options).forEach(key => {
      result[key] = Array.from(options[key]).sort();
    });
    return result;
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants) return null;
    return product.variants.find(variant => 
      variant.attributes.every(attr => selectedAttributes[attr.attribute_name] === attr.attribute_value)
    ) || null;
  }, [product, selectedAttributes]);

  const handleAttributeSelect = (name: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [name]: value
    }));
    setQuantity(1); // Reset quantity on variant change
  };

  const onAddToCart = (variantId: number, qty: number) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${productId}`);
      return;
    }
    
    // Phase 5.4: B wires the actual cart API here
    alert(`Phase 5.4 hook: onAddToCart called with variantId: ${variantId}, quantity: ${qty}`);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-8">
          {error === 'Product not found' ? 'The product you are looking for does not exist or is no longer available.' : error}
        </p>
        <Link href="/products">
          <Button variant="default">Back to Products</Button>
        </Link>
      </div>
    );
  }

  const isOutOfStock = selectedVariant ? selectedVariant.stock_quantity === 0 : true;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumbs */}
      <nav className="flex text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <ChevronRight className="h-4 w-4" />
          <li><Link href="/products" className="hover:text-foreground transition-colors">Products</Link></li>
          {product.categories?.[0] && (
            <>
              <ChevronRight className="h-4 w-4" />
              <li>
                <Link href={`/products?category_id=${product.categories[0].category_id}`} className="hover:text-foreground transition-colors">
                  {product.categories[0].category_name}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left Column - Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-xl overflow-hidden relative border shadow-sm">
            {selectedImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={`/api/images/${selectedImageId}`} 
                alt={product.product_name}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>
          
          {product.images?.length > 1 && (
            <div className="grid grid-cols-5 gap-4">
              {product.images.sort((a, b) => a.sort_order - b.sort_order).map(img => (
                <button
                  key={img.image_id}
                  onClick={() => setSelectedImageId(img.image_id)}
                  className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${selectedImageId === img.image_id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={`/api/images/${img.image_id}`} 
                    alt="Thumbnail"
                    className="object-cover w-full h-full bg-muted"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Info */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-sm font-semibold tracking-wider text-primary uppercase">{product.brand}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            {product.product_name}
          </h1>
          
          <div className="mb-6 flex items-baseline gap-4">
            <span className="text-3xl font-bold">
              ${selectedVariant ? Number(selectedVariant.price).toFixed(2) : '---'}
            </span>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-8">
            {product.description}
          </p>

          <div className="w-full h-px bg-border my-6" />

          {/* Variants Selector */}
          <div className="space-y-6 flex-grow">
            {Object.keys(attributeOptions).map(attrName => (
              <div key={attrName}>
                <h3 className="text-sm font-medium text-foreground mb-3">{attrName}</h3>
                <div className="flex flex-wrap gap-2">
                  {attributeOptions[attrName].map(val => {
                    const isSelected = selectedAttributes[attrName] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => handleAttributeSelect(attrName, val)}
                        className={`px-4 py-2 text-sm font-medium rounded-md border transition-all ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                            : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full h-px bg-border my-6" />

          {/* Add to Cart Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {!selectedVariant ? (
                <span className="text-muted-foreground text-sm flex items-center gap-1"><X className="w-4 h-4" /> Unavailable combination</span>
              ) : selectedVariant.stock_quantity > 0 ? (
                <span className="text-green-600 dark:text-green-500 font-medium text-sm flex items-center gap-1">
                  <Check className="w-4 h-4" /> In Stock ({selectedVariant.stock_quantity} available)
                </span>
              ) : (
                <span className="text-destructive font-medium text-sm flex items-center gap-1">
                  <X className="w-4 h-4" /> Out of Stock
                </span>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex items-center border rounded-md h-12 w-32">
                <button 
                  className="px-4 h-full text-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock}
                >-</button>
                <div className="flex-1 text-center font-medium">{quantity}</div>
                <button 
                  className="px-4 h-full text-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                  onClick={() => setQuantity(Math.min(selectedVariant?.stock_quantity || 1, quantity + 1))}
                  disabled={isOutOfStock || quantity >= (selectedVariant?.stock_quantity || 1)}
                >+</button>
              </div>

              <Button 
                size="lg" 
                className="flex-1 h-12 text-lg font-semibold gap-2 transition-all hover:scale-[1.02]"
                disabled={isOutOfStock || !selectedVariant}
                onClick={() => selectedVariant && onAddToCart(selectedVariant.variant_id, quantity)}
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              SKU: {selectedVariant ? selectedVariant.variant_sku : product.base_sku}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
