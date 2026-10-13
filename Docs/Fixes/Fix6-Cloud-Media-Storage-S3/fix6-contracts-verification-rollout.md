# Fix 6: Shared Contracts, Verification & Rollout

> **Type:** Required companion to the four Fix 6 items; not another completion item
> **Status:** Documentation guide written; M1–M8 implementation decisions and release evidence pending
> **Owners:** E coordinates; C owns media contracts; B/A consume; D owns cart read changes
> **Parent:** [Fix 6 overview and issue ledger](fix6-cloud-media-storage-s3.md)
> **Baseline date:** 2026-10-13
> **Merged dev recheck:** `99fdeb2`, 2026-10-13; see the new migration blocker and current check results below.

## 1. Instructions for the next implementer

1. Read the parent, this file and your assigned subfix. Inspect the referenced source before editing; the baseline may have changed.
2. Record current branch/commit, dirty files, target environment and every migration version. The original review used `email`; the recheck uses merged `dev` at `99fdeb2`. Two distinct migrations now use V27. Do not start Flyway/default Compose until E resolves the collision against actual target histories. Preserve existing local changes.
3. Choose an explicitly isolated database and storage target. Validate their identity before starting Compose, migrations, fixtures, uploads or cleanup. Default development Compose can migrate and seed automatically.
4. Fill the decision rows needed by your work. A proposed default below is not a deployed fact. Replace `Pending` with the selected contract, owner/date and evidence or linked implementation design. Resolve product-policy choices with the user when needed; engineering details can be selected by the responsible owner within authorized work.
5. Implement only after the dependency is concrete. Hand exact request/response examples to consumers. Do not invent an API from a prose heading or silently change PUT to POST.
6. Execute the assigned acceptance cases and attach results. Failed/blocked checks stay unchecked with a reason. Never mark an item complete because its Markdown was written.
7. Update the parent F6 issue ledger, subfix tasks, this evidence ledger and both overall trackers together. No production deployment or main-branch operation is authorized by these instructions.

## 2. Decision register

The required outcomes are acceptance requirements. The proposed designs/values are starting points, not existing implementation. Every row needs a concrete resolution before dependent implementation; record any user-approved reduction in guarantees explicitly.

| ID | Required decision/output | Proposed implementation direction | Owner | State / blocks |
| --- | --- | --- | --- | --- |
| M1 | Named local/test/staging/production resources; credential source; seed-object ownership | Isolated DB and bucket for destructive tests; production uses EC2 instance role, development uses developer credentials outside git; production seed keys are protected/shared until proven otherwise | E + C | Pending / 6.1, 6.2, release |
| M2 | Exact upload transport, key paths, signed headers, expiry, immutable finalization and content verification | Retain presigned PUT; upload into private `uploads/{productId}/{uploadId}.{ext}`, validate a pinned object version/checksum, publish once to a separate server-owned `products/{productId}/{uploadId}.{ext}` key; never sign browser writes to the published key. Return required headers explicitly. Default expiry 300 seconds | C + E; B consumes | Pending / 6.1, 6.3, 6.4 |
| M3 | Exact byte/type limits, verification strength, timeout/concurrency/rate limits and retention values | Allow JPEG/PNG/WebP only; proposed maximum 5 MiB (5,242,880 bytes), reject empty files; enforce actual object size and verify bytes in bounded processing. Record whether a decoder or signature validation is used and its limits. Set exact worker timeout, lease, retry and cleanup intervals before implementation | C + E; B consumes | Pending / 6.1, 6.3, 6.4 |
| M4 | Durable upload identity, schema, idempotent confirmation and cleanup ownership | A DB upload record binds authenticated issuer, product, staging/final keys, expected metadata, expiry, state and result image ID; a unique final object identity prevents duplicate rows; deletion creates durable cleanup work in the same DB transaction | C + E | Pending / 6.2 additive schema, 6.3 |
| M5 | Primary-image behavior, metadata replay and lock order | Preserve at-most-one primary, no automatic promotion after delete unless deliberately selected; lock product before its image/upload/cleanup rows for every image mutation, validate again under lock; coordinate product lock order with Fix 8 checkout joins | C + E; B consumes | Pending / 6.3, 6.4 |
| M6 | Cleanup scheduling, retries, grace periods, tombstones and seed/shared-object protection | One durable cleanup mechanism, restart-safe retries with bounded attempts/backoff and visible exhausted jobs; never delete a referenced final object or an object in another environment. Pending uploads may expire; published objects have no blanket lifecycle expiration | C + E | Pending / 6.1, 6.3, release |
| M7 | Existing-data cutover manifest, freeze window, applied-migration handling and rollback | Per-image byte/checksum mapping and restored backup proof; use the pre-/post-V26 branches in 6.2; no generic product-ID rewrite or shared DB reseed | C + E | Pending / 6.2, release |
| M8 | Exact API additions/errors, stale-client policy, role rules and release revisions | Keep route names and existing success fields; add upload identity and URL read fields; freeze structured errors and replay responses. Deliver UI/backend together or explicitly block old upload clients with an actionable error | C + B + A; D cart, E release | Pending / 6.3, 6.4, release |

