# Phase 3.1: Auth API Endpoints

> **Parent Phase:** [Phase 3: Authentication System](phase3-authentication-system.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** Phase 2
> **Blocks:** 3.2, 3.3 (integration), 3.4, 8.2
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Implement every auth endpoint using a fully custom JWT solution with `HttpOnly` cookies.

---

## Tasks

- [x] JWT and bcrypt helpers in `backend/src/utils/` (sign/verify access + refresh tokens, hash/compare passwords)
- [x] `POST /api/auth/register` — create the `users` + `customers` rows in a single transaction with a bcrypt-hashed password
- [x] `POST /api/auth/login` — check credentials, issue a short-lived access token and a long-lived refresh token, set both as `HttpOnly` cookies
- [x] `POST /api/auth/refresh` — refresh with token rotation (invalidate the old refresh token, issue a new one)
- [x] `POST /api/auth/logout` — clear cookies and delete the refresh token from `refresh_tokens`
- [x] `GET /api/auth/me` — return the current user profile
- [x] Store refresh tokens **hashed** in `refresh_tokens` with an expiry
- [x] Cookie flags: `HttpOnly`, `SameSite`, `Secure` in production

---

## API Contracts

### `POST /api/auth/register`
```
Request Body: { email, password, first_name, last_name, phone? }
Response 201: { message: "Registration successful", user: { user_id, email, role } }
Response 409: { error: "Email already exists" }
Sets: HttpOnly cookies (access_token, refresh_token)
```

### `POST /api/auth/login`
```
Request Body: { email, password }
Response 200: { message: "Login successful", user: { user_id, email, role } }
Response 401: { error: "Invalid credentials" }
Sets: HttpOnly cookies (access_token, refresh_token)
```

### `POST /api/auth/refresh`
```
Request: (uses refresh_token from HttpOnly cookie)
Response 200: { message: "Token refreshed" }
Response 401: { error: "Invalid or expired refresh token" }
Sets: New HttpOnly cookies (access_token, refresh_token)
```

### `POST /api/auth/logout`
```
Response 200: { message: "Logged out" }
Clears: HttpOnly cookies
```

### `GET /api/auth/me`
```
Response 200: { user: { user_id, email, role, first_name, last_name } }
Response 401: { error: "Not authenticated" }
```

---

## Definition of Done

- All five endpoints match the contracts above.
- A reused (rotated-out) refresh token is rejected.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

