# Phase 10.6: Production Deployment

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** In Progress
> **Assigned To:** E
> **Depends On:** 10.1, 10.2, 10.3, 10.4, 10.5
> **Blocks:** — (final subphase)

---

## Architecture Overview

All services are self-hosted on a **single AWS EC2 instance** using Docker Compose. The server runs **4 containers** orchestrated together:

| Container | Image / Build | Purpose | Ports |
|-----------|--------------|---------|-------|
| **db** | `postgres:15-alpine` | PostgreSQL engine hosting both `brightbuy_prod` and `brightbuy_dev` databases | 5432 (internal + firewall-restricted external) |
| **backend** | Custom (Express.js) | REST API server | 5000 (internal only) |
| **frontend** | Custom (Next.js) | Server-side rendered storefront & admin UI | 3000 (internal only) |
| **nginx** | `nginx:alpine` + Certbot | Reverse proxy, HTTPS/SSL termination, request routing | 80, 443 (public) |

### Two-Database Strategy

A single PostgreSQL container hosts **two isolated databases** on the same engine:

- **`brightbuy_prod`** — Used exclusively by the live website (`main` branch deployed on the server). Clean, stable data only.
- **`brightbuy_dev`** — Used by team members connecting from their local machines for ongoing development. Safe to experiment and break.

This ensures local development never corrupts or pollutes the live site.

### Request Routing (Nginx)