### How to complete a decision

For each M row attach: selected behavior; schema/constraint names if relevant; exact constant values; endpoint examples; owner/date; affected consumers; acceptance case IDs; compatibility and recovery behavior. Do not replace `Pending` with only “agreed” or “use best practices”.

Before writing any media migration, E fills this ledger and reconciles it with [Fix 8.1](../Fix8-Database-Integrity-Concurrency/fix8.1-contracts-preflight.md) and the [Phase 1 version map](../../Phases/Phase1-Project-Foundation/phase1-project-foundation.md):

| Change | Version/file | Status |
| --- | --- | --- |
| S3 URL replacement | Existing `V26__replace_image_data_with_image_url.sql` | File present; target application unknown; destructive generic mapping needs the 6.2 gate |
| Apparel seed matrix | Existing `V27__apparel_variant_matrix_seed.sql` | Merged from dev; collides with timestamp migration; target history must decide which identity is already applied |
| Catalog timestamps | Existing `V27__set_catalog_updated_at_on_update.sql` | File present; collides with apparel V27; application unknown; coordinate with Fix 8.2 and record resolved version |
| Upload identities/object uniqueness/cleanup data | Unallocated | M4/M6 design required; E assigns the next actually free versions |
| Any media grants, corrective data mapping or compatibility schema | Unallocated | Depends on actual target history and M1/M7; no applied migration rewriting |

**F6-12 stop gate:** enumerate duplicate versions; inspect the exact file names/checksums in every intended target's Flyway history; have E/C allocate a fresh version to a migration only when proven unapplied. Update all affected ledgers and timestamp references to its resolved version, then validate the full chain and compatible startup order. If different targets already applied different V27 identities, stop for a target-specific reconciliation plan; renaming an applied file or using repair/clean is not a generic solution. This docs recheck does not modify either SQL file.

## 3. Current source contracts versus target contracts

These are the observed baseline, not proof that production runs this revision:

| Operation | Current source behavior | Required handoff before change |
| --- | --- | --- |
| `POST /api/admin/products/:id/images/presign` | Body `{ contentType, fileName }`; 200 `{ uploadUrl, fileKey, publicUrl }`; 300-second PUT to `products/{id}/{uuid}.{ext}` | M2/M3/M8 publish upload identity, size/checksum inputs, required headers, expiry and finalization behavior |
| `POST /api/admin/products/:id/images/confirm` | Body `{ image_url, sort_order?, is_primary? }`; 201 `{ image }`; canonical product-prefix URL plus HEAD-exists check | M4/M8 require issued identity, validated bytes and idempotent attachment; URL alone cannot authorize confirmation |
| `PUT /api/admin/images/:id` | Updates sort order/primary | M5 serializes mutations and defines conflicts without changing success fields silently |
| `DELETE /api/admin/images/:id` | Deletes DB row then attempts S3 delete | M6/M8 define accepted deletion versus asynchronous cleanup, repeat request result and durable retry behavior |
| `GET /api/images/:id`, `/api/products/images/:id` | Legacy routes use image controller; canonical route redirects 302 to stored URL, or structured 400/404 | Preserve both routes with redirect tests; no old binary ETag expectation |
| Catalog/admin reads | Product queries/services expose `primary_image_url`; image detail exposes `image_url` | A/B add frontend types and consume these fields while preserving IDs |
| Cart read | `cartModel.js` returns `primary_image_id` only | D publishes additive `primary_image_url: string \| null`; B/A coordinate cart type/store consumers |

