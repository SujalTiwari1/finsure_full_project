# 📄 FinSure Backend PRD

---

# 🧭 1. Overview

**System Name:** FinSure Backend
**Architecture:** MERN (Node.js + Express + MongoDB) + Python ML Service (FastAPI)

**Purpose:**
To orchestrate data flow from user input (bank statements + profile) → ML processing → financial insights → insurance recommendations.

---

# 🎯 2. Objectives

### Primary Goals

* Handle user authentication securely
* Process bank statements
* Integrate ML services (categorization, risk, recommendation)
* Store and serve analysis results

### Success Criteria

* End-to-end pipeline works in <10 seconds
* Accurate ML integration
* Clean API responses
* Secure user data handling

---

# 🧱 3. System Architecture

```id="h2qk52"
Frontend (React)
        ↓
Node.js Backend (API Gateway)
        ↓
Python ML Service (FastAPI)
        ↓
MongoDB Database
```

---

# 📁 4. Folder Structure

```id="5o9h0m"
backend/
│
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   ├── app.js
│   └── server.js
│
├── uploads/
├── .env
├── package.json
```

---

# 🔐 5. Authentication Module

## Features

* User signup/login
* JWT-based authentication
* Password hashing

## Endpoints

```id="b8s1v9"
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/profile
```

## Data Model

```json id="6jtsrm"
{
  "name": "string",
  "email": "string",
  "password": "hashed",
  "age": 30,
  "city": "Mumbai",
  "dependents": 2,
  "income": 50000
}
```

---

# 📤 6. File Upload Module

## Features

* Upload bank statement (PDF)
* Store file locally
* Pass to parsing service

## Endpoint

```id="p6o2fx"
POST /api/upload
```

---

# 📊 7. Analysis Pipeline (CORE FEATURE)

## Flow

```id="x7t1mb"
Upload PDF
   ↓
Parse transactions
   ↓
Categorize (ML)
   ↓
Cashflow calculation
   ↓
Risk scoring (ML)
   ↓
Recommendation (ML)
   ↓
Store in DB
   ↓
Return response
```

---

## Endpoint

```id="6tw5mg"
POST /api/analyze
```

---

## Request

```json id="n3q2og"
{
  "file": "PDF",
  "userId": "string"
}
```

---

## Response

```json id="5n3c0m"
{
  "cashflow": {},
  "risk": {},
  "recommendations": {}
}
```

---

# 🤖 8. ML Integration

## Services

* `/categorize`
* `/risk-score`
* `/recommend`

## Integration Layer

```id="pq5m9x"
services/ml.service.js
```

---

# 🗄️ 9. Database Design (MongoDB)

## Collections

### Users

* Profile + auth data

### Transactions

* Parsed financial data

### Analysis

* Cashflow + risk + recommendations

---

# 🔌 10. API Endpoints Summary

### Auth

```id="6u9kzm"
POST /api/auth/signup
POST /api/auth/login
```

### Upload

```id="fj1qgm"
POST /api/upload
```

### Analysis

```id="d9n8su"
POST /api/analyze
GET  /api/analysis/:userId
```

---

# ⚙️ 11. Core Services

### ML Service

* Handles API calls to Python backend

### PDF Service

* Extract transactions

### Cashflow Service

* Compute:

  * Income
  * Expenses
  * Savings
  * EMI ratio

---

# 🧠 12. Business Logic Responsibilities

| Layer      | Responsibility          |
| ---------- | ----------------------- |
| Controller | Handle request/response |
| Service    | Business logic          |
| ML Service | AI processing           |
| Model      | DB schema               |
| Middleware | Auth + error handling   |

---

# 🚀 13. Development Phases

---

## ⚡ Phase 1: Setup (1–2 hrs)

* Initialize Node.js project
* Setup Express server
* MongoDB connection

---

## ⚡ Phase 2: Authentication (2 hrs)

* Signup/Login APIs
* JWT middleware
* Test auth flow

---

## ⚡ Phase 3: File Upload (2 hrs)

* Setup multer
* Upload PDF
* Store file

---

## ⚡ Phase 4: ML Integration (3 hrs)

* Connect FastAPI endpoints
* Test categorize → risk → recommend

---

## ⚡ Phase 5: Analysis Pipeline (4 hrs)

* Build `/analyze` endpoint
* Integrate all steps
* Return combined response

---

## ⚡ Phase 6: Database Integration (2 hrs)

* Store results
* Fetch history

---

## ⚡ Phase 7: Testing & Debugging (2 hrs)

* Handle edge cases
* Fix errors
* Validate outputs

---

# ⚠️ 14. Constraints

* No real bank API integration
* No payment gateway
* No real insurance purchase
* Local PDF parsing only

---

# 🔮 15. Future Scope

* Account Aggregator integration
* Real-time financial tracking
* Insurance marketplace
* Advanced ML models

---

# 🧠 16. Key Design Principles

* Keep backend as orchestrator
* ML service handles intelligence
* Keep APIs clean and minimal
* Prioritize explainability

---

# 🎯 17. Success Definition

A successful backend:

* Accepts a bank statement
* Processes financial data
* Returns risk score + recommendations
* Works end-to-end without failure

---

# 🎤 18. Pitch Line

> “Our backend acts as an intelligent financial pipeline — transforming raw bank data into actionable insurance insights using AI.”

---
