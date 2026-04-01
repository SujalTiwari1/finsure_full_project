# FinSure â€” Frontend Product Requirements Document (PRD)

This document defines what the **React (or SPA) frontend** must implement to integrate with the **FinSure Node.js backend** as built today. All paths are relative to the API base URL (e.g. `http://127.0.0.1:5000` in development).

**Related:** Backend overview lives in `finsure_backend/prd.md`. The Python **FastAPI** service is reached **only through the backend** (except local tooling); the frontend should call the Node API only.

---

## 1. Conventions

### 1.1 Base URL & environment

| Variable | Example | Usage |
|----------|---------|--------|
| `VITE_API_URL` / `REACT_APP_API_URL` | `http://127.0.0.1:5000` | Prefix for every request |

All routes below omit the base URL: use `${API_BASE}/health`, etc.

### 1.2 Content types

- **JSON** endpoints: `Content-Type: application/json`
- **Multipart** endpoints: `Content-Type: multipart/form-data` (browser sets boundary)
- **Auth (protected routes):** `Authorization: Bearer <access_token>`

### 1.3 Token handling (required UX)

1. On **signup** or **login**, store:
   - `accessToken` (field name in API: `token`)
   - `refreshToken`
2. Attach **`Authorization: Bearer <accessToken>`** on every protected request.
3. When the API returns **401**, call **`POST /api/auth/refresh`** with `{ "refreshToken" }`, update `accessToken`, retry once.
4. On failed refresh or **401** "revoked", clear tokens and redirect to **login**.
5. **Logout:** call **`POST /api/auth/logout`** with Bearer access token, then clear local tokens (refresh tokens for that user stop working server-side).

### 1.4 Error response shape (typical)

| Status | Body shape | Meaning |
|--------|------------|---------|
| **400** | `{ "error": "message" }` | Validation / bad input |
| **401** | `{ "error": "message" }` | Missing/invalid token, bad credentials |
| **404** | `{ "error": "message" }` | Resource not found |
| **409** | `{ "error": "Email is already registered." }` | Duplicate signup |
| **500** | `{ "error": "Internal server error." }` | Server bug |
| **503 / 504** | `{ "error": "...", "detail": ... }` | ML unreachable or timeout (proxied upstream) |

Upstream ML errors may include **`detail`** as string or structured FastAPI `detail`.

---

## 2. Shared data types

### 2.1 `User` (public â€” no password)

Returned inside `{ "user": ... }` or as nested object fields:

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | MongoDB ObjectId as string |
| `name` | string | |
| `email` | string | Lowercased by backend |
| `age` | number | |
| `city` | string | |
| `dependents` | number | |
| `income` | number | Monthly, same unit as backend (INR) |
| `createdAt` | string (ISO date) | |
| `updatedAt` | string (ISO date) | |

### 2.2 `Transaction` (ML / analyze)

Used in JSON bodies for `/api/ml/*` and returned inside analyze / stored analysis `result`:

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `date` | string | yes | e.g. `YYYY-MM-DD` |
| `description` | string | yes | |
| `amount` | number | yes | |
| `type` | string | yes | e.g. `credit` / `debit` |
| `category` | string or null | no | Filled after categorization |

### 2.3 Analyze / stored `result` (high level)

After a successful **`POST /api/analyze`**, the API returns ML fields plus `analysisId`. The persisted `result` (from **`GET /api/analysis/:id`**) contains:

| Key | Description |
|-----|-------------|
| `transactions` | Array of categorized transactions |
| `total_transactions` | number |
| `cash_flow` | Object: income/expense totals, savings, EMI, category_totals, runway_months, etc. |
| `risk` | Object: `fri_score`, `risk_level`, `breakdown` |
| `recommendations` | Object: insurance recommendations from ML |

Exact nested keys match the FastAPI `analyze` pipeline (backend / finsure_ml `analyze_service`).

---

## 3. API reference (every endpoint)

### 3.1 Health (optional for UI)

| Item | Value |
|------|--------|
| **Method / path** | `GET /health` |
| **Auth** | None |
| **Request** | No body |
| **Success 200** | `{ "status": "ok", "service": "finsure_backend", "mongodb": "connected" or "disconnected" }` |

**Use:** Admin/dev status, readiness checksâ€”not required for normal users.

---

### 3.2 Authentication

#### `POST /api/auth/signup`

| Item | Value |
|------|--------|
| **Auth** | None |
| **Request body (JSON)** | See table below |

| Field | Type | Validation (backend) |
|-------|------|----------------------|
| `name` | string | Required, non-empty trim |
| `email` | string | Valid email |
| `password` | string | Min **8** characters |
| `age` | number | Integer **18â€“100** |
| `city` | string | Required |
| `dependents` | number | Integer >= 0 |
| `income` | number | >= 0 |

**Success 201**

```json
{
  "token": "<access JWT>",
  "refreshToken": "<refresh JWT>",
  "user": { "...User" }
}
```

**Errors:** `400` validation, `409` email exists.

---

#### `POST /api/auth/login`

