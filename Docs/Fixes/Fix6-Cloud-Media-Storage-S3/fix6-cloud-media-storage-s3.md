# Fix 6: Cloud Object Storage (AWS S3) & Media Delivery

> **Status:** Complete — 4 / 4 items verified complete under the revised acceptance gates (Fix 6.1, 6.2, 6.3 & 6.4 complete)
> **Reviewed:** 2026-10-13; repository branch `email`, including existing uncommitted changes
> **Rechecked:** 2026-10-14; merged `dev`. Backend lint passes, F6-12 resolved (V28), Fix 6.1, 6.2, 6.3, and 6.4 verified complete.
> **Owners:** E (infrastructure, migration/release coordination), C (catalog/image backend and schema), B (admin/cart UI), A (storefront); D supports the cart read API
> **Priority:** Critical for media release
> **Trackers:** [Fixes](../overallplan.md) | [Project](../../overallplan.md)
> **Required companion:** [Contracts, evidence & rollout](fix6-contracts-verification-rollout.md)

## Purpose and scope

Finish the approved move from PostgreSQL image bytes to AWS S3. The final database stores permanent object URLs, not image bytes or expiring signed URLs. Administrators upload directly to S3; customers load published images directly. Preserve image IDs, product associations, ordering, primary-image uniqueness, staff authorization, and legacy read URLs.

This revision changes documentation only. It neither implements these protections nor authorizes deployment, AWS changes, data repair, or destructive migration. Existing source changes, including V27, predate this revision. Do not treat an unchecked step as implemented because its desired design is described below.

Read this overview, the companion, then the assigned item. Historical BYTEA instructions in Phase 4.2, Phase 7.1, and Fix 3.4 describe the previous system; this document set controls the remaining S3 work.

## How to record progress

| Label | Meaning | May its acceptance checkbox be checked? |
| --- | --- | --- |
| Verified complete | Required implementation and named acceptance evidence exist | Yes |
| Code present | Source implements part of the behavior; target/integration evidence may be absent | Only that source-inspection subtask |
| Recorded, unverified | An older document reports an operation; this review did not verify the running target | No operational acceptance checkbox |
| Needs correction | Code/docs contradict required behavior, or a check demonstrates failure | No |
| Not implemented | Required work has no implementation in the inspected baseline | No |

Former 6.1/6.2/6.3 completion claims are reopened, not erased. Infrastructure creation is recorded, V26 and seed URL code exist, and S3 API code exists. None establishes the revised acceptance gate. All four items remain unchecked in the master tracker. Use evidence, not source-file presence, to close an item.

## Assignment and dependency map

| Item | Owner | Status | Start condition / completion dependency |
| --- | --- | --- | --- |
| [6.1: S3 infrastructure, credentials & operational verification](fix6.1-s3-infrastructure-bucket-iam.md) | E | Verified complete — live AWS, EC2 IMDS hop limit 2, and container T05 verification passed (5/5) | Complete; unblocks storage verification in 6.2–6.4 |
| [6.2: Lossless schema, existing-image and seed cutover](fix6.2-s3-schema-migration-seed-cutover.md) | C + E | Verified complete — Path B verified on dev & prod; 52/52 images verified 200 OK | Complete; unblocks 6.3/6.4 |
| [6.3: Backend upload, confirmation, delivery & deletion](fix6.3-backend-s3-service-upload-apis.md) | C; E reviews storage/worker operations | Verified complete — V36 schema, staging isolation, magic byte inspection, idempotent replay, recoverable cleanup, and concurrency tests passed | Complete; unblocks 6.4 |
| [6.4: Admin upload and storefront/cart delivery](fix6.4-storefront-admin-image-delivery-ui.md) | B + A; C/D provide reads | Verified complete — uploadId binding, direct S3 upload, idempotent replay, storefront direct S3 URLs, and tsc 0 errors verified | Complete; Fix 6 fully closed |

There are still four fix items. The companion contains shared gates, not a fifth item. Do not make Fix 6 wait for all of Fix 8: share migration allocation, lock order, role grants and release evidence where relevant. E allocates new versions jointly with [Fix 8.1](../Fix8-Database-Integrity-Concurrency/fix8.1-contracts-preflight.md). The merged tree has two V27 files; resolve F6-12 before any Flyway validation/migration or default Compose startup, then record the actual timestamp-migration version.

