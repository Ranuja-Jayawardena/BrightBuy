# Fix 6.2: Lossless Schema, Existing-Image & Seed Cutover

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)
> **Status:** In Progress — V26 and URL seed code present; general backfill needs correction and target verification is pending
> **Owners:** C (catalog data/schema), E (Flyway/backup/release)
> **Depends on:** [6.1](fix6.1-s3-infrastructure-bucket-iam.md) storage evidence; [companion](fix6-contracts-verification-rollout.md) M1/M4/M7 and migration ledger
> **Blocks:** Safe existing-data rollout of 6.3/6.4
> **Issues:** F6-02, F6-03, F6-04, F6-05

## Current implementation and incorrect assumption

- [x] `backend/db/migrations/V26__replace_image_data_with_image_url.sql` exists: adds `image_url`, fills it, makes it NOT NULL, drops `image_data`.
- [x] `backend/db/seed/04_products.sql` uses fixed S3 seed URLs; the schema document describes the post-V26 table.
- [ ] Target-specific V26 application/history/checksum verified. The infrastructure log's migration entry covers V1–V20, not proof of V26 application or absence.
- [ ] All existing image contents and associations preserved by a verified manifest.
- [ ] Fresh and representative existing-data upgrades passed.

**Needs correction:** V26 derives a URL solely from `product_id` and `is_primary`. Every nonprimary image for a product becomes `secondary.webp`; changed primary flags can swap intended contents; custom products may have no matching seed key. It then drops the original bytes. The earlier doc showed all rows mapped to `primary.webp`, which also did not match the actual CASE expression. Neither recipe is a safe general migration.

Do not claim corruption already occurred without inspecting the target. Do not run this migration unchanged over unknown rows. Do not delete/reseed shared data to make it resemble the demo catalog.

## Step 1 — Determine the actual migration branch

- [ ] Record revision, highest repository migration and actual Flyway history/checksums in an authorized environment. V27 is already occupied; allocate additions through E and the shared ledger.
- [ ] Inspect columns and constraints on the actual `product_images` table. History and schema must agree. Unknown or inconsistent state blocks cutover.
- [ ] Inventory row count, image IDs, product IDs, primary/sort values, MIME/size where discoverable, duplicate URLs if present, and nonseed products. Preserve IDs and foreign-key associations.
- [ ] Back up the database and available image bytes/objects, record access-controlled backup/manifest locations and rehearse restoration on an isolated target.
- [ ] Choose Path A (bytes still present / V26 not applied), Path B (V26 applied / bytes absent), or stop for an inconsistent schema. No choice may be inferred from the Git file alone.

Read-only diagnostic examples below are templates, not executed results. Inspect columns before running the version-specific query. Determine Flyway's actual configured schema rather than assuming `public`:

```sql
SELECT table_schema, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_images'
ORDER BY table_schema, ordinal_position;

-- Only if image_data exists; never print the image bytes themselves.
SELECT image_id, product_id, is_primary, sort_order,
       octet_length(image_data) AS byte_count
FROM product_images ORDER BY image_id;

-- Only if image_url exists; duplicates are findings, not permission to delete rows.
SELECT image_url, count(*) AS reference_count,
       array_agg(image_id ORDER BY image_id) AS image_ids
FROM product_images GROUP BY image_url HAVING count(*) > 1;
```

## Step 2A — Preserve a pre-V26 dataset

1. **Freeze media writers** for the cutover or prove an equivalent consistent snapshot/delta protocol. Include issued uploads, scripts and cleanup. Record when the manifest becomes final; a changing table cannot be matched by an old export.
2. **Export every image independently** with image/product ID, primary/sort values, exact byte length, detected MIME and a cryptographic content digest. Original bytes go to protected backup/object storage, never to logs or Markdown. Do not assume all blobs are WebP.
3. **Create a per-image manifest** containing at least source environment, image ID, product ID, source digest/length/MIME, destination bucket/key/URL, destination digest/length, verification outcome and time. Use a distinct immutable destination for each image, such as `products/{productId}/migrated-{imageId}-{contentDigest}.{ext}`. Validate canonical URL length (at most 500 characters); image IDs alone are not unique across environments, so the target ownership contract must isolate them.
4. **Upload and verify before any drop.** Compare actual contents/digest and metadata against the manifest. Do not assume ETag always equals a byte checksum. Test decoding representative images and preserve invalid-source findings for review; do not silently transcode, replace or discard them.
5. **Select an explicit migration strategy with E.** If V26 is proven unapplied in every persistent/shared target, a reviewed correction to the unapplied migration may be possible. If V26 has been applied anywhere or history is uncertain, preserve its file/checksum and use a controlled sequence: verified external manifest/backups first; maintenance window with media unavailable; existing V26; an allocated forward correction/import that restores each URL from that manifest; validation before any app reads/writes resume. The forward correction must use exact image IDs and verified destination URLs, not another guessed product-name mapping.
6. **Make manifest import executable and fail-closed.** Before running the sequence, document how the forward migration/job receives the immutable manifest, how it verifies identity/digest, and how it rejects missing/extra rows, changed metadata, wrong products or duplicate conflicting mappings. SQL cannot fetch an arbitrary external manifest by magic. Test the exact runner/import process on an isolated copy. No unreviewed manual row-by-row repair.
7. **Validate the complete sequence.** If a later step fails after V26 commits, leave media unavailable and recover using the preserved manifest/backups. Never start the old BYTEA app against that schema or expose temporary wrong URLs. New schema constraints can be enforced only after the verified mapping is installed.
8. **Prove equivalence:** same image count/IDs, product associations, sort order, primary flags and byte contents; every final URL is readable and owned according to M1/M7. Only then resume compatible application code. Keep backup/manifest until the documented recovery window closes.

