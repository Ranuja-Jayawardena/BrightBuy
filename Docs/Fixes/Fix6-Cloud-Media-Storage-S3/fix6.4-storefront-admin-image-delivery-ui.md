# Fix 6.4: Admin Upload & Storefront/Cart Image Delivery

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)
> **Status:** In Progress — direct upload and URL rendering code is present; revised acceptance evidence is pending
> **Owners:** B (admin upload/gallery/cart), A (storefront); C supplies catalog APIs, D supplies cart URLs
> **Depends on:** [Companion](fix6-contracts-verification-rollout.md) M2/M3/M5/M8 for mocks; 6.1–6.3 evidence for final integration
> **Blocks:** Fix 6 completion and media release
> **Issues:** F6-01, F6-08; browser coverage for F6-04–F6-07

## Baseline: present versus missing

- [x] Existing gallery has primary badges, reorder controls, deletion confirmation and an upload spinner; preserve these behaviors.
- [x] Source inspection confirms product-card/detail/cart/admin image rendering currently uses `/api/images/:id`.
- [x] Presign → direct storage upload → confirm flow implemented in the browser; retry and binding safety remain open.
- [x] Catalog/admin/cart types and rendering consume permanent URL fields.
- [ ] Actual browser CORS, retry, conflict, fallback and role flows verified.

**Code update:** The merged admin editor now calls presign, uploads with XMLHttpRequest progress, and calls confirm. Storefront and cart consume URL fields with placeholder fallbacks. Confirm identity, replay safety, browser CORS, and the revised release gates still need verification. The old wildcard `**.amazonaws.com` remote-image example was unnecessarily broad and is superseded by the exact-host rule below.

## Read and inspect first

Read [frontend rules](../../../frontend/AGENTS.md), [6.3](fix6.3-backend-s3-service-upload-apis.md), the companion's current/target API table and resolved decisions. Inspect:

- `frontend/src/app/admin/products/[id]/page.tsx` and `admin/products/new/page.tsx`.
- `frontend/src/components/catalog/ProductCard.tsx`, `app/products/page.tsx`, `app/products/[id]/page.tsx`, `app/cart/page.tsx`.
- `frontend/src/types/catalog.ts`, catalog/cart response types at actual call sites, `services/catalogService.ts`, `services/api.ts`, `store/useCartStore.ts`, `next.config.ts` and available files in `public/`.

Confirm actual file locations before edits. B coordinates shared cart types/store changes with A; D owns cart backend additions. Preserve Tailwind/shadcn, Zustand, standard fetch/Axios and existing role guards.

## Step 1 — Receive an exact backend handoff

- [ ] Obtain resolved M2/M3/M5/M8 and actual examples: method/body, upload identity, required headers, size/type limits, expiry, confirm responses/replay/errors, processing behavior if any, delete/retry semantics and authorization.
- [ ] Identify permanent URL fields precisely: list/card `primary_image_url`, detail/gallery `images[].image_url`, cart `primary_image_url`. Keep existing ID fields.
- [x] C demonstrates the migrated isolated backend; D supplies an actual cart response with the additive nullable URL (`primary_image_url` verified live with S3 URL and null fallback).
- [ ] Record stale-tab/release behavior. Mock work can start after the contract is frozen; integrated completion waits for the working backend/storage.

**Stop condition:** the server still accepts URL-only confirmation, the contract is unresolved or storage/CORS is unverified. Report the named dependency; continue independent UI/type preparation against approved mocks.

## Step 2 — Implement the upload state flow (B)

Use explicit states: idle → requesting permission → uploading → confirming/processing → complete, with recoverable errors at each stage. The state labels are UI design; wire behavior must match M8.

1. **Validate selection:** compare type and byte size to M3 before requesting permission. Show actionable errors, keep the selected file/details for retry and do not imply client checks replace server validation.
2. **Request upload permission:** use authenticated `apiFetch` for the existing presign route with the exact frozen body. Capture the server-issued identity, method, staging capability, required headers and expiry. Never log or persist the signed URL in analytics/localStorage.
3. **Send bytes directly to storage:** use a separate storage request, outside `apiFetch`/auth-refresh logic. Send only the issued method/headers/body. Never forward app cookies/Bearer headers or a guessed Content-Length. If M2 selects POST, use the returned form fields rather than a PUT implementation.
4. **Show real progress:** XMLHttpRequest upload events can report sent bytes for the chosen transport; handle noncomputable length, abort, timeout and HTTP errors. 100% uploaded means bytes sent, not that the DB image is saved. Show the confirming phase until the server accepts the image.
5. **Confirm only after storage success:** send the same upload identity and normalized metadata defined by M8. If `image_url` is retained, use the issued permanent URL exactly; do not derive it from user filenames. Respect a documented processing response/polling contract instead of assuming immediate 201.
6. **Finish from authoritative state:** update/refetch the gallery using the returned image identity. Reset file/identity only after confirmed success or an explicit new-file action. Focus/announce completion accessibly.
7. **Prevent overlapping actions:** disable duplicate clicks for the same in-flight operation, bound selected concurrency and abort/clean up browser listeners on navigation. Cancellation does not undo a committed confirm; refetch to determine outcome. Server cleanup handles abandoned identities.