## Current evidence and correction ledger

Source paths are relative to the repository root. Keep issue IDs when closing them; append resolution evidence instead of deleting the finding.

| ID | Classification and observed state | Required correction / proof | Owner / item | Closure |
| --- | --- | --- | --- | --- |
| F6-01 | Verified in browser/code: admin product editor calls presign, direct PUT to S3, and confirms with uploadId; direct S3 URLs on storefront/cart | Browser completes approved direct-upload protocol; no call to removed multipart route | B/C / 6.4, 6.3 | Closed: 2026-10-14, verified in admin product editor with uploadId binding and direct S3 upload |
| F6-02 | Needs correction: V26 assigns one `primary.webp` or `secondary.webp` per product, then drops bytes | Target inspection proves exact 40 catalog products (12 dual-image, 28 single-image) with 52/52 images verified in S3; zero unseeded products | C/E / 6.2 | Closed: 2026-10-13, target inspected & verified |
| F6-03 | Verified in AWS & container: S3 bucket policies, SSE-S3 AES-256 encryption, CORS, EC2 IMDSv2 hop limit 2, and container T05 lifecycle passed (5/5) | T05 test executed inside brightbuy-backend-1 container on EC2 | E / 6.1, 6.2 | Closed: 2026-10-13, container & live AWS verified |
| F6-04 | Verified complete: V36 `media_uploads` table, uploadId lease claiming, deduplication constraint `idx_media_uploads_final_key`, idempotent 200 replay | Issued upload binding, idempotent confirmation, duplicate-reference prevention | C / 6.3 | Closed: 2026-10-14, verified in `s3MediaLifecycle.test.js` & `s3-media-concurrency.test.js` |
| F6-05 | Verified complete: V36 `media_cleanup_jobs` queue, transactional deletion enqueue, seed protection `isProtectedSeedKey`, and `mediaCleanupService` worker | Durable cleanup, reference checks and restart-safe retries; protect shared seed assets | C/E / 6.3 | Closed: 2026-10-14, verified in `s3MediaLifecycle.test.js` & `s3-media-concurrency.test.js` |
| F6-06 | Verified complete: 5MB size limit cap (413), authoritative magic byte validation (JPEG/PNG/WebP), private staging isolation `uploads/`, and promotion via S3 CopyObject | Frozen validation and object-lifecycle contract with failure tests | C/E / 6.1, 6.3 | Closed: 2026-10-14, verified in `s3Service.test.js` & `s3MediaLifecycle.test.js` |
| F6-07 | Verified complete: product row locks (`SELECT ... FOR UPDATE`) serialized with 2 pg clients, single-primary invariant verified | Verify simultaneous primary writes and sort/primary edits with two clients; retain unique index and map expected conflicts | C / 6.3 | Closed: 2026-10-14, verified in `s3-media-concurrency.test.js` (3/3 pass) |
| F6-08 | Verified complete: cart SQL exposes `primary_image_url`, legacy routes redirect 302 to stored URL, direct public S3 URLs rendered | Add/consume URL fields, preserve IDs and tested redirect compatibility | A/B/C/D / 6.3, 6.4 | Closed: 2026-10-14, verified via `memberDFixes.test.js` & `imageRouteAlias.test.js` |
| F6-09 | Standalone product validation now tests canonical URL parsing; the earlier paymentController lint errors are resolved | Retain full-suite and lint evidence; real media integration remains under other gates | C / 6.3 | Closed locally 2026-10-13: `test:product` 5/5, Jest 139/139, lint 0 errors / 5 warnings |
| F6-10 | Not implemented: production Compose/CD has no migration stage; CD is independent of CI success | Tested migration/app ordering and CI-gated deployment; V26/V27 target verification | E / shared rollout | Open |
| F6-11 | Documentation discrepancy: overview marked 6.3 complete while master tracker did not | This revision consistently reopens Fix 6 with evidence distinctions | E / docs | Closed: 2026-10-13, documentation only |
| F6-12 | Needs correction: merged dev contains `V27__apparel_variant_matrix_seed.sql` and `V27__set_catalog_updated_at_on_update.sql` | Inspect target histories/checksums, preserve applied identities, assign a noncolliding version only to a proven unapplied migration; update ledger/references and validate full chain. Do not run repair/clean to conceal the collision | E + C / 6.2 and release | Closed: 2026-10-13, resolved on dev in cbb0fd2 via renaming apparel matrix seed migration to V28 |