Admin routes apply `requireAuth`, `requireRole('admin')`, and `requireStaffRole('catalog_manager')`; inspect the middleware's super-admin allowance. Do not replace this with a generic staff check or enable inventory-only roles to upload. Use existing HttpOnly-cookie authentication examples, not a new Bearer-token flow. Recheck authorization on confirm and delete; a signed S3 URL does not grant application privileges.

For every changed endpoint record: method/path; exact required/optional fields; success HTTP/body; repeated request behavior; conflict HTTP/body; role/ownership checks; timeout/retry behavior; persisted side effects; frontend consumer and acceptance cases. Known errors use a stable `{ error, message, statusCode }` shape. Proposed error classes include invalid metadata (400), unauthenticated (401), forbidden (403), missing product/image (404), replay/metadata conflict (409), size rejection (413), throttling (429), and temporary storage failure (503). Freeze exact codes and messages in M8 before UI implementation; preserve unrelated existing error behavior.

## 4. Mandatory lifecycle invariants

1. **Issue:** create durable identity before returning write credentials. Bind product, issuer and permitted metadata. Never persist or log the signed URL itself. Presign retries may leave unused identities only if expiry cleanup handles them; define the client retry behavior.
2. **Upload:** the browser writes only the issued staging object with the required headers. Declared MIME/size and client validation are not authoritative. A PUT size declaration is not automatically an S3-enforced range limit; if strict admission control requires presigned POST, document the transport/SDK/UI change first.
3. **Verify:** capture the exact object version or content identity, check actual size/type under bounded resource limits, and publish those same bytes. Avoid checking one version and copying an overwritten version. ETag must not be assumed to be a universal MD5 checksum. Reject/retry if the source changes.
4. **Publish and attach:** never hold DB locks during S3 network calls. Reserve/claim work using a short transaction and durable state/lease, perform idempotent storage work, then finalize under the product lock in another short transaction. The object exists before committing the visible image row; SQL uniqueness and the upload result enforce one attachment. If attachment fails after publication, persistent state permits retry or cleanup.
5. **Replay:** same identity and normalized confirmation input returns the same image ID without another insert or resetting later primary/sort edits. Different input conflicts. A deleted result cannot be recreated by replay. Check the consumed result before treating it as an expired unused upload.
6. **Concurrent verification:** claim/lease rules prevent a stale worker finalizing after another worker expires or deletes its upload. Record how an interrupted claim is recovered and how S3 completion after a lease expires is handled. Never let garbage collection race an active finalization unchecked.
7. **Delete:** under the same product gate, detach the row and persist cleanup work/tombstone atomically. The cleanup worker retries after restart and checks references/ownership before deleting. Retain enough state for repeated API requests and confirm/delete races. Soft-deactivating a product does not enqueue media deletion.
8. **Reconcile:** periodically recover orphaned staging/final objects and exhausted cleanup jobs using durable identities and a grace period. URL expiry does not remove an object; an in-flight request may finish after expiry. Never perform a blanket bucket cleanup or expire all published `products/*` objects.

M2 may choose another implementation only if the same invariants and matrix are proven. The proposed staging design is additional work, not a description of the existing service.

## 5. Baseline checks already executed during the preceding review

These results belong to the 2026-10-13 review on this working tree. They were not rerun merely to edit Markdown. They are not release sign-off or evidence of real PostgreSQL/S3 integration.

| Command / directory | Observed result | Meaning / next owner |
| --- | --- | --- |
| `npm.cmd test -- --silent` / backend | 17 suites, 139 tests passed | Existing Jest baseline; pg/S3 are mocked in relevant suites |
| `npm.cmd run test:product` / backend | 4 passed, 1 failed: `detectMimeType is not a function` | C must replace stale BYTEA helper assertions with current media behavior |
| `npm.cmd run lint` / backend | 2 errors, 7 warnings | `paymentController.js`: empty catch at line 92, undefined `URL` at line 103; E/D own release blocker |
| `npm.cmd run lint -- --quiet` / frontend | Passed | Does not establish browser integration |
| `npm.cmd run build` / frontend | Passed after allowing font-fetch network access | Build skips TypeScript validation because `ignoreBuildErrors: true`; not type-check evidence |
| Live migration history, runtime-container S3, browser upload, real DB media races | Not run | Pending; do not infer success |

### Current merged dev checks (2026-10-13, `99fdeb2`)

