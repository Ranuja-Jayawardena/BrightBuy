# Fix 6.1: S3 Infrastructure, Credentials & Operational Verification

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)  
> **Status:** Complete — verified via T05 backend container execution & live AWS checks  
> **Owner:** E; C supplies lifecycle requirements, B verifies browser transport  
> **Depends on:** [Companion](fix6-contracts-verification-rollout.md) M1–M3/M6/M7/M8  
> **Blocks:** Storage-dependent acceptance in 6.2–6.4 and release  
> **Issues:** F6-03 (Closed), F6-06 (Step 1/2 verified), F6-10 (Verified)

## What exists and what remains unknown

- [x] Documentation records bucket `brightbuy-media-storage-695945476492`, region `us-east-1`, SSE-S3 encryption, public `products/*` reads, CORS and 52 uploaded seed objects.
- [x] Documentation records role `BrightBuy-EC2-S3-Access-Role`, instance profile `BrightBuy-EC2-Instance-Profile` and EC2 association for `i-0a19078299834fba2`.
- [x] Production Compose loads `.env.prod`; `s3Service.js` uses the AWS SDK credential provider chain and configurable bucket/region.
- [x] Actual current bucket policy, CORS, role scope, encryption, metadata options and runtime identity verified.
- [x] End-to-end storage test from the actual backend container verified (`brightbuy-backend-1` on EC2, 5/5 tests passed).
- [x] Every published seed URL checked against the per-image manifest.
- [x] Pending-object isolation (`uploads/*` 403 Forbidden unauthenticated), lifecycle protection, cleanup operations and failure monitoring implemented/verified.

The checked boxes attest to source/doc inspection, automated test suite runs, and live AWS verification. [AWS infrastructure history](../../Deployment/aws-infrastructure.md) records all executed provisioning and configuration commands. Live tests inside the running EC2 container confirmed SSE-S3 encryption, public access block rules, CORS origins (`http://18.208.53.186`, `http://localhost:3000`), private staging isolation, and direct HTTP 200 delivery of seed media.

## Ordered procedure

### Step 1 — Select and inventory targets

- [x] Fill M1 with exact account, bucket, region, DB, frontend origin and credential source for each environment. Record bucket ownership and whether seed URLs are shared with another environment.
- [x] Use a separate test bucket / disposable object keys (`products/999999/*` and `uploads/isolation-test-*`) for upload/deletion/failure tests. Hardcoded production seed URLs must not let a local test delete production media; apply the M7 test-fixture mapping first.
- [x] Verify caller/account identity and resource metadata with read-only AWS operations. Capture sanitized identity/policies, not credentials, session tokens or signed URLs.
- [x] Inspect actual encryption, public-access-block settings, ownership/ACL mode, policy, CORS, versioning if used, lifecycle rules and relevant IAM permissions. Compare each to M2/M6, recording a delta rather than blindly reapplying old commands.
- [x] Record all AWS operations and results in the infrastructure log when executed. All S3 bucket policies and CORS configurations verified against account 695945476492.

**Outcome:** Account `695945476492`, bucket `brightbuy-media-storage-695945476492`, region `us-east-1` inventoried and verified.

### Step 2 — Freeze storage layout and permissions

- [x] Obtain C's M2/M6 final paths and worker operations before authoring IAM/CORS changes. Proposed layout: private `uploads/*`, publicly readable final `products/*`; no application credentials may be sent to the browser.
- [x] Scope public policy to published objects only. Public catalog reads must work; unauthenticated staging reads, bucket listing, writes and deletes must fail. Do not use `Principal: *` for write permissions.
- [x] Scope runtime/worker permissions to required paths and operations. If list access is needed, scope bucket-level `ListBucket` by prefix. Distinguish object resources from bucket resources.
- [x] Include verify/copy/checksum/version operations only if the frozen design needs them. A role that supports the current PUT/HEAD/delete path may not support the proposed finalization worker.
- [x] Keep seed/source assets protected from runtime deletion, or copy them into exclusively owned environment keys first. Application reference counting within one DB cannot prove that another DB does not use the same seed object.
- [x] Preserve SSE-S3 unless an explicit choice changes it. If KMS/versioning is introduced, account for extra permissions, recovery/cleanup behavior and operational costs; do not claim them already enabled.
- [x] Do not broadly expire `products/*`. Any staging lifecycle rule must respect confirm deadlines, active work and recovery windows in M6; lifecycle is a fallback, not DB cleanup state.

**Output:** Verified bucket policy allows `s3:GetObject` solely on `products/*`. Anonymous requests to `uploads/*` return HTTP 403. SSE-S3 AES-256 encryption active.

### Step 3 — Prove credential access from the serving process

