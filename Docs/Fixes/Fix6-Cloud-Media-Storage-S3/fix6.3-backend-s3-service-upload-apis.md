# Fix 6.3: Backend Upload, Confirmation, Delivery & Deletion

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)
> **Status:** In Progress — S3 API code exists; lifecycle, concurrency and test corrections pending
> **Owner:** C; E reviews storage/worker/release, D adds cart read fields
> **Depends on:** [Companion](fix6-contracts-verification-rollout.md) resolved M2–M6/M8; isolated 6.1 resources and compatible 6.2 schema
> **Blocks:** 6.4 final integration and media release
> **Issues:** F6-04–F6-09; supports F6-01/F6-10

## Evidence: done, incorrect and missing

- [x] AWS SDK v3 S3 client/presigner dependencies exist in `backend/package.json`.
- [x] `s3Service.js` generates 300-second PUT URLs, canonical public URLs, HEAD existence checks and deletes.
- [x] `adminRoutes.js` exposes presign/confirm and retains image update/delete, protected by auth/admin/catalog-manager guards.
- [x] Product/admin models and services select/return URL fields; the image endpoint redirects to the stored URL; multipart middleware is removed.
- [x] Existing Jest media tests were changed to URL mocks; the preceding review passed 139 Jest tests overall.
- [ ] Durable issued-upload identity, authoritative content/size verification, immutable finalization and idempotent confirm implemented.
- [ ] Safe durable deletion/orphan cleanup and product-level image locking implemented. Product row locking is now present for create/update/delete; durable cleanup remains open.
- [ ] Real S3/PostgreSQL failure/concurrency tests passed; obsolete standalone product test corrected. The standalone test is corrected, but real integration evidence remains open.

**Needs correction:** URL-prefix validation and HEAD existence alone permit reattaching an existing object and do not prove an issued upload or valid bytes. Repeated confirmation can insert another row. Deletion commits the DB removal before S3 deletion, losing a durable retry source on failure. Image create/update/delete now take a product row lock in a transaction, but this has not been verified with concurrent PostgreSQL clients. Keep the useful canonical URL validation, role guards and partial unique index while correcting the remaining gaps.

## Files to inspect before editing

`backend/src/services/s3Service.js`, `services/adminProductService.js`, `models/adminProductModel.js`, `controllers/adminProductController.js`, `routes/adminRoutes.js`, `models/productModel.js`, `services/productService.js`, `models/imageModel.js`, `services/imageService.js`, `controllers/imageController.js`, `routes/productRoutes.js`, `routes/imageRoutes.js`, `tests/s3Service.test.js`, `tests/productBackend.test.js`, `tests/imageRouteAlias.test.js`, and `test/product-validation.test.js`.

D owns `models/cartModel.js` and the corresponding cart controller/response mapping; agree that small read-contract handoff before editing shared files. E owns migration allocation, worker operation/deployment and grants. Do not create a second cleanup mechanism without auditing existing scheduling facilities and choosing one owner.

## Step 1 — Freeze concrete endpoint contracts

- [ ] Record the current baseline table in the companion and complete M2–M6/M8. Hand exact examples to B/A/D before dependent UI changes.
- [ ] Preserve URL paths and existing success fields where possible, including image IDs and `image_url`/primary/sort fields. New fields must be explicit additions; no broad response redesign.
- [ ] Retain HttpOnly-cookie auth and the actual catalog-manager/super-admin permission semantics. Authenticated inventory-only users and customers must remain forbidden.
- [ ] Define strict numeric ID bounds consistent with PostgreSQL integer IDs, accepted booleans/order ranges, MIME values, filename length and byte limits. Reject malformed body/IDs before SDK calls.
- [ ] Freeze what happens to stale tabs and the removed multipart route. The current frontend is not compatible; choose coordinated deployment or an actionable upgrade-required response, not an insecure fallback.

### Proposed target examples — not implemented

The following illustrates the M2/M4 direction. C/E/B must resolve exact fields, signed headers, checksum encoding, statuses and validation before treating it as the API contract. Keep existing fields where compatible; `fileKey` below identifies staging, while `publicUrl` identifies the eventual published object and is not readable until finalization.

```http
POST /api/admin/products/12/images/presign
Content-Type: application/json
Cookie: access_token=<existing authenticated session>

{
  "contentType": "image/webp",
  "fileName": "sneakers-front.webp",
  "fileSize": 123456
}
```