- `https://<domain>/api/*` → forwarded to the **backend** container (port 5000)
- `https://<domain>/*` → forwarded to the **frontend** container (port 3000)
- All traffic is encrypted via free SSL certificates (Let's Encrypt / Certbot)

### Tooling: AWS CLI-First Approach

All AWS infrastructure provisioning (EC2 instances, security groups, key pairs, Elastic IPs) is performed entirely via the **AWS CLI** — no manual clicking in the AWS Console. This makes the deployment fully scriptable, reproducible, and executable by the agent directly from the terminal.

**Required:** The AWS CLI must be installed and configured locally with valid credentials (`aws configure`) before starting Stage 1.

**Documentation Rule:** Every AWS CLI operation (and its output/result, e.g. instance IDs, Elastic IPs, security group IDs) MUST be recorded in `Docs/Deployment/aws-infrastructure.md`. This file serves as the single source of truth for all provisioned AWS resources, making the infrastructure fully auditable and reproducible.

---

## Deployment Stages

### Stage 0: AWS CLI Setup (Local Machine)

- [x] Install the AWS CLI on the local machine (`aws-cli/2.37.12` installed)
- [x] Run `aws configure` to set the Access Key ID, Secret Access Key, default region (`us-east-1`), and output format (`json`)
- [x] Verify connectivity with `aws sts get-caller-identity` (`arn:aws:iam::695945476492:root`)

### Stage 1: Host the Database (Enables Remote Development)

- [x] Create an EC2 key pair via AWS CLI for SSH access (`brightbuy-key`)
- [x] Create a Security Group via AWS CLI with inbound rules: port 22 (SSH), port 5432 (PostgreSQL) (`sg-0ea637458096f125b`)
- [x] Launch an EC2 instance via AWS CLI (`i-0a19078299834fba2`, `t3.micro`, Ubuntu 22.04 LTS)
- [x] Allocate and associate an Elastic IP via AWS CLI (`18.208.53.186`)
- [x] SSH into the instance and install Docker and Docker Compose (`Docker v29.9.0`, `Compose v5.6.0`)
- [x] Configure a swap file (2 GB) to prevent out-of-memory issues on low-RAM instances
- [x] Run the PostgreSQL container with a persistent volume (EBS-backed `brightbuy_db-data`)
- [x] Create both databases inside the container: `brightbuy_dev` and `brightbuy_prod`
- [x] Run Flyway migrations and seed data against both databases (20 migrations, 7 seed files applied to both)
- [x] Team members update their local `backend/.env` to point `DB_HOST` at the Elastic IP (`18.208.53.186`), targeting `brightbuy_dev`
- [x] Verify all team members can connect and query from their local machines (all 6 backend test suites, 69/69 tests passed against AWS `brightbuy_dev`)

### Stage 2: Containerize the Production Stack

- [ ] Create a production `docker-compose.prod.yml` (production builds, no hot-reload volumes, no source mounts)
- [ ] Create production Dockerfiles for backend and frontend (multi-stage builds, `npm run build`, `npm start`)
- [ ] Set up the Nginx container with reverse proxy configuration and Certbot for automatic SSL
- [ ] Configure production runtime environment variables on the EC2 host: create `/home/ubuntu/BrightBuy/.env.prod` (`chmod 600`) containing live secrets (`DB_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `LEMON_SQUEEZY_*`, `SMTP_*`, pointing to `brightbuy_prod`)
- [ ] Update EC2 Security Group via AWS CLI: add inbound rules for ports 80 and 443 (public); keep port 5432 restricted to team IPs
- [ ] Deploy the initial full stack manually to verify baseline connectivity over HTTPS

### Stage 3: Automated CI/CD Pipeline (GitHub Actions)

- [ ] Create GitHub Actions CI workflow (`.github/workflows/ci.yml`):
  - [ ] Trigger on push and pull request to `main`
  - [ ] Backend Job: Run Postgres service container, execute Flyway migrations & seeds, run `npm run lint` and `npm test` (all 6 test suites) + `npm run test:product`
  - [ ] Frontend Job: Run `npm run lint` and Next.js production build check (`npm run build`)
  - [ ] Docker Job: Verify backend and frontend production Docker images build successfully without errors
- [ ] Create GitHub Actions CD workflow (`.github/workflows/deploy.yml`):
  - [ ] Trigger on push to `main` (conditioned on passing CI checks)
  - [ ] SSH into AWS EC2 instance (`18.208.53.186`) using GitHub Secrets (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`)
  - [ ] Execute automated pull: `git pull origin main`
  - [ ] Rebuild and deploy containers: `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`
  - [ ] Run health check verification against the live container stack
- [ ] Configure GitHub Repository Secrets (Deployment access only: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`)

### Stage 4: Live Verification, Webhooks & Documentation

- [ ] Point the Lemon Squeezy webhook URL at the production HTTPS endpoint (`https://<domain>/api/payments/webhook`)
- [ ] Run the end-to-end smoke test on the live site: browse → register → cart → checkout → pay → admin → reports
- [ ] Test the CI/CD pipeline end-to-end with a sample test commit
- [ ] Update `README.md` with:
  - Live site URL
  - Deployment architecture diagram
  - CI/CD workflow explanation (GitHub Actions CI/CD trigger rules and secrets)
  - How team members connect locally to the dev database (`brightbuy_dev`)
  - Environment variable reference
- [ ] Document the automated update workflow: local edit → git push to branch → PR with CI tests passing → merge to `main` → automated CD deploy to EC2

---

## Definition of Done

- The PostgreSQL container is running on AWS EC2 with both `brightbuy_dev` and `brightbuy_prod` databases.
- Team members can connect their local codebases to `brightbuy_dev` for continued development.
- The full application stack (db + backend + frontend + nginx) is running and accessible over HTTPS.
- The Lemon Squeezy webhook is pointed at the production URL and payment flow works end-to-end.
- The full customer and admin flow works on the live URL: browse → register → cart → checkout → pay → admin → reports.
- GitHub Actions CI pipeline automatically runs linters, backend integration tests with Postgres, and frontend Next.js builds on all PRs/pushes.
- GitHub Actions CD pipeline automatically deploys passing `main` builds to the EC2 server with zero manual intervention.
- `README.md` documents the deployment architecture, live URL, CI/CD pipeline, and update workflow.

---

## Key Decisions & Notes

- **Rejected Vercel / Railway / Render:** Team chose a fully self-hosted AWS EC2 + Docker approach to demonstrate DevOps proficiency and maintain full control over the infrastructure.
- **Single Server, Two Databases:** Instead of separate dev and prod servers (which would double costs), a single PostgreSQL container hosts both `brightbuy_dev` and `brightbuy_prod` databases. This is zero extra cost and provides full environment isolation.
- **Nginx over direct port exposure:** Backend and frontend containers are never exposed to the public internet directly. Nginx handles all incoming traffic, provides SSL, and routes requests internally. This follows the industry-standard reverse proxy pattern.
- **Automated CI/CD Pipeline (GitHub Actions):** Shifted from manual SSH deployments to an automated GitHub Actions CI/CD pipeline. CI validates code quality (linters, full backend automated tests against a live Postgres container, Next.js build verification, Dockerfile builds) on all PRs. CD securely connects to the EC2 instance via SSH keys and automatically pulls and rebuilds the production stack upon merging to `main`.
- **Secrets Management Strategy (Hybrid Separation):**
  - **Deployment Secrets (GitHub Actions Secrets):** Stored strictly for SSH automation (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`). No application, database, or payment secrets are stored in GitHub.
  - **Application Runtime Secrets (EC2 Host `.env.prod`):** Stored directly on the EC2 host at `/home/ubuntu/BrightBuy/.env.prod` with `chmod 600`. Because `.env*` is in `.gitignore`, production credentials never leave the AWS boundary, never enter GitHub actions/logs, and are never overwritten during automated `git pull` updates.
- **AWS CLI-first provisioning:** All AWS infrastructure (EC2, security groups, key pairs, Elastic IPs) is created and managed via the AWS CLI, not the web console. This makes the setup fully scriptable, reproducible, and agent-executable.