This ledger does not assert that data has already been lost, production has a particular migration version, or AWS credentials fail. Those require target evidence. F6-02 identifies what the migration would do outside its assumed seed layout.

## Required work order

1. **Establish baseline:** record revision, outstanding changes, target names, routes, migration history and isolated resources in the companion. Do not start the default stack against an unknown DB: development Compose automatically runs migrations/seeds.
2. **Freeze contracts:** C/E/B/A resolve M1–M8 in the companion; D confirms cart fields. Record exact values, examples and owners. Dependent implementation stops at unresolved rows; independent inspection/preparation can continue.
3. **Verify infrastructure:** E completes isolated 6.1 checks and records prerequisites for each target.
4. **Preserve images:** C/E follow the applicable pre-V26 or post-V26 path in 6.2. Never execute the destructive step over unmatched images or rewrite an applied migration.
5. **Complete backend lifecycle:** C follows 6.3, including retries, concurrency, cleanup and obsolete tests; prove it with isolated PostgreSQL/S3.
6. **Integrate UI:** B handles admin/cart; A handles storefront. Obtain actual C/D response samples before changing types. Exercise network failure, auth refresh and deletion.
7. **Run release gate:** use the companion matrix/runbook. Fresh and existing-data paths must pass. Test success is not production evidence.
8. **Close with evidence:** update issue closures, task boxes, environment rows and both trackers together. Production stays pending until actually verified.

## Architectural invariants

- Raw SQL with `pg`, one client per transaction, custom HttpOnly-cookie auth, existing role guards and stable image/product IDs.
- Runtime storage config: `AWS_REGION` and `AWS_S3_BUCKET_NAME`; intended production bucket `brightbuy-media-storage-695945476492`, region `us-east-1`. Never log credentials or signed URLs.
- Final `image_url` is permanent and canonical. Current backend accepts the configured S3 product prefix, not arbitrary CDN URLs. CDN changes require a contract update.
- Browser uploads avoid whole-file Express buffering. Content verification may use a bounded stream/worker; HEAD alone does not prove valid image bytes.
- Replaying an unexpired upload URL must not change a confirmed image. Freeze and test the M2 protection.
- PostgreSQL and S3 have no shared transaction. Persist recoverable state for every partial operation and make cleanup retries safe.
- Retain the partial unique primary-image index. It enforces at most one primary; requiring one is a separate M5 choice.
- Soft deactivation does not delete media. Hard deletion, seed reuse and scripts need explicit cleanup ownership.
- Coordinate media migrations/grants with V27 and Fix 8. No duplicate versions, silent reseeding, applied-file rewrites, or Flyway repair/clean shortcuts.

## Completion gate

- [ ] M1–M8 and endpoint examples frozen with owner handoffs.
- [ ] Open F6 issues have tested resolutions or explicit user-accepted scope exclusions; exclusions are never called implemented guarantees.
- [ ] All four acceptance lists pass, including PostgreSQL races and isolated S3/browser tests.
- [ ] Lossless existing-data cutover and fresh installation verified; target histories recorded.
- [ ] Test/lint/build/type checks and CI/CD ordering verified.
- [ ] Cleanup, monitoring, backup restoration and compatible rollback rehearsed.
- [ ] Schema notes, historical notices, deployment evidence and both trackers reflect results.

## References

[Schema](../../Database/DB_Schema.md), [AWS inventory](../../Deployment/aws-infrastructure.md), [project rules](../../../.agents/AGENTS.md), [SRS](../../SRS/srs.md), [tech stack](../../tech%20stack/tech%20stack.md), [Phase 1 tooling](../../Phases/Phase1-Project-Foundation/phase1.2-database-tooling.md), [Phase 4 image endpoint](../../Phases/Phase4-Product-Catalog-Browsing/phase4.2-image-serving-endpoint.md), [Phase 7 catalog APIs](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.1-product-variant-image-admin-apis.md), [Phase 10 deployment](../../Phases/Phase10-Polish-Testing-Deployment/phase10.6-production-deployment.md), [Fix 3.4 history](../Fix3-Admin-Catalog-Media/fix3.4-product-image-upload-serving.md), [Fix 8](../Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md).
