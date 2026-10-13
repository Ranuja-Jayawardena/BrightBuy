# Superseded: Use Revised Fix 6.2

> **Status:** Superseded; this file is not an implementation path or completion item.
> **Active document:** [Fix 6.2: Lossless Schema, Existing-Image & Seed Cutover](fix6.2-s3-schema-migration-seed-cutover.md).

The final architecture retires database BYTEA storage in favor of permanent S3 URLs. Retaining verified backups, original objects and a per-image manifest through the cutover/recovery window is required; this does not restore the old dual-mode serving design. Never interpret this superseded notice as permission to drop bytes before preservation is proven.

Revised 6.2 is In Progress: V26/seed code exists, generic mapping needs correction, and target verification remains pending. Follow its pre-V26 or post-V26 branch and the [shared evidence/release guide](fix6-contracts-verification-rollout.md).
