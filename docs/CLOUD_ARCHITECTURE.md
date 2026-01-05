# ☁️ Cloud Architecture Guide

**Your consultant is right.** This document teaches you to think like a systems architect, not just deploy code.

---

## 🎯 **THE RIGHT MENTAL MODEL**

### **Three Dimensions to Think About:**

```
1. ENVIRONMENTS (Where?)     → Local, Dev, Staging, Prod
2. SERVICES (What?)          → API, Database, Vector DB, Frontend
3. DOMAINS (How to access?)  → app.domain.com, api.domain.com
```

**Never mix these!** Each is independent and configurable.

---

## 1️⃣ **ENVIRONMENTS: Local → Dev → Staging → Prod**

### **The Four-Environment Model**

| Environment | Purpose | Who Uses | Can Break? | Real Data? |
|-------------|---------|----------|------------|------------|
| **Local** | Development, debugging | You (developer) | ✅ Yes | ❌ Fake |
| **Dev** | Team testing, integration | Dev team | ✅ Yes | ❌ Fake |
| **Staging** | Pre-release testing | QA, stakeholders | ⚠️ Carefully | ✅ Real shape, fake users |
| **Prod** | Real customers | End users | ❌ Never | ✅ Real |

### **Key Rule:**
> **Code is the same everywhere. Only configuration changes.**

**Example:**
```bash
# Local
DATABASE_URL=postgresql://localhost:5432/ai_workforce
GROQ_API_KEY=gsk_test_123
ENV=local

# Dev
DATABASE_URL=postgresql://dev-db.supabase.co/ai_workforce_dev
GROQ_API_KEY=gsk_dev_456
ENV=dev

# Staging
DATABASE_URL=postgresql://staging-db.supabase.co/ai_workforce_staging
OPENAI_API_KEY=sk-staging-789
ENV=staging

# Production
DATABASE_URL=postgresql://prod-db.supabase.co/ai_workforce_prod
OPENAI_API_KEY=sk-prod-xyz
ENV=production
```

---

## 2️⃣ **SERVICES: What Actually Runs?**

### **Your AI Workforce Platform Has 4 Service Layers:**

```
┌─────────────────────────────────────────┐
│  1. API Backend (Express + TypeScript)  │
│     - Agent orchestration               │
│     - Decision logic                    │
│     - Authentication                    │
│     - Permissions                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. Database Layer                      │
│     - Relational: Users, Orgs, Agents  │
│     - Vector: Memory, Embeddings        │
│     - Cache: Redis (optional)           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. AI / LLM Providers (External)       │
│     - Groq (free, dev)                  │
│     - OpenAI (paid, prod)               │
│     - Anthropic (optional)              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. Frontend (React + Vite)             │
│     - Admin dashboard                   │
│     - Role dashboards (CEO, CFO, etc.)  │
│     - Same codebase, different views    │
└─────────────────────────────────────────┘
```

### **Service Configuration per Environment:**

| Service | Local | Dev | Staging | Prod |
|---------|-------|-----|---------|------|
| **API Backend** | `localhost:5000` | Render/Railway | Render/Railway | Render/Railway |
| **Database** | Local Postgres | Supabase (dev) | Supabase (staging) | Supabase (prod) |
| **Vector DB** | Local Qdrant | Optional | Hosted Qdrant | Hosted Qdrant |
| **Redis** | Skip | Skip | Optional | Optional |
| **LLM** | Groq (free) | Groq (free) | OpenAI/Groq | OpenAI (paid) |
| **Frontend** | `localhost:3000` | Vercel (dev) | Vercel (staging) | Vercel (prod) |

---

## 3️⃣ **DOMAIN ARCHITECTURE: How Users Access**

### **Recommended Domain Strategy**

Assume your base domain: `aiworkforce.dev`

| Purpose | Domain | Environment | Users |
|---------|--------|-------------|-------|
| Main app | `app.aiworkforce.dev` | Production | End users |
| Admin console | `admin.aiworkforce.dev` | Production | Admins |
| API | `api.aiworkforce.dev` | Production | Frontend apps |
| Dev app | `dev-app.aiworkforce.dev` | Dev | Dev team |
| Dev API | `dev-api.aiworkforce.dev` | Dev | Dev frontend |
| Staging app | `staging-app.aiworkforce.dev` | Staging | QA team |
| Staging API | `staging-api.aiworkforce.dev` | Staging | Staging frontend |

### **Request Flow:**

```
User Browser
    ↓
app.aiworkforce.dev (Frontend - Vercel)
    ↓
api.aiworkforce.dev (Backend - Render)
    ↓
Database (Supabase) + LLM (Groq/OpenAI)
```

### **Important Rules:**

1. **Frontend NEVER decides permissions** → Backend always does
2. **API always returns same data structure** → Frontend adapts
3. **Admin sees more features** → Same backend, different UI

---

## 4️⃣ **ENVIRONMENT CONFIGURATION STRATEGY**

### **File Structure:**