**Stop conditions:** an image is unmapped/unverified; source changes after freeze; backup cannot be restored; the migration/import sequence is unspecified; another environment's assets would be overwritten/deleted. NOT NULL merely proves a string is present, not that an image was preserved.

## Step 2B — Inspect a post-V26 dataset

1. Capture actual URLs/IDs/flags and object contents. Identify duplicate generic secondary URLs, missing objects, custom images and possible primary swaps. Do not assume every duplicate is incorrect; provenance decides.
2. Recover original per-image mapping from a pre-cutover backup/export/manifest where needed. Do not pretend dropped bytes are recoverable from the new URL string.
3. Produce a reviewed repair plan listing affected image IDs, evidence, intended objects and any unrecoverable rows. Never substitute a seed image and label the original preserved.
4. If originals exist, upload to verified owned keys and apply an allocated forward correction with exact IDs. Preserve legitimate metadata and any later edits according to the reviewed recovery point.
5. If originals do not exist, leave the loss/unverified preservation issue open, record affected IDs and obtain a user decision for recovery/replacement. This item cannot claim lossless completion on that target.
6. Re-run row/object comparison and application reads. Do not rewrite V26, run Flyway repair/clean, or restore the entire DB over newer orders merely to repair image mappings.

## Step 3 — Make seeds safe in each environment

- [ ] Derive expected image count from the actual seed inserts and assets. Historical upload log: 52 objects for 40 products; do not assert one image per product.
- [ ] Verify every fixed seed URL resolves to the intended bytes. SKU-based product lookup in the seed does not make numeric object paths valid for arbitrary existing data; seed URLs identify demo assets only.
- [ ] For isolated tests/dev, map or copy seed assets into the target's own bucket/key space before testing deletion. Alternative protected shared assets require a tested reference-only deletion policy; one DB cannot prove global nonuse.
- [ ] Validate actual migration-then-seed order on a clean isolated DB. Seeds are not idempotent and development Compose may run them automatically; do not execute them on an existing shared DB.
- [ ] Do not use `aws s3 sync --delete`, blanket overwrite or volume deletion as migration steps.

## Step 4 — Add only the resolved lifecycle schema

- [ ] M4/M6 specify upload identity, unique object ownership, cleanup/tombstone data, indexes and retention before SQL is authored. These objects do not exist merely because the companion proposes them.
- [ ] Preflight current duplicate/shared URLs before enforcing uniqueness. Keep multiple metadata rows if legitimate and choose a reference model, or repair them through reviewed mapping; never arbitrarily drop rows.
- [ ] Preserve the existing primary-image partial unique index, product FK, IDs and metadata. Add named constraints for known API conflict mapping.
- [ ] Update [DB_Schema.md](../../Database/DB_Schema.md) when schema implementation occurs, marking actual versus proposed objects. Never document proposed columns as already deployed.
- [ ] Coordinate grants/worker access with [Fix 7.11](../Fix7-Database-Integrity-Concurrency/fix7.11-database-account-separation.md), without making all of Fix 7 a prerequisite for isolated media tests.

## Acceptance and evidence

- [ ] T01–T04 pass with full migrations, seeds and representative custom/multiple-secondary/changed-primary fixtures.
- [ ] Dirty/missing-object fixture blocks the destructive stage; no unverified content is dropped.
- [ ] Post-V26 recovery path is tested where applicable; unrecoverable originals are explicitly reported.
- [ ] Per-image manifest proves row identity, association, metadata and content equivalence; all final objects readable.
- [ ] Lifecycle schema preflight/constraints and runtime grants match resolved M4/M6 and actual DB state.
- [ ] Compatible rollback/restore demonstrated, with writes after backup accounted for.
- [ ] Named environment and Flyway history evidence attached to the companion; production is not called migrated from source inspection.

## Handoff and closure

C gives A/B/D stable image IDs/URL read shapes and C/E give the release operator the manifest, migration/import commands and stop/recovery points. Close F6-02/F6-03 only for proven targets; keep production pending if not inspected. Rewriting this document does not complete the migration.