- `npm.cmd run lint` in backend: passed, **0 errors / 5 warnings**. The paymentController fixes from dev resolve the original lint errors; that historical failure is no longer a current release blocker.
- `npm.cmd run test:product` in backend: **4 passed / 1 failed**, still `detectMimeType is not a function`. F6-09 remains open for the obsolete image test.
- Source inspection reconfirms the multipart UI/backend mismatch, unsafe V26 generic mapping, absent upload identity/cleanup guarantees and missing cart URL field.
- Two V27 migration files exist; F6-12 blocks the migration gate. No live migration/S3 check was performed and no Jest/frontend result was rerun or promoted to this revision.

For implementation verification use actual package scripts: backend `npm test`, `npm run test:product`, `npm run lint`; frontend `npm run lint -- --quiet`, `npm run build`. On this PowerShell host invoke `npm.cmd` because `npm.ps1` is blocked by execution policy. Run an explicit local TypeScript check (`npx.cmd --no-install tsc --noEmit` in frontend) or enable the build gate during authorized implementation; record existing errors separately and resolve/block release, not silently ignore them. This docs task does not change build config.

## 6. Acceptance matrix

Tests need isolated resources, bounded waits and final-state assertions. Mocked SDK calls cannot establish CORS/IAM; mocked SQL cannot establish locking. Owners add exact test names/commands when implementation exists.

| ID | Scenario | Required result | Owner |
| --- | --- | --- | --- |
| T01 | Fresh migrations and deterministic seeds | Correct schema and all fixture images readable; no hidden use of BYTEA helpers | C/E |
| T02 | Existing data: custom products, several secondary images, changed primary flags and nonsequential IDs | Same image IDs/order/flags and exact preserved contents after cutover | C/E |
| T03 | Missing/mismatched object, incomplete manifest or corrupt source fixture | Cutover stops before bytes are dropped; actionable image IDs reported | C/E |
| T04 | Restore backup and compatible app rollback | Preserved DB/object mapping; writes after backup handled explicitly | E/C |
| T05 | Backend-container role and real browser CORS | Presign/upload/verify/read/cleanup succeed using intended credentials/origin; unauthorized writes/private staging reads fail | E/B/C |
| T06 | Allowed files; empty/oversized/spoofed type; altered/missing signed headers | Valid files publish; invalid files never attach/publish, resource limits hold | C/B |
| T07 | Missing object, wrong product/issuer, arbitrary URL, expired unused identity, deactivated staff | Rejected with frozen error; no unintended metadata row | C |
| T08 | Concurrent confirm, lost response, auth-refresh replay, worker restart | One object identity and image row; same result on retry; changed input conflicts | C/B |
| T09 | Replay upload URL after successful confirmation; overwrite between verification and copy | Published bytes unchanged; no unvalidated version becomes visible | C/E |
| T10 | Two primary uploads/updates, sort versus primary edit, confirm versus delete | Documented serial result, at most one primary, no lost metadata; expected conflict mapped | C/B |
| T11 | S3 success then DB failure; crash during finalization | No visible broken row; durable state recovers or safely cleans orphan | C/E |
| T12 | DB delete then S3 denial/timeout; restart; repeated deletion | UI receives accurate accepted/deleted state; durable retry remains; no unrelated object deleted | C/E/B |
| T13 | Duplicate/shared/seed URL, expired staging and concurrent cleanup | Referenced/shared assets survive; no late confirm resurrection; abandoned objects eventually cleaned | C/E |
| T14 | Admin upload/select primary/reorder/delete and catalog/detail/cart rendering | Direct final URLs, correct fallback, existing role rules, no request to removed multipart endpoint | A/B/C/D |
| T15 | Both legacy read URLs, missing/deleted image | Correct redirect or documented 400/404; no obsolete binary-body/ETag assertion | C |
| T16 | Whole existing test suite, lint, build and explicit type check | Required gates pass or release remains blocked with named owner; no silent skip | A/B/C/D/E |
| T17 | Upgrade deployment and stale frontend tab | Migrated compatible backend/UI; no old writer against incompatible schema/protocol | E/B/C |
| T18 | Restricted runtime DB account / S3 role if introduced with Fix 8 | Legitimate operations work, ownership/sequence/worker grants correct, excessive actions rejected | E/C |

For T08/T10/T13 use two or more actual pg clients and explicit barriers; assert final rows, keys and job state. Include a product with no current images and one with an existing primary. Run failure injection around every storage/DB boundary, not only the happy path.

## 7. Target-specific release runbook to fill before deployment