```json
{
  "uploadId": "<server-issued-id>",
  "uploadUrl": "<temporary-signed-staging-URL-do-not-log>",
  "fileKey": "uploads/12/<server-issued-id>.webp",
  "publicUrl": "https://<configured-bucket>.s3.<region>.amazonaws.com/products/12/<server-issued-id>.webp",
  "method": "PUT",
  "requiredHeaders": { "Content-Type": "image/webp" },
  "expiresAt": "<UTC-expiry>"
}
```

Checksum inputs/headers may be added by M2; this sample intentionally does not invent a working signed request. B sends exactly the issued method/headers, not guessed AWS headers. Do not let caller-supplied filenames or keys select arbitrary storage paths.

```http
POST /api/admin/products/12/images/confirm
Content-Type: application/json
Cookie: access_token=<existing authenticated session>

{
  "uploadId": "<server-issued-id>",
  "image_url": "<issued-permanent-publicUrl>",
  "sort_order": 0,
  "is_primary": true
}
```

The server derives the final URL from its upload record; if `image_url` is retained for compatibility, it must match that record and cannot independently authorize attachment. Proposed first success is 201 `{ "image": { "image_id": 41, "product_id": 12, "image_url": "<permanent-url>", "sort_order": 0, "is_primary": true, "created_at": "<timestamp>" } }`; replay returns the same image identity (proposed 200). M8 must freeze synchronous completion versus a documented processing/polling response. Do not add a hidden worker and then make the UI assume immediate 201.

A representative proposed conflict body is `{ "error": "upload_conflict", "message": "This upload was already confirmed with different details.", "statusCode": 409 }`. Freeze all error names/statuses in M8 and publish actual samples before UI integration. Expected conflicts must not leak SQL, bucket policy details or AWS credentials; unexpected errors remain failures.

## Step 2 — Issue a durable upload identity

- [ ] Verify product existence and role/issuer, normalize metadata and enforce M3 admission/rate limits before issuing credentials. Recheck current authorization at confirmation.
- [ ] Create the M4 record with product/issuer, server-owned staging/final keys, expected metadata, expiry and initial state before returning the signed capability. Handle signing failure without stranding an unbounded pending record.
- [ ] Return actual required headers and expiry. If PUT is retained, prove its constraints rather than assuming the browser can set restricted headers such as Content-Length. If POST is selected, update dependencies/contract/UI together and test the signed policy.
- [ ] Never sign a browser write to an existing published key. Five-minute expiry limits credential duration but does not make the URL single-use or revoke it when staff loses a role.
- [ ] Bound outstanding upload identities and implement expiry cleanup. Document retry after lost presign response; abandoning an identity must be safe.

## Step 3 — Verify and finalize without a cross-system race

- [ ] Claim the issued upload with a short transaction and recoverable lease/state per M4; do not hold DB locks during S3 requests.
- [ ] Verify actual object exists, belongs to the issued product/upload, satisfies byte/type policy, and matches the pinned version/checksum. Distinguish not-yet-uploaded from IAM denial/timeouts; a 403 is not proof of a missing object.
- [ ] Use bounded streaming/worker resources for required byte verification; HEAD ContentType is caller-controlled metadata, not proof of file format. State the guarantee accurately if using signatures instead of full decoding.
- [ ] Publish exactly the validated bytes to the immutable final key. Use the chosen source-version/conditional mechanism and retry safely when the source changes; test overwrite after validation.
- [ ] In a short final DB transaction, acquire the M5 product gate, recheck upload lease/state, authorization/product policy as specified, and attach only once. Persist result image ID and normalized confirmation input with the metadata change.
- [ ] Enforce object/upload uniqueness in the database. Check-then-insert in JavaScript alone is insufficient. Preflight legacy duplicate URLs before enabling constraints.
- [ ] Align the canonical key parser with 6.2's verified migration keys. The current UUID/primary/secondary-only regex does not accept proposed `migrated-{imageId}-{contentDigest}` keys. Record the exact supported key grammar and migration provenance; do not fix this by accepting arbitrary URLs or arbitrary bucket keys.
- [ ] Replay after lost response/restart returns the same result identity, even if the original upload URL has since expired. Different confirmation inputs conflict; replay must not repeat primary resets or undo later metadata edits.
- [ ] If the image was later deleted, return the frozen terminal response; never resurrect it. If publication succeeds but attachment fails, durable state supports retry or cleanup without exposing a broken row.
- [ ] Handle competing confirmation, expiry, deletion and worker lease recovery explicitly. A stale worker must not finalize a terminal identity.