| Item | Value |
|------|--------|
| **Auth** | None |
| **Request body (JSON)** | `{ "email": string, "password": string }` |

**Success 200**

```json
{
  "token": "<access JWT>",
  "refreshToken": "<refresh JWT>",
  "user": { "...User" }
}
```

**Errors:** `400` bad input, `401` invalid email or password.

---

#### `POST /api/auth/refresh`

| Item | Value |
|------|--------|
| **Auth** | None |
| **Request body (JSON)** | `{ "refreshToken": string }` |

**Success 200**

```json
{ "token": "<new access JWT>" }
```

**Errors:** `400` missing token, `401` invalid/expired/revoked refresh.

---

#### `POST /api/auth/logout`

| Item | Value |
|------|--------|
| **Auth** | **Bearer access token** |
| **Request** | No body |
| **Success 200** | `{ "ok": true }` |

Invalidates refresh tokens server-side. Clear both tokens client-side after success.

---

#### `GET /api/auth/profile`

| Item | Value |
|------|--------|
| **Auth** | **Bearer access token** |
| **Request** | No body |
| **Success 200** | `{ "user": { ...User } }` |

**Errors:** `401` if token invalid or user deleted.

---

### 3.3 File upload (archive PDF on server)

#### `POST /api/upload`

| Item | Value |
|------|--------|
| **Auth** | **Bearer access token** |
| **Request** | `multipart/form-data` |
| **Part** | `file` â€” PDF only, max **10 MB** (`application/pdf` or `application/octet-stream`) |

**Success 201**

```json
{
  "message": "File uploaded",
  "storedFilename": "<userId>_<timestamp>_<sanitized>.pdf",
  "relativePath": "uploads/...",
  "originalName": "<client filename>",
  "size": <bytes>
}
```

**Errors:** `400` wrong type / missing file / Multer limit, `401` unauthorized.

**Note:** This **does not** run ML. It only stores the file. The main user journey for scoring is **`POST /api/analyze`**.

---

### 3.4 Full analysis pipeline (primary product flow)

#### `POST /api/analyze`

| Item | Value |
|------|--------|
| **Auth** | **Bearer access token** (required) |
| **Request** | `multipart/form-data` |

| Part / field | Type | Rules |
|--------------|------|--------|
| `file` | File | **Required.** PDF, max 10 MB |
| `income` | text to number | **Required.** > 0 |
| `age` | text to integer | **Required.** **18â€“70** (ML contract) |
| `city` | string | **Required.** |
| `dependents` | text to integer | **Required.** >= 0 |
| `existing_term` | text to number | Optional; default **0** (existing term cover INR) |
| `existing_health` | text to number | Optional; default **0** (existing health cover INR) |

**Success 200** â€” ML payload spread **plus** persistence id:

- Same keys as FastAPI full analyze response (e.g. `success`, `filename`, `transactions`, `total_transactions`, `cash_flow`, `risk`, `recommendations`).
- **`analysisId`**: string â€” id for **`GET /api/analysis/:analysisId`**.

**Errors:** `400` validation, `401` auth, `503`/`504` ML down or timeout, other statuses proxied from ML with `detail`.

**Frontend must:**

- Show loading for **tens of seconds** possible (PDF + ML).
- Handle server errors with user-readable messages from `error` / `detail`.

---

### 3.5 Analysis history (MongoDB-backed)

#### `GET /api/analysis`

| Item | Value |
|------|--------|
| **Auth** | **Bearer access token** |
| **Request** | No body |
| **Success 200** | `{ "analyses": [ ... ] }` â€” up to **50** items, newest first |

Each list item:

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `createdAt` | ISO string | |
| `originalFilename` | string | |
| `income` | number | Snapshot at analysis time |
| `profile` | object | `{ age, city, dependents }` |
| `total_transactions` | number (optional) | |
| `risk` | object (optional) | e.g. `fri_score`, `risk_level`, `breakdown` |
| `cashFlow` | object (optional) | Subset: `total_income`, `total_expenses`, `savings_rate_pct` |

**Note:** List intentionally **omits** full `transactions` and heavy recommendation blobs. Use detail endpoint for full data.

---

#### `GET /api/analysis/:analysisId`

| Item | Value |
|------|--------|
| **Auth** | **Bearer access token** |
| **URL param** | `analysisId` â€” Mongo ObjectId string |
| **Success 200** | Full document with `result` containing transactions, cash_flow, risk, recommendations |

```json
{
  "id": "<string>",
  "createdAt": "<ISO>",
  "updatedAt": "<ISO>",
  "originalFilename": "<string>",
  "income": <number>,
  "age": <number>,
  "city": "<string>",
  "dependents": <number>,
  "existingTerm": <number>,
  "existingHealth": <number>,
  "result": {
    "transactions": [ ],
    "total_transactions": <number>,
    "cash_flow": { },
    "risk": { },
    "recommendations": { }
  }
}
```

**Errors:** `400` invalid id, `401` unauthorized, `404` not found or not owned by user.

---

### 3.6 ML step proxies (optional in UI â€” mostly for debugging / advanced)