```
ai-workforce-platform/
├── .env.local           ← Local development (gitignored)
├── .env.example         ← Template (tracked in git)
├── backend/
│   ├── .env.dev         ← Dev environment (gitignored)
│   ├── .env.staging     ← Staging (gitignored)
│   └── .env.production  ← Production (gitignored)
└── frontend/
    ├── .env.development
    ├── .env.staging
    └── .env.production
```

### **Example: `.env.local`**

```bash
# Environment
NODE_ENV=development
ENV=local

# API
API_PORT=5000
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://localhost:5432/ai_workforce
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# LLM
DEFAULT_LLM_PROVIDER=groq
DEFAULT_LLM_MODEL=llama-3.1-70b-versatile
GROQ_API_KEY=gsk_your_local_key

# Auth
JWT_SECRET=local-dev-secret-change-in-production
JWT_EXPIRES_IN=7d

# Optional Services (skip locally)
# REDIS_URL=
# VECTOR_DB_URL=
```

### **Example: `.env.production`**

```bash
# Environment
NODE_ENV=production
ENV=production

# API (set by Render)
API_PORT=5000
CORS_ORIGIN=https://app.aiworkforce.dev

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# LLM (Production - Paid)
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4
OPENAI_API_KEY=sk-prod-xxx

# Auth (CRITICAL: Strong secret)
JWT_SECRET=xxx-production-secret-xxx
JWT_EXPIRES_IN=7d

# Optional Services
REDIS_URL=redis://prod-redis.upstash.io:6379
VECTOR_DB_URL=https://prod-qdrant.example.com
```

---

## 5️⃣ **CLOUD HOSTING MODEL (Practical & Cost-Effective)**

### **Recommended Stack:**

| Component | Service | Cost (MVP) | Why? |
|-----------|---------|------------|------|
| **Backend** | Render / Railway / Fly.io | $0-7/month | Easy deploys, good free tier |
| **Database** | Supabase | $0/month | 500MB free, great DX |
| **Vector DB** | Skip initially | $0/month | SQL fallback works fine |
| **Redis** | Skip initially | $0/month | Not critical for MVP |
| **Frontend** | Vercel / Netlify | $0/month | Unlimited free for personal |
| **LLM** | Groq (dev), OpenAI (prod) | $0-50/month | Pay per use |

**Total MVP Cost: $0-60/month**

### **Deployment Architecture:**

```
┌─────────────────────────────────────────────┐
│  GitHub Repository (Source of Truth)        │
│  - main branch → Production                 │
│  - develop branch → Dev                     │
│  - staging branch → Staging                 │
└─────────────────────────────────────────────┘
              ↓ Auto-deploy on push
┌─────────────────────────────────────────────┐
│  Render (Backend)                           │
│  - aiworkforce-api-prod                     │
│  - aiworkforce-api-dev                      │
│  - aiworkforce-api-staging                  │
└─────────────────────────────────────────────┘
              +
┌─────────────────────────────────────────────┐
│  Vercel (Frontend)                          │
│  - aiworkforce-app-prod                     │
│  - aiworkforce-app-dev                      │
│  - aiworkforce-app-staging                  │
└─────────────────────────────────────────────┘
              ↓ Connected to
┌─────────────────────────────────────────────┐
│  Supabase (Databases)                       │
│  - aiworkforce-prod                         │
│  - aiworkforce-dev                          │
│  - aiworkforce-staging                      │
└─────────────────────────────────────────────┘
```

---

## 6️⃣ **HOW DEV / STAGING WORKS IN PRACTICE**

### **Dev Environment:**

**Purpose:** Team testing and integration

**Setup:**
```
Domain: dev-app.aiworkforce.dev
API: dev-api.aiworkforce.dev
Database: Supabase (dev project)
LLM: Groq (free tier)
Data: Fake organizations, test users
```

**Who Uses:**
- Developers testing new features
- Integration testing between services
- Can break without consequences

**Deploy Trigger:**
```bash
git push origin develop
# → Auto-deploys to dev.aiworkforce.dev
```

### **Staging Environment:**

**Purpose:** Pre-production validation

**Setup:**
```
Domain: staging-app.aiworkforce.dev
API: staging-api.aiworkforce.dev
Database: Supabase (staging project)
LLM: OpenAI (paid, test account)
Data: Real data shape, fake users
```

**Who Uses:**
- QA team
- Stakeholders for demo
- Final testing before production

**Deploy Trigger:**
```bash
git push origin staging
# → Auto-deploys to staging.aiworkforce.dev
```

---

## 7️⃣ **SECURITY & ACCESS CONTROL**

### **Admin Console vs Role Dashboards:**

```
┌──────────────────────────────────────┐
│  admin.aiworkforce.dev               │
│  - Only admin role can access        │
│  - Manage agents                     │
│  - View all decisions                │
│  - Configure business rules          │
│  - Audit logs                        │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  app.aiworkforce.dev                 │
│  - CEO sees: Strategic decisions     │
│  - CFO sees: Financial data          │
│  - HR sees: People management        │
│  - Backend enforces permissions      │
└──────────────────────────────────────┘
```

### **Critical Security Rules:**

1. **Frontend NEVER decides permissions**
   - Backend always validates via `authorize()` middleware
   - Frontend just hides/shows UI elements