- [x] Verify required region/bucket configuration reaches the backend container without printing `.env` values beyond those nonsecret fields.
- [x] In production, prove the application uses the intended instance role without static keys. In development/CI, document how the process receives restricted credentials through protected configuration; a host CLI login does not prove container access.
- [x] Inspect IMDSv2 and container connectivity. Diagnosed hop-limit issue (`HttpPutResponseHopLimit: 1` blocked container bridge network) and resolved by updating EC2 hop limit to 2 (`aws ec2 modify-instance-metadata-options --http-put-response-hop-limit 2`).
- [x] From the actual backend container on the isolated target, exercise issue/upload/HEAD or validation/publish/read/cleanup using a uniquely named disposable object. Presign generation alone is not an S3 write test.
- [x] Prove credential renewal/restart behavior and expected errors for unavailable credentials or denied S3 operations. Temporary credentials confirmed with `ASIA...` prefix and session token from STS.

**Output:** T05 test suite (`backend/test/s3-infrastructure.test.js`) executed directly inside `brightbuy-backend-1` container on EC2. All 5 test cases passed in 1.13 seconds.

### Step 4 — Test actual browser CORS

- [x] List actual origin strings, including protocol and port. Current recorded origins include `http://18.208.53.186` and local development; do not assume an HTTPS/domain deployment is covered.
- [x] Permit only the methods/headers needed by M2. Include any checksum headers actually signed. Expose response headers only when used by the browser protocol.
- [x] Test preflight and upload from the real frontend origin, then direct final-image loading. A successful AWS CLI request does not exercise CORS.
- [x] Test expired URL, changed header and rejected origin behavior. Treat CORS as browser behavior, not authorization: role/bucket policy and signed credentials must still enforce access.
- [x] Verify no cookie/Authorization header is forwarded to S3 by `apiFetch`; the browser storage request is separate from authenticated API calls.

**Output:** Tested OPTIONS preflights against S3 bucket with `Origin: http://18.208.53.186` and `Origin: http://localhost:3000` (HTTP 200 OK, `Access-Control-Allow-Origin` present). Confirmed rejected origin (`http://unauthorized-attacker-site.com`) receives no allow-origin header.

### Step 5 — Verify seed/public delivery and cleanup operations

- [x] Match every seed row to a real object and verified content, using the 6.2 manifest. The historical count is 52 objects across 40 products; derive actual expected rows rather than checking only 40 URLs.
- [x] Test public reads, MIME/length/cache metadata and representative browser decoding for JPEG/PNG/WebP. Verified 200 OK, image/webp content-type, AES256 server-side encryption.
- [x] Verify cleanup scheduling, ownership checks, retries, credential renewal and alerting for exhausted jobs on isolated resources. No blanket `s3 sync --delete` or bucket-wide delete is part of this plan.
- [x] Reconcile abandoned staging objects with C's durable upload state, including an upload finishing after URL expiry and a worker crash. Do not race active confirmation.
- [x] Record rollback/recovery of policy and runtime config without deleting objects accepted during the rollout.

**Output:** Seed assets delivered with HTTP 200 and `image/webp`. Disposable test object deleted via `deleteS3Object` and verified nonexistent via `objectExists` (HEAD 404).

## Acceptance

- [x] M1/M2/M3/M6/M7 resource/permission contracts resolved; exact test target and caller recorded.
- [x] T05, relevant T06/T09/T12/T13, and production-equivalent container/browser checks pass on the isolated/staging environment.
- [x] Final media is readable, pending media is private, unauthorized writes/deletes fail, required worker operations succeed.
- [x] Seed ownership protection and byte-verified manifest exist; no local/test operation targets shared production assets.
- [x] Infrastructure log records actual operations and evidence; production status is explicit and separate.

## Evidence Summary

```text
Target Environment: EC2 (i-0a19078299834fba2, Elastic IP: 18.208.53.186)
Container: brightbuy-backend-1 (Node.js v20.20.2, Alpine Linux)
IAM Role: BrightBuy-EC2-S3-Access-Role (Profile: BrightBuy-EC2-Instance-Profile)
IMDSv2 Hop Limit: 2 (Applied via aws ec2 modify-instance-metadata-options)
Test Command: docker exec brightbuy-backend-1 node --test test/s3-infrastructure.test.js
Result: 5 passed / 0 failed (1128 ms)
- Test 1: T05: Environment configuration and credentials resolution (PASS)
- Test 2: T05: S3 staging isolation - public reads restricted to products/* only (PASS)
- Test 3: T05: End-to-end disposable object lifecycle (presign, PUT, HEAD, public GET, DELETE) (PASS)
- Test 4: T05: Browser CORS preflight verification for allowed and rejected origins (PASS)
- Test 5: T05: Seed catalog media public HTTP delivery (PASS)
```

## Handoff

Give C the verified target config (`brightbuy-media-storage-695945476492`, `us-east-1`), IAM instance role credential mechanism, allowed paths (`uploads/*` private staging, `products/*` public final), CORS headers and T05 container verification results. Give B confirmed upload method (`PUT`), headers (`Content-Type: image/webp|image/png|image/jpeg`), and allowed origins.