These **`POST /api/ml/*`** routes are **unauthenticated** today. They forward JSON to FastAPI. A minimal consumer app can **ignore** them and use only **`POST /api/analyze`**.

#### `POST /api/ml/categorize`

**Body (JSON):** `{ "transactions": [ ...Transaction ] }` â€” non-empty array.

**Success 200:** Proxied ML body, e.g. `{ "success": true, "total": n, "transactions": [ ... ] }`.

---

#### `POST /api/ml/risk-score`

**Body (JSON):**

| Field | Type |
|-------|------|
| `income` | number > 0 |
| `dependents` | integer >= 0 |
| `transactions` | non-empty array (prefer **categorized**) |

**Success 200:** e.g. `{ "success", "fri_score", "risk_level", "features", "breakdown" }`.

---

#### `POST /api/ml/recommend`

**Body (JSON):**

| Field | Type |
|-------|------|
| `income` | number > 0 |
| `age` | integer 18â€“70 |
| `city` | string |
| `dependents` | integer >= 0 |
| `fri_score` | number |
| `fri_breakdown` | object (from risk step) |
| `features` | object (from risk step) |
| `existing_term` | number (optional, >= 0) |
| `existing_health` | number (optional, >= 0) |

**Success 200:** Proxied ML recommendations object.

---

#### `POST /api/ml/pipeline`

**Body (JSON):**

| Field | Type |
|-------|------|
| `transactions` | non-empty Transaction array |
| `income` | number > 0 |
| `dependents` | integer >= 0 |
| `age` | integer 18â€“70 |
| `city` | string |
| `existing_term` | optional |
| `existing_health` | optional |

**Success 200:**

```json
{
  "success": true,
  "categorize": { },
  "risk": { },
  "recommend": { }
}
```

---

## 4. CORS and cookies

- Backend uses `cors` with `credentials: true`. If the frontend is on another origin, set backend `CORS_ORIGIN` to that origin (e.g. `http://localhost:5173`).
- Tokens are returned in **JSON** (not HttpOnly cookies); store in **memory** plus **sessionStorage** or **secure** persistence per your threat model.

---

## 5. Pages / screens to build (recommended)

To **serve** signup to login to **run a bank-statement analysis** to **view history** to **profile**, plan the following **six core pages** (routes). You can merge or split for UX, but this is the minimum set of **distinct user intents**.

| # | Route (example) | Purpose | Primary APIs |
|---|-----------------|--------|--------------|
| **1** | `/login` | Sign in | `POST /api/auth/login`, then optional `GET /api/auth/profile` |
| **2** | `/signup` | Register | `POST /api/auth/signup` |
| **3** | `/dashboard` (or `/`) | Home after auth: shortcuts plus recent history | `GET /api/analysis`, nav to analyze / profile / logout |
| **4** | `/analyze` (or `/statements/new`) | Upload PDF and profile fields; run pipeline | `POST /api/analyze`; navigate to detail using `analysisId` |
| **5** | `/analysis/:id` | Full report: cash flow, risk, recommendations, transactions | `GET /api/analysis/:analysisId` |
| **6** | `/profile` | View account and logout | `GET /api/auth/profile`, `POST /api/auth/logout` |

### Optional / secondary

| Page | When to include |
|------|-----------------|
| **Dedicated `/history`** | If list is long or filtered; otherwise embed list in **Dashboard**. |
| **`/upload` only** | Rarely needed alone; **`/analyze`** already accepts PDF. Use `/api/upload` only if product requires save file now, analyze later. |
| **ML playground (`/dev/ml`)** | Internal testing for `/api/ml/*`; omit in production. |

### Count summary

- **Minimum for full product story:** **6 pages** (Login, Signup, Dashboard, New Analysis, Analysis Detail, Profile).
- **Optional 7th page:** standalone **History** if not embedded in Dashboard.

---

## 6. User flows (acceptance-oriented)

1. **Register** on `/signup` then receive tokens then redirect to **Dashboard**.
2. **Login** on `/login` then Dashboard.
3. From **Dashboard**, open **New analysis**, pick PDF and form, **Submit**, show loading, on success show results and link **View saved report** (`/analysis/:analysisId`).
4. **Dashboard** lists past runs (`GET /api/analysis`); click opens **Analysis detail**.
5. **Profile** shows `GET /api/auth/profile`; **Logout** calls `POST /api/auth/logout` and clears tokens.

---

## 7. Non-functional notes for frontend

- **Loading states:** Analyze and ML calls can exceed **10 s**; use progress or spinner and disable double submit.
- **File validation:** Client-side: PDF only, size <= 10 MB before upload (mirror server rules).
- **Accessibility:** Form labels for all analyze fields; surface API errors near fields where possible.
- **Security:** Never log tokens; use HTTPS in production.

---

## 8. Document control

| Field | Value |
|-------|--------|
| **Product** | FinSure |
| **Backend** | `finsure_backend` (Express + MongoDB + ML proxy) |
| **Last aligned** | 2026-04-01 |

When backend contracts change, update this file and bump **Last aligned**.