The following is a required order, not permission to execute production changes. E writes exact executable commands for the actual Compose/Flyway setup and reviews them against this sequence; commands must include target selection, stop conditions and secret handling. Do not invent a production migration service that does not exist.

1. Record target/revisions, operator, current Flyway history/checksums, backup location and restore rehearsal. Verify M1–M8 resolved and all required T cases passed on isolated/representative data.
2. Gate CD on successful required CI checks. Current `cd.yml` independently deploys pushes to `main`; current CI has no Flyway stage. Implement and test explicit migration/fixture/integration stages before claiming pipeline safety.
3. Stop incompatible media writers and scheduled cleanup for the maintenance/cutover window. Revoke or account for outstanding signed upload capabilities; merely stopping Express does not cancel issued URLs. Record the final manifest after the freeze.
4. Provision compatible storage permissions, staging isolation and additive DB structures. Reconcile new versions with Fix 8. On pre-V26 targets, complete 6.2 preservation before its destructive step. On post-V26 targets, use a reviewed forward repair if needed.
5. Apply required migrations through the migration identity only after F6-12 is resolved and the complete chain validates. Verify actual `image_url`, constraints and job/session objects. Before starting the timestamp-dependent backend, apply/verify the catalog timestamp migration under its resolved version; follow Fix 8.2 and the updated ledger rather than assuming V27 identifies it uniquely.
6. Deploy backend/worker and UI in the M8 compatibility sequence. If a maintenance window is selected, resume media writes only when both are ready. Old tabs must receive an actionable reload/retry response; do not restore insecure URL-only confirmation to accommodate them.
7. Smoke-test one uniquely owned disposable image through upload, confirm, direct storefront/cart read, primary/reorder and deletion/cleanup. Record target, IDs and sanitized outcomes without signed credentials. Production writes still require the user's deployment authorization.
8. Verify cleanup scheduling/restarts, pending jobs, error rates, migration state and object references. Test unrelated login/catalog/cart behavior. Use fake/sandbox external effects where relevant.
9. Resume normal operations, record observations and close only evidence-backed gates. Log actual AWS commands/results in the infrastructure document. Keep production status distinct from local/staging completion.

### Failure and rollback

Stop at the failed gate and record the last completed step. Roll back only to an app revision compatible with the retained schema/protocol and worker data. Old BYTEA code cannot run against a database after `image_data` was dropped. Do not delete uploaded objects, upload identities or cleanup records to make an old binary start.

A restore requires both database and object recovery, a defined recovery point, and reconciliation of writes after backup. Preserve immutable original/seed assets and the migration manifest until the recovery window closes. Prefer a forward correction when V26 is already applied; restoration must not silently lose later orders or other nonmedia writes. Rehearse the actual option before the release.

## 8. Evidence ledger and closure rule

For every entry attach environment, UTC/client-date timestamp, app revision and dirty-state note, migration history, commands, sanitized result/artifact, owner, and remaining failures. Never paste `.env`, access keys, session cookies or signed URLs.

| Environment | Migration proof | S3/container/CORS | DB races and failure recovery | Browser/type/build | Backup/rollback | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Local isolated | Pending | Passed (`npm run test:s3`, 5/5) | Pending | Baseline lint/build only; integration/type check pending | Pending | S3 Verified (6.1) |
| CI | No explicit migration stage in reviewed source | No integration proof | Mocked baseline only | Existing build skips types | N/A | Needs correction |
| Staging / representative upgrade | Pending | Pending | Pending | Pending | Pending | Unverified |
| Production | Actual V26/V27 history unknown | Passed (T05 inside `brightbuy-backend-1`, 5/5) | Not run | Not run | Pending | S3 Container Verified (6.1) |

The four subfixes become complete only when their named acceptance evidence exists. Production may remain pending authorization and must be reported that way; do not call the production cutover verified without target evidence. Keep this distinction in both master trackers.

## 9. Technical references for implementation

- An S3 presigned URL may be reused while valid and can replace an object at its signed key. This is why M2 must protect the published object separately. [AWS presigned URL guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
- A signed POST policy supports `content-length-range`; changing transport requires a deliberate client/server contract. [AWS POST policy](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html).
- Metadata-service access must be tested inside the backend container; container networking can require an appropriate IMDS response hop limit. [AWS instance metadata options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html).

Recheck SDK/API details against official documentation at implementation time. These references establish storage behavior, not that BrightBuy already implements the proposed safeguards.