## Step 4 — Serialize image mutations and preserve catalog behavior

- [ ] Confirm, primary changes, reorder, delete and any hard product-delete path use the same product gate before image/upload rows. For an image-only request, resolve product ID, then lock product and re-read the image under that gate before mutation.
- [ ] Recompute preserved fields from the locked row. The current unlocked read can cause a sort-only request to overwrite a concurrent primary change.
- [ ] Retain `idx_product_images_single_primary`; lock serialization prevents avoidable races and the constraint remains the final invariant. Map known named conflicts, not all SQL errors, to the frozen API response.
- [ ] Coordinate product-before-image order with Fix 8's stock/product joins. Use bounded whole-transaction retries where selected; never retry S3 side effects blindly inside an aborted SQL transaction.
- [ ] Preserve at-most-one-primary and the M5 deletion/no-primary policy. Soft deactivation/reactivation leaves objects intact.

## Step 5 — Make deletion and cleanup recoverable

- [ ] In one DB transaction, lock/recheck the image and references, detach it and persist cleanup work plus replay/tombstone state. Do not call S3 before committing that durable intent or pretend PostgreSQL can roll back S3.
- [ ] Decide response semantics in M8: successful API deletion can mean gallery detachment accepted with cleanup pending; do not claim immediate public-object erasure. B must show accurate state and refetch.
- [ ] A worker rechecks final-key ownership, remaining references, upload terminal state and environment policy before deleting. Shared seed keys are protected unless copied into exclusive ownership.
- [ ] Failed delete retains a retryable job; missing object is an idempotent cleanup outcome. Implement lease/retry/backoff limits, restart recovery and visible exhausted work.
- [ ] Handle duplicate requests, confirm/delete races, product hard deletion and cleanup racing recovery. FK cascade alone does not delete S3 objects or guarantee a cleanup job exists.
- [ ] Reconcile orphaned publications and pending uploads using M6 grace periods; do not delete active or referenced media by a bucket listing alone.

## Step 6 — Complete read contracts and compatibility tests

- [ ] Product/admin list: `primary_image_url: string | null`; product/admin detail images: `image_url: string`; preserve existing `primary_image_id`/`image_id` fields.
- [ ] D adds cart `primary_image_url: string | null`, preserving item IDs, quantities, prices and purchase rules. No checkout-concurrency rewrite belongs in this handoff.
- [ ] Preserve `GET /api/images/:id` and `/api/products/images/:id` with 302 and canonical stored URL; invalid ID 400 and missing/deleted row 404. Validate new writes/migrated URLs so redirects cannot point to arbitrary attacker-selected hosts.
- [ ] Define caching for immutable final objects and avoid permanently caching mutable legacy ID redirects. If CDN support is chosen later, update canonical key extraction/deletion together; do not accept arbitrary URL hosts.
- [x] Replace stale `test/product-validation.test.js` BYTEA helper tests with URL/redirect/service assertions. The test now verifies canonical product-owned S3 URL parsing; redirect behavior remains covered by `tests/imageRouteAlias.test.js`.
- [ ] Keep mocked validation tests, then add real DB races/failure injection and isolated S3 tests from the companion. Existing mocked test counts are not sufficient evidence.

## Acceptance and handoff

- [ ] T06–T13/T15 pass, including malformed inputs, unauthorized roles, source overwrite, simultaneous primary writes and restart recovery.
- [ ] Backend tests, `test:product` and changed-file lint pass. Full backend lint passed on merged dev at `99fdeb2` (0 errors / 5 warnings); retain that dated evidence and recheck after implementation. The obsolete standalone image test still fails and blocks its gate.
- [ ] Current successful response fields and both read routes preserved; cart URL contract verified with D/B/A.
- [ ] Upload/cleanup schema and actual deployment grants documented; exact migration versions allocated.
- [ ] B receives frozen request/response/error examples, expiry/retry/deletion semantics and passing integration evidence. A receives URL fields/fallback expectations.
- [ ] F6 issues closed only with evidence in the companion; production verification remains separate.