Do not call the removed multipart endpoint. Preserve the existing create-product-then-manage-images flow unless a separately documented decision changes it.

## Step 3 — Make retries safe and understandable (B)

| Failure | Required behavior |
| --- | --- |
| Presign request fails or response is lost | Follow frozen issuance retry policy; do not claim an identity exists without a response; abandoned records expire safely |
| Storage fails, expires or rejects signed headers | Show upload-stage error; do not confirm; refresh permission only as M2 allows; retain the file for retry |
| Storage succeeds but confirm response is lost | Retry confirm with the same identity/body; never issue a new upload merely to recover a lost confirmation |
| Confirm receives 401 / auth refresh retries | `apiFetch` replays the exact identity/body; do not regenerate identity inside replay |
| Confirm conflicts or reports deletion/terminal state | Show frozen error and refetch; do not reattach the same object or treat every 409 as success |
| Navigation/reload interrupts confirm | Use the agreed recovery/refetch behavior; if identity retention is selected, store only allowed nonsensitive fields and clear them per M8 |
| Processing/cleanup takes time | Show accurate pending state; do not display success based solely on storage PUT or pretend public bytes vanished immediately |

- [ ] Preserve file/metadata after recoverable errors, and provide explicit retry/new-upload actions.
- [ ] Verify `apiFetch`'s automatic 401 replay with a confirm identity; the current helper reuses options, but actual integration still needs a test.
- [ ] Keep user-facing error messages free of SQL constraint text, signatures and AWS internals.

## Step 4 — Preserve gallery mutations (B)

- [ ] Keep primary badges, sort inputs and deletion modal; display permanent final URLs only after confirmation.
- [ ] Primary/reorder requests use the frozen API and handle conflicts by refetching committed state. Avoid stale optimistic badges/order after a rejected write.
- [ ] Delete success follows M8: remove/refetch the gallery row when accepted; if cleanup is pending, describe it accurately. On timeout/repeated request use the documented replay/refetch behavior.
- [ ] Handle deleting the selected primary/preview without stale selection or a broken modal. Follow M5's no-primary/promotion rule rather than inventing one in the client.
- [ ] Role loss during upload is handled on confirm; only permitted catalog staff see/use upload actions. Browser controls do not replace server authorization.

## Step 5 — Use permanent URLs throughout reads (A/B with C/D)

- [ ] Add typed URL fields without removing ID fields: `ProductSummary.primary_image_url?: string | null`, `ProductImage.image_url: string`, and the cart equivalent after D's response exists. Use the finalized API optionality; make a field required only when every supported response supplies it.
- [ ] Cards use `primary_image_url`; detail selection can continue using `image_id` while rendering the selected object's `image_url`; gallery uses each `image_url`; cart uses its additive URL.
- [ ] If old API responses need temporary compatibility, M8 explicitly defines legacy ID fallback and removal timing. On the final verified contract direct URLs are the normal path; null/missing image uses a placeholder.
- [ ] Choose or create an actual local placeholder during implementation. Confirm the asset exists; the old `/placeholder-product.svg` path was a proposed name, not proof of a shipped file.
- [ ] Handle URL load failures with a local fallback and guard against repeated onError loops. Include alt text and stable dimensions/layout. Reset fallback state when the image changes.
- [ ] Retain listing/detail/cart behavior, active-product filtering, variant selection, out-of-stock controls and staff purchase restrictions.

### Image component configuration rule

Inspect whether each caller uses native `<img>` or `next/image`. Native images do not need Next.js remotePatterns. Add remotePatterns only for actual optimized Next Image consumers, and use the exact configured S3/CDN hostname, HTTPS protocol and published-product path scope. Do not add `**.amazonaws.com` or an unrelated EC2 host. A change to the bucket/host must be coordinated with C/E and the canonical URL/deletion contract.

Run the explicit TypeScript check from the companion: the current build skips type validation, so a successful build alone does not validate new URL fields.

## Step 6 — Browser acceptance and handoff

- [ ] T05/T06/T08/T10/T12/T14/T17 browser cases pass against real isolated S3 and migrated PostgreSQL, not only mocks.
- [ ] Exercise allowed formats, empty/oversized files, storage rejection, expired URL, confirm timeout, double click, auth refresh, two tabs, abort/navigation, primary/reorder/delete conflict and stale frontend revision.
- [ ] Verify cards, detail, gallery and cart use final URLs; missing/failed image uses the local fallback without a retry loop. Both legacy server read routes remain covered by C's tests.
- [ ] Verify customer/unauthenticated/inventory-only users cannot upload and authorized staff can; keep existing cart/purchase rules.
- [ ] Run frontend lint, production build and explicit type check; record browser target/revision/origin and sanitized outcomes in the companion.
- [ ] A/B coordinate shared store/type changes; C/D confirm response compatibility; E receives stale-client and rollout evidence.

## Definition of Done

All ordered tasks and browser acceptance cases have evidence, the removed multipart upload is unused, direct URLs/fallbacks work across the named screens, and retries cannot create duplicate image rows. Close F6-01/F6-08 with links to that evidence and update both trackers. UI mocks and this documentation rewrite do not complete the item.
