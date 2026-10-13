# Fix 6.4: Admin Upload & Storefront/Cart Image Delivery

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)
> **Status:** Complete — Verified with uploadId staging promotion, direct S3 upload, idempotent registration replay, and direct storefront/cart S3 delivery
> **Owners:** B (admin upload/gallery/cart), A (storefront); C supplies catalog APIs, D supplies cart URLs
> **Depends on:** [Companion](fix6-contracts-verification-rollout.md) M2/M3/M5/M8 for mocks; 6.1–6.3 evidence for final integration
> **Blocks:** Fix 6 completion and media release
> **Issues:** F6-01, F6-08 resolved; browser coverage for F6-04–F6-07 verified

## Baseline: present versus missing

- [x] Existing gallery has primary badges, reorder controls, deletion confirmation and an upload spinner; preserve these behaviors.
- [x] Source inspection confirms product-card/detail/cart/admin image rendering currently uses permanent S3 URLs with `/placeholder-product.svg` fallback.
- [x] Presign → direct storage upload → confirm flow implemented in the browser with `uploadId` binding; retry and replay safety verified.
- [x] Catalog/admin/cart types and rendering consume permanent URL fields.
- [x] Browser CORS, retry, conflict, fallback and role flows verified.

**Code update:** The admin editor (`frontend/src/app/admin/products/[id]/page.tsx`) requests presign, extracts `{ uploadId, uploadUrl, publicUrl, requiredHeaders }`, uploads directly to S3 with XMLHttpRequest progress, and confirms with `{ uploadId, sort_order, is_primary }`. Storefront (`ProductCard.tsx`, `products/[id]/page.tsx`) and cart (`cart/page.tsx`) consume direct S3 URL fields with `/placeholder-product.svg` fallback. TypeScript typecheck passes with 0 errors (`npx tsc --noEmit`).

## Read and inspect first

Read [frontend rules](../../../frontend/AGENTS.md), [6.3](fix6.3-backend-s3-service-upload-apis.md), the companion's current/target API table and resolved decisions. Inspect:

- `frontend/src/app/admin/products/[id]/page.tsx` and `admin/products/new/page.tsx`.
- `frontend/src/components/catalog/ProductCard.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`, `app/cart/page.tsx`.
- `frontend/src/types/catalog.ts`, catalog/cart response types at actual call sites, `services/catalogService.ts`, `services/api.ts`, `store/useCartStore.ts`, `next.config.ts` and available files in `public/`.

## Step 1 — Receive an exact backend handoff

- [x] Obtain resolved M2/M3/M5/M8 and actual examples: method/body, upload identity (`uploadId`), required headers (`Content-Type`), size/type limits (5MB, JPEG/PNG/WebP), 300s expiry, confirm responses (201 created / 200 replayed), and delete semantics.
- [x] Identify permanent URL fields precisely: list/card `primary_image_url`, detail/gallery `images[].image_url`, cart `primary_image_url`. Keep existing ID fields.
- [x] C demonstrates the migrated isolated backend; D supplies an actual cart response with the additive nullable URL (`primary_image_url` verified live with S3 URL and null fallback).
- [x] Record stale-tab/release behavior. Direct JSON PUT/confirm is the authoritative path.

## Step 2 — Implement the upload state flow (B)

Use explicit states: idle → requesting_permission → uploading → confirming → complete, with recoverable errors at each stage:

1. **Validate selection:** Capped strictly at 5MB (`MAX_FILE_SIZE = 5 * 1024 * 1024`), allowed types `['image/jpeg', 'image/png', 'image/webp']`, empty files (0 bytes) rejected.
2. **Request upload permission:** Authenticated `apiFetch` calls `POST /api/admin/products/:id/images/presign` with `{ contentType, fileName, fileSize }`. Server issues `uploadId`, `uploadUrl`, `publicUrl`, and `requiredHeaders`.
3. **Send bytes directly to storage:** Direct XMLHttpRequest `PUT` to `uploadUrl` with `Content-Type` matching server contract.
4. **Show real progress:** XMLHttpRequest upload progress tracks percentage sent (`0-100%`).
5. **Confirm only after storage success:** Calls `POST /api/admin/products/:id/images/confirm` with `{ uploadId, sort_order, is_primary }`.
6. **Finish from authoritative state:** Refetches product gallery data, clears file selection and staged identifiers on success.
7. **Prevent overlapping actions:** UI buttons disabled during in-flight operations; active XHR aborted on unmount or cancellation.

## Step 3 — Make retries safe and understandable (B)

- [x] Preserve file/metadata after recoverable errors, and provide explicit retry/new-upload actions.
- [x] Idempotent retry: if upload succeeded but registration failed, "Retry Registration" re-calls `/confirm` with `uploadId` without re-uploading bytes to S3.
- [x] User-facing error messages sanitized to remove raw SQL and AWS internal details.

## Step 4 — Preserve gallery mutations (B)

- [x] Keep primary badges, sort inputs and deletion modal; display permanent final URLs only after confirmation.
- [x] Primary/reorder requests use the frozen API (`PUT /api/admin/images/:id`) and handle conflicts by refetching committed state.
- [x] Delete requests (`DELETE /api/admin/images/:id`) remove row and trigger asynchronous S3 cleanup.
- [x] Role loss during upload is handled on confirm; only permitted catalog staff see/use upload actions.

## Step 5 — Use permanent URLs throughout reads (A/B with C/D)

- [x] Typed URL fields added: `ProductSummary.primary_image_url?: string | null`, `ProductImage.image_url?: string | null`, and `CartItem.primary_image_url?: string | null`.
- [x] Cards use `primary_image_url`; detail gallery uses `images[].image_url`; cart uses `primary_image_url`.
- [x] Fallback image `/placeholder-product.svg` verified present in `frontend/public/` and rendered on `onError`.
- [x] Next.js remotePatterns configured for `brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com` path `/products/**`.
- [x] Explicit TypeScript check (`npx tsc --noEmit`) passes with 0 errors.

## Step 6 — Browser acceptance and handoff

- [x] T05/T06/T08/T10/T12/T14/T17 browser cases verified against real isolated S3 and migrated PostgreSQL.
- [x] Allowed formats (JPEG, PNG, WebP) and size limits (5MB) enforced in UI.
- [x] Storefront cards, detail gallery, and cart render direct S3 URLs with graceful fallback.
- [x] Frontend TypeScript type check passes with 0 errors.
- [x] Fix 6.4 verified complete and ready for release.

## Definition of Done

All ordered tasks and browser acceptance cases have evidence, the removed multipart upload is unused, direct URLs/fallbacks work across the named screens, and retries cannot create duplicate image rows. F6-01 and F6-08 are resolved and verified. Fix 6.4 is complete.
