# Fix 6.1: S3 Infrastructure, Credentials & Operational Verification

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)
> **Status:** In Progress — provisioning recorded; runtime and protection gates unverified
> **Owner:** E; C supplies lifecycle requirements, B verifies browser transport
> **Depends on:** [Companion](fix6-contracts-verification-rollout.md) M1–M3/M6/M7/M8 as applicable
> **Blocks:** Storage-dependent acceptance in 6.2–6.4 and release
> **Issues:** F6-03, F6-06, F6-10

## What exists and what remains unknown

- [x] Documentation records bucket `brightbuy-media-storage-695945476492`, region `us-east-1`, SSE-S3 encryption, public `products/*` reads, CORS and 52 uploaded seed objects.
- [x] Documentation records role `BrightBuy-EC2-S3-Access-Role`, instance profile `BrightBuy-EC2-Instance-Profile` and EC2 association for `i-0a19078299834fba2`.
- [x] Production Compose loads `.env.prod`; `s3Service.js` uses the AWS SDK credential provider chain and configurable bucket/region.
- [ ] Actual current bucket policy, CORS, role scope, encryption, metadata options and runtime identity verified.
- [ ] End-to-end storage test from the actual backend container verified.
- [ ] Every published seed URL checked against the per-image manifest.
- [ ] Pending-object isolation, lifecycle protection, cleanup operations and failure monitoring implemented/verified.

The checked boxes attest to source/doc inspection only. The earlier `Complete` label overstated operational evidence. [AWS infrastructure history](../../Deployment/aws-infrastructure.md) records provisioning; it does not include the required runtime-container/read-write-cleanup evidence. Its CORS summary and the old 6.1 example also listed different origins. Read actual policy instead of choosing one by assumption.

## Ordered procedure

### Step 1 — Select and inventory targets

- [ ] Fill M1 with exact account, bucket, region, DB, frontend origin and credential source for each environment. Record bucket ownership and whether seed URLs are shared with another environment.
- [ ] Use a separate test bucket for upload/deletion/failure tests. Hardcoded production seed URLs must not let a local test delete production media; apply the M7 test-fixture mapping first.
- [ ] Verify caller/account identity and resource metadata with read-only AWS operations. Capture sanitized identity/policies, not credentials, session tokens or signed URLs.
- [ ] Inspect actual encryption, public-access-block settings, ownership/ACL mode, policy, CORS, versioning if used, lifecycle rules and relevant IAM permissions. Compare each to M2/M6, recording a delta rather than blindly reapplying old commands.
- [ ] Record all AWS operations and results in the infrastructure log when executed. This document revision executes none.

**Stop condition:** unknown account/target/seed ownership. Do not perform writes, cleanup, or broad policy changes until resolved.

### Step 2 — Freeze storage layout and permissions

- [ ] Obtain C's M2/M6 final paths and worker operations before authoring IAM/CORS changes. Proposed layout: private `uploads/*`, publicly readable final `products/*`; no application credentials may be sent to the browser.
- [ ] Scope public policy to published objects only. Public catalog reads must work; unauthenticated staging reads, bucket listing, writes and deletes must fail. Do not use `Principal: *` for write permissions.
- [ ] Scope runtime/worker permissions to required paths and operations. If list access is needed, scope bucket-level `ListBucket` by prefix. Distinguish object resources from bucket resources.
- [ ] Include verify/copy/checksum/version operations only if the frozen design needs them. A role that supports the current PUT/HEAD/delete path may not support the proposed finalization worker.
- [ ] Keep seed/source assets protected from runtime deletion, or copy them into exclusively owned environment keys first. Application reference counting within one DB cannot prove that another DB does not use the same seed object.
- [ ] Preserve SSE-S3 unless an explicit choice changes it. If KMS/versioning is introduced, account for extra permissions, recovery/cleanup behavior and operational costs; do not claim them already enabled.
- [ ] Do not broadly expire `products/*`. Any staging lifecycle rule must respect confirm deadlines, active work and recovery windows in M6; lifecycle is a fallback, not DB cleanup state.

**Output:** sanitized desired/current permission matrix and narrowly scoped changes. Production mutation still follows the authorized release process.

### Step 3 — Prove credential access from the serving process

- [ ] Verify required region/bucket configuration reaches the backend container without printing `.env` values beyond those nonsecret fields.
- [ ] In production, prove the application uses the intended instance role without static keys. In development/CI, document how the process receives restricted credentials through protected configuration; a host CLI login does not prove container access.
- [ ] Inspect IMDSv2 and container connectivity. If metadata access fails, diagnose the actual networking/hop-limit configuration; do not weaken IMDS token requirements as a shortcut. See the [AWS metadata reference](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html).
- [ ] From the actual backend container on the isolated target, exercise issue/upload/HEAD or validation/publish/read/cleanup using a uniquely named disposable object. Presign generation alone is not an S3 write test.
- [ ] Prove credential renewal/restart behavior and expected errors for unavailable credentials or denied S3 operations. Record role ARN, target, operation and outcome without signed credentials.

**Output:** T05 evidence linked to the exact backend revision and container environment.

### Step 4 — Test actual browser CORS

- [ ] List actual origin strings, including protocol and port. Current recorded origins include `http://18.208.53.186` and local development; do not assume an HTTPS/domain deployment is covered.
- [ ] Permit only the methods/headers needed by M2. Include any checksum headers actually signed. Expose response headers only when used by the browser protocol.
- [ ] Test preflight and upload from the real frontend origin, then direct final-image loading. A successful AWS CLI request does not exercise CORS.
- [ ] Test expired URL, changed header and rejected origin behavior. Treat CORS as browser behavior, not authorization: role/bucket policy and signed credentials must still enforce access.
- [ ] Verify no cookie/Authorization header is forwarded to S3 by `apiFetch`; the browser storage request is separate from authenticated API calls.

### Step 5 — Verify seed/public delivery and cleanup operations

- [ ] Match every seed row to a real object and verified content, using the 6.2 manifest. The historical count is 52 objects across 40 products; derive actual expected rows rather than checking only 40 URLs.
- [ ] Test public reads, MIME/length/cache metadata and representative browser decoding for JPEG/PNG/WebP. A 200 response alone can contain the wrong image.
- [ ] Verify cleanup scheduling, ownership checks, retries, credential renewal and alerting for exhausted jobs on isolated resources. No blanket `s3 sync --delete` or bucket-wide delete is part of this plan.
- [ ] Reconcile abandoned staging objects with C's durable upload state, including an upload finishing after URL expiry and a worker crash. Do not race active confirmation.
- [ ] Record rollback/recovery of policy and runtime config without deleting objects accepted during the rollout.

## Acceptance

- [ ] M1/M2/M3/M6/M7 resource/permission contracts resolved; exact test target and caller recorded.
- [ ] T05, relevant T06/T09/T12/T13, and production-equivalent container/browser checks pass on the isolated/staging environment.
- [ ] Final media is readable, pending media is private, unauthorized writes/deletes fail, required worker operations succeed.
- [ ] Seed ownership protection and byte-verified manifest exist; no local/test operation targets shared production assets.
- [ ] Infrastructure log records actual operations and evidence; production status is explicit and separate.

## Handoff

Give C the target config, credential source, allowed paths/actions, CORS headers and verification results. Give B actual upload method/headers/origins. Give E's release ledger the operational commands and recovery procedure. Mark this item complete only with these artifacts and tests; a role attachment or bucket creation alone is insufficient.
