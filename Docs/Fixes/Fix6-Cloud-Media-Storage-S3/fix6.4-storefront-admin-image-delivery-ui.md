# Fix 6.4: Storefront & Admin Direct Image Delivery & Upload UI

> **Parent Group:** [Fix 6: Cloud Object Storage (AWS S3) & Media Delivery](fix6-cloud-media-storage-s3.md)  
> **Status:** In Progress  
> **Assigned To:** Member A (Storefront UI) & Member B (Admin Products UI)  
> **Depends On:** [Fix 6.3: Backend S3 Service & APIs](fix6.3-backend-s3-service-upload-apis.md)  
> **Blocks:** —  
> **Priority:** Medium  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `product_images`)  

---

## Problem & Motivation

1. **Direct Browser Uploads:** High-resolution product images should upload directly from the admin browser to AWS S3 via pre-signed URLs, providing visual progress feedback and sparing the backend container from heavy traffic.
2. **Direct Cloud CDN/S3 Rendering:** The storefront (`/`, `/products`, `/products/[id]`, `/cart`) should display image assets directly using `img.image_url` loaded from S3.
3. **Next.js Remote Domain Security:** Configure `next.config.ts` so Next.js Image components permit external AWS S3 hostnames without security warnings.

---

## Tasks

### 1. Admin Direct S3 Upload UI — Member B
- [x] In `frontend/src/app/admin/products/[id]/page.tsx`:
  - Update `handleImageUpload`:
    1. Call `POST /api/admin/products/${id}/images/presign` with `{ contentType, fileName }`.
    2. Upload file directly to S3 via PUT to pre-signed URL with real-time upload progress indicator.
    3. Call `POST /api/admin/products/${id}/images/confirm` with `{ image_url: publicUrl, sort_order, is_primary }`.
    4. Provide real-time upload progress indicator (0% to 100%) during direct S3 transfer.
  - Image gallery renders `img.image_url` directly with graceful placeholder fallback.
  - Display primary image badges, sort order inputs, and deletion confirmation modals (Fix 3.4 parity).

### 2. Next.js Remote Image Configuration & Storefront Rendering — Member A
- [ ] In `frontend/next.config.ts` (or `next.config.js`):
  - Add AWS S3 domain to `images.remotePatterns`:
    ```typescript
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: '18.208.53.186',
      },
    ],
    ```
- [ ] Storefront Image Rendering (`/products`, `/products/[id]`, `/cart`):
  - Update product components to render `product.image_url` directly.
  - Implement graceful `onError` fallback to `/placeholder-product.svg` if an image fails to load.

---

## Definition of Done

1. Admin can upload images directly to AWS S3 from `/admin/products/[id]` with real-time progress feedback.
2. Storefront product cards (`/`, `/products`, `/products/[id]`) display uploaded S3 images via direct URLs.
3. No Next.js console warnings regarding unconfigured image remote hosts.