2. **Environment-specific secrets**
   - Each environment has different JWT_SECRET
   - Each environment has different API keys
   - Never share secrets between environments

3. **CORS configured per environment**
   ```typescript
   // backend/src/index.ts
   app.use(cors({
     origin: process.env.CORS_ORIGIN, // Environment-specific
     credentials: true
   }));
   ```

---

## 8️⃣ **YOUR CURRENT CODEBASE: WHAT'S RIGHT, WHAT'S MISSING**

### ✅ **What You've Done Right:**

1. **Environment-based configuration**
   - `.env.example` template ✅
   - No hardcoded values ✅

2. **Multi-tenant architecture**
   - `organization_id` on all tables ✅
   - JWT with `organizationId` ✅

3. **Provider abstraction**
   - Can switch LLM providers via config ✅
   - Groq already added ✅

4. **Clean separation of concerns**
   - Middleware for auth ✅
   - Routes protected ✅

### ⚠️ **What You Need to Add:**

1. **Multiple environment configs**
   ```bash
   # Create these files:
   backend/.env.development
   backend/.env.staging  
   backend/.env.production
   ```

2. **Environment-aware code**
   ```typescript
   // backend/src/config/env.ts
   export const config = {
     env: process.env.ENV || 'local',
     isDev: process.env.ENV === 'dev',
     isStaging: process.env.ENV === 'staging',
     isProd: process.env.ENV === 'production'
   };
   ```

3. **Deployment configs**
   - `render.yaml` for backend
   - `vercel.json` for frontend

4. **Health check endpoint** (already have at `/health`) ✅

---

## 9️⃣ **STEP-BY-STEP: WHAT TO DO RIGHT NOW**

Your consultant is right: **Don't jump to cloud yet.**

### **Phase 1: Local First** (Do This Now)

```bash
# 1. Test locally
cp .env.example .env
# Edit .env with your Groq API key
npm run dev

# 2. Verify everything works
npm test

# 3. Commit clean checkpoint
git add .
git commit -m "feat: Add Groq provider and seed data

- Added Groq LLM provider for free tier
- Created seed scripts for test data
- Updated environment configuration
- Separated seed data from codebase

Co-Authored-By: Warp <agent@warp.dev>"
git push origin main
```

### **Phase 2: Design Cloud Infrastructure** (Do This Next)

1. Draw architecture diagram on paper
2. Plan domains (dev-api, staging-api, api)
3. Create Supabase projects (dev, staging, prod)
4. Get Groq API key
5. Plan deployment sequence

### **Phase 3: Deploy Dev Environment** (After Planning)

1. Create Render service
2. Connect to GitHub (develop branch)
3. Set environment variables
4. Deploy
5. Run migrations
6. Seed data
7. Test

### **Phase 4: Add Staging & Prod** (When Ready)

Follow same pattern as Dev, but:
- Different domains
- Different databases
- Different secrets
- More monitoring

---

## 🔟 **FOUNDER-LEVEL INSIGHT**

Your consultant said:
> "You are not just deploying code. You are defining how AI exists inside an organization."

**This is profound.** Here's what it means:

1. **Clean environments = Trust**
   - Companies trust systems that don't break
   - Staging catches issues before customers see them

2. **Clean domains = Professionalism**
   - `app.aiworkforce.dev` looks professional
   - `localhost:3000` doesn't inspire confidence

3. **Clean separation = Scale**
   - When Company 50 signs up, no code changes needed
   - Just: add to database, assign `organization_id`

4. **You're building infrastructure, not a demo**
   - Demos have one environment
   - Products have four environments
   - Platforms have infrastructure

---

## 1️⃣1️⃣ **ANSWERING YOUR ORIGINAL QUESTION**

**You asked:** "Should I test locally (A), deploy to cloud (B), or commit (C)?"

**The right answer based on cloud architecture:**

```
✅ Step 1: Option A (Test locally)
   - Verify Groq works
   - Verify seed data loads
   - Verify agents respond

✅ Step 2: Option C (Commit code)
   - Save clean checkpoint
   - Push to GitHub
   - Preserve working state

✅ Step 3: Design cloud architecture (This document)
   - Understand environments
   - Plan domains
   - Choose services

✅ Step 4: Deploy Dev only (Not all environments)
   - Just dev environment
   - Test cloud deployment
   - Learn the process

✅ Step 5: Add Staging & Prod later
   - When dev is stable
   - When you have customers
   - When you need it
```

---

## 🎯 **SUMMARY: THE RIGHT PATH FORWARD**

Your consultant taught you to think in three dimensions:

1. **Environments:** Local → Dev → Staging → Prod
2. **Services:** API, DB, Vector, Frontend, LLM
3. **Domains:** app, admin, API subdomains

**Your codebase is already well-structured.** You just need to:
1. Add environment-specific configs
2. Test locally first
3. Deploy to Dev when ready
4. Add Staging/Prod later

**You're building this the right way.** Most developers skip this thinking and regret it later.

---

**Ready to test locally and commit?** That's the next step. We'll deploy to cloud after.
