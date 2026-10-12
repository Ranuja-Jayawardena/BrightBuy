# AWS Infrastructure Registry

> **Purpose:** Single source of truth for all provisioned AWS cloud resources for BrightBuy. Every AWS CLI command executed and resource ID generated must be recorded here.
> **Related Phase:** [Phase 10.6: Production Deployment](../Phases/Phase10-Polish-Testing-Deployment/phase10.6-production-deployment.md)

---

## 1. AWS Account & Configuration

- **Target Region:** `us-east-1` (US East, N. Virginia)
- **AWS Account ID:** `695945476492`
- **IAM Identity:** `arn:aws:iam::695945476492:root` (Root user authenticated)

---

## 2. Provisioned Resources

### Compute (EC2)
- **Instance ID:** `i-0a19078299834fba2`
- **Instance Type:** `t3.micro` (Free Tier eligible)
- **AMI ID:** `ami-062944a84867f2386` (Ubuntu 22.04 LTS, amd64)
- **Key Pair Name:** `brightbuy-key` (`key-0cb6ddd075bcd7042`, saved at `~/.ssh/brightbuy-key.pem`)
- **Public Elastic IP:** `18.208.53.186` (`eipalloc-060a13c5bf4a1786a`)
- **Private IP:** `172.31.46.226`

### Security Group
- **Security Group ID:** `sg-0ea637458096f125b`
- **Security Group Name:** `brightbuy-security-group`
- **VPC ID:** `vpc-0d079c204937cbbee`
- **Inbound Rules:**
  - `22` (SSH) — `0.0.0.0/0` (`sgr-06808f3f8f612c9d5`)
  - `5432` (PostgreSQL) — `0.0.0.0/0` (`sgr-039900afe488787b4`)
  - `80` (HTTP) — Public (Stage 2)
  - `443` (HTTPS) — Public (Stage 2)

### Storage (EBS)
- **Root Volume Size:** 20 GB (gp3)
- **Persistent Volume:** `db-data` Docker volume on host filesystem

---

## 3. Execution Log (CLI Audit Trail)

| Timestamp | AWS CLI Command | Result / Resource ID | Notes |
|-----------|-----------------|----------------------|-------|
| 2026-10-12 | `winget install -e --id Amazon.AWSCLI` | `aws-cli/2.37.12` installed | AWS CLI v2 installed on local machine |
| 2026-10-12 | `aws configure set ...` | `us-east-1`, `json` | Configured CLI access keys and default region |
| 2026-10-12 | `aws sts get-caller-identity` | `UserId: 695945476492`, `Arn: arn:aws:iam::695945476492:root` | Verified connectivity to AWS account |
| 2026-10-12 | `aws ec2 create-key-pair --key-name brightbuy-key` | `key-0cb6ddd075bcd7042` | Created RSA key pair; saved private key to `~/.ssh/brightbuy-key.pem` |
| 2026-10-12 | `aws ec2 create-security-group --group-name brightbuy-security-group` | `sg-0ea637458096f125b` | Created security group in default VPC `vpc-0d079c204937cbbee` |
| 2026-10-12 | `aws ec2 authorize-security-group-ingress ...` | Ports `22`, `5432` authorized | Added inbound rules for SSH and PostgreSQL |
| 2026-10-12 | `aws ec2 run-instances ...` | `i-0a19078299834fba2` | Launched `t3.micro` Ubuntu 22.04 LTS instance with 20GB gp3 |
| 2026-10-12 | `aws ec2 allocate-address --domain vpc` | `18.208.53.186` (`eipalloc-060a13c5bf4a1786a`) | Allocated static Elastic IP in `us-east-1` |
| 2026-10-12 | `aws ec2 associate-address ...` | `eipassoc-030233ecc667abb7c` | Associated Elastic IP `18.208.53.186` to instance `i-0a19078299834fba2` |
| 2026-10-12 | `ssh ... setup-server.sh` | Docker `29.9.0`, Compose `5.6.0`, 2GB swap | Configured server environment on EC2 |
| 2026-10-12 | `docker compose -f docker-compose.db.yml up -d` | `brightbuy-postgres` container | Started PostgreSQL 15 on port 5432 with EBS volume |
| 2026-10-12 | `flyway migrate` (x2) | `V1`–`V20` applied | Migrated `brightbuy_dev` and `brightbuy_prod` schemas |
| 2026-10-12 | `psql < seed/*.sql` (x2) | Seeds `01`–`07` applied | Seeded `brightbuy_dev` and `brightbuy_prod` (21 tables, 8 users each) |
| 2026-10-12 | `npm test` (local) | 6/6 test suites passed (69/69) | Verified local backend test suite against AWS `brightbuy_dev` |

---

## 4. Secrets Management & CI/CD Credentials

The project employs a **Hybrid Separation of Secrets** strategy to prevent credential leakage and keep application secrets isolated inside AWS.

### 4.1 Deployment Secrets (GitHub Actions Repository Secrets)

Used exclusively by GitHub Actions to establish an SSH connection to EC2 to pull updates and rebuild containers:

| Secret Name | Value / Source | Scope | Description |
|-------------|----------------|-------|-------------|
| `EC2_HOST` | `18.208.53.186` | Actions Secret | Public Elastic IP associated with instance `i-0a19078299834fba2` |
| `EC2_USER` | `ubuntu` | Actions Secret | Default SSH user for Ubuntu 22.04 LTS AMI |
| `EC2_SSH_KEY` | Content of `~/.ssh/brightbuy-key.pem` | Actions Secret | RSA Private Key for instance SSH authentication |

### 4.2 Application Runtime Secrets (EC2 Host `.env.prod`)

All production application secrets reside exclusively on the EC2 host at `/home/ubuntu/BrightBuy/.env.prod` (`chmod 600`) and are consumed by `docker-compose.prod.yml` via `env_file: .env.prod`.

| Variable | Target Service | Purpose |
|----------|----------------|---------|
| `DB_HOST` | Backend | Points to internal `db` container |
| `DB_PORT` | Backend | Internal port `5432` |
| `DB_USER` | Backend | `postgres` |
| `DB_PASSWORD` | Backend / DB | Production DB password (`BrightBuy2026SecurePass!`) |
| `DB_NAME` | Backend | `brightbuy_prod` |
| `JWT_ACCESS_SECRET` | Backend | HMAC secret for short-lived access tokens |
| `JWT_REFRESH_SECRET` | Backend | HMAC secret for rotating refresh tokens |
| `LEMON_SQUEEZY_API_KEY` | Backend | Live API key for checkout sessions |
| `LEMON_SQUEEZY_STORE_ID` | Backend | Store identifier |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Backend | Secret for validating webhook signatures |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Backend | Nodemailer transactional email delivery credentials |

> **Security Note:** Because `.env*` is committed to `.gitignore`, `/home/ubuntu/BrightBuy/.env.prod` is completely ignored by Git. Automated `git pull origin main` during CI/CD will never overwrite, erase, or expose these production credentials.

