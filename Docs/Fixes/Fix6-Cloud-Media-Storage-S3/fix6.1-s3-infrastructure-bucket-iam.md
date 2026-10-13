# Fix 6.1: AWS S3 Infrastructure, Bucket Security & EC2 IAM Integration

> **Parent Group:** [Fix 6: Cloud Object Storage (AWS S3) & Media Delivery](fix6-cloud-media-storage-s3.md)  
> **Status:** Complete  
> **Assigned To:** Member E (DevOps + Architecture)  
> **Depends On:** —  
> **Blocks:** Fix 6.2, Fix 6.3  
> **Priority:** Critical  
> **Infrastructure Reference:** [aws-infrastructure.md](../../Deployment/aws-infrastructure.md)  
> **Target Account / Region:** AWS Account `695945476492` / `us-east-1`  

---

## Problem & Motivation

1. **Database & Memory Bloat:** Storing raw high-resolution image binaries in PostgreSQL (`BYTEA`) causes rapid table bloat, increases database backup snapshot sizes, and consumes excessive memory on the single EC2 instance (`t3.micro`).
2. **Offloading Cloud Media:** The course lecturer approved using AWS S3 for media storage. To implement this cleanly and drop `BYTEA` entirely, we must provision a dedicated S3 bucket, configure public read access for media objects, and connect it to our existing EC2 instance without exposing credentials.

---

## Tasks (Member E)

### 1. S3 Bucket Provisioning & Access Policy
- [x] Create S3 bucket in `us-east-1`:
  ```bash
  aws s3api create-bucket \
    --bucket brightbuy-media-storage-695945476492 \
    --region us-east-1
  ```
- [x] Enable default server-side encryption with Amazon S3 managed keys (SSE-S3):
  ```bash
  aws s3api put-bucket-encryption \
    --bucket brightbuy-media-storage-695945476492 \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  ```
- [x] Configure bucket public read policy for catalog images:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::brightbuy-media-storage-695945476492/products/*"
      }
    ]
  }
  ```
- [x] Configure bucket CORS policy to permit direct client pre-signed uploads and frontend asset fetching:
  ```json
  [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": [
        "http://18.208.53.186",
        "http://localhost:3000",
        "http://localhost:5000"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

### 2. Initial Seed Asset Upload to S3
- [x] Run seed migration script to extract existing seed images and upload to S3:
  ```bash
  aws s3 sync backend/db/seed/assets/ s3://brightbuy-media-storage-695945476492/products/
  ```

### 3. IAM Instance Profile & EC2 Attachment (Zero Hardcoded Credentials)
- [x] Create IAM trust policy document allowing EC2 instance to assume role:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": { "Service": "ec2.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }
    ]
  }
  ```
- [x] Create IAM Role: `BrightBuy-EC2-S3-Access-Role`.
- [x] Attach least-privilege IAM policy scoped strictly to `brightbuy-media-storage-695945476492`:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::brightbuy-media-storage-695945476492",
          "arn:aws:s3:::brightbuy-media-storage-695945476492/*"
        ]
      }
    ]
  }
  ```
- [x] Create IAM Instance Profile and attach it to live EC2 instance `i-0a19078299834fba2`:
  ```bash
  aws iam create-instance-profile --instance-profile-name BrightBuy-EC2-Instance-Profile
  aws iam add-role-to-instance-profile --instance-profile-name BrightBuy-EC2-Instance-Profile --role-name BrightBuy-EC2-S3-Access-Role
  aws ec2 associate-iam-instance-profile --instance-id i-0a19078299834fba2 --iam-instance-profile Name=BrightBuy-EC2-Instance-Profile
  ```

### 4. Server Environment & Audit Logging
- [x] Update `/home/ubuntu/BrightBuy/.env.prod` on EC2:
  ```env
  AWS_REGION=us-east-1
  AWS_S3_BUCKET_NAME=brightbuy-media-storage-695945476492
  ```
- [x] Document all generated ARNs, bucket names, and CLI audit logs into [Docs/Deployment/aws-infrastructure.md](../../Deployment/aws-infrastructure.md).

---

## Definition of Done

1. S3 bucket `brightbuy-media-storage-695945476492` exists and responds to AWS CLI queries.
2. IAM Instance Profile is associated with instance `i-0a19078299834fba2`.
3. An S3 read/write test from within the EC2 instance succeeds without requiring static API keys or secrets in `.env`.
4. All initial product seed images are stored in S3 and return HTTP 200 via direct URL.
5. All commands and resource IDs are logged in `aws-infrastructure.md`.
