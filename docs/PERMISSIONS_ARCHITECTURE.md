# 🔐 Permissions & Data Isolation Architecture

This document explains how the AI Workforce Platform handles **multi-tenancy**, **data isolation**, and **permissions** when hosted on a company's domain.

---

## 🏢 **THE BIG PICTURE: Multi-Tenant SaaS Model**

### **What This System Is:**
Your platform is a **Multi-Tenant SaaS** (Software as a Service) application where:
- **Multiple companies** use the same application (same codebase, same servers)
- Each company's data is **completely isolated** from others
- Users within a company have **role-based permissions**
- Agents within a company have **authority levels** and **permissions**

### **Real-World Example:**

```
Your Platform (ai-workforce.com)
├── Company A (TechStart Inc)
│   ├── Users: admin@techstart.com, ceo@techstart.com
│   ├── Agents: CEO Agent, CFO Agent
│   └── Data: Decisions, Memory, Business Rules
│
└── Company B (FinCorp Ltd)
    ├── Users: admin@fincorp.com, hr@fincorp.com
    ├── Agents: HR Agent, Sales Agent
    └── Data: Decisions, Memory, Business Rules
```

**Critical Rule:** Company A can NEVER see or access Company B's data.

---

## 🔑 **HOW DATA ISOLATION WORKS**

### **1. Database-Level Isolation (Organization ID)**

Every table has an `organization_id` column:

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR,
  organization_id UUID,  ← KEY: Links user to organization
  role VARCHAR,
  ...
);

-- Agents Table
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  organization_id UUID,  ← KEY: Agent belongs to org
  role VARCHAR,
  ...
);

-- Decisions Table
CREATE TABLE decisions (
  id UUID PRIMARY KEY,
  organization_id UUID,  ← KEY: Decision belongs to org
  agent_id UUID,
  ...
);

-- Memory Table
CREATE TABLE memory (
  id UUID PRIMARY KEY,
  organization_id UUID,  ← KEY: Memory belongs to org
  agent_id UUID,
  ...
);
```

**How It Works:**
1. User logs in → JWT token includes `organizationId`
2. Every API request checks: `WHERE organization_id = req.user.organizationId`
3. User can ONLY see/modify data from their organization

---

### **2. JWT Token-Based Authentication**

**Login Flow:**
```typescript
// User logs in
POST /api/auth/login
{
  "email": "admin@techstart.com",
  "password": "secure123"
}

// Server verifies credentials, creates JWT token
const token = jwt.sign({
  id: user.id,
  email: user.email,
  role: user.role,
  organizationId: user.organization_id  ← CRITICAL
}, JWT_SECRET);

// Token returned to client
{ "token": "eyJhbGc..." }
```

**Every Subsequent Request:**
```typescript
// Client sends token in header
Authorization: Bearer eyJhbGc...

// Middleware decodes token
const decoded = jwt.verify(token);
// decoded = {
//   id: "user-123",
//   email: "admin@techstart.com",
//   organizationId: "org-abc"  ← Used for ALL queries
// }
```

---

### **3. Automatic Query Filtering**

**Example: Getting Agents**
```typescript
// User from Company A requests agents
GET /api/agents

// Code in agents.ts (line 17-24)
const organizationId = req.user?.organizationId; // org-abc (Company A)

const agents = await db.selectFrom('agents')
  .selectAll()
  .where('organization_id', '=', organizationId)  ← FILTER
  .execute();

// Result: ONLY agents from Company A returned
// Company B's agents are NEVER in the query results
```

**Example: Chatting with Agent**
```typescript
// User tries to chat with an agent
POST /api/agents/agent-xyz/chat

// Code checks (line 66-74)
const agentData = await db.selectFrom('agents')
  .where('id', '=', 'agent-xyz')
  .where('organization_id', '=', req.user.organizationId)  ← CRITICAL
  .executeTakeFirst();

if (!agentData) {
  throw new AppError('Agent not found', 404);
}

// IF agent-xyz belongs to Company B:
//   - Query returns null
//   - User gets 404 error
//   - Chat NEVER happens
```

---

## 🎭 **ROLE-BASED PERMISSIONS (Within Organization)**

### **Permission Levels:**

#### **1. User Roles** (Who can do what)

```typescript
type UserRole = 'admin' | 'ceo' | 'cfo' | 'hr' | 'sales' | 'support';
```

| Role | Permissions | Use Case |
|------|-------------|----------|
| `admin` | Full access, manage agents, approve all decisions | IT admin, founder |
| `ceo` | Approve high-level decisions, view all agents | Executive oversight |
| `cfo` | Approve financial decisions, access financial data | Finance team |
| `hr` | Manage HR agent, approve hiring decisions | HR team |
| `sales` | Access sales agent, view sales data | Sales team |
| `support` | Access support agent, handle tickets | Support team |

**Implementation:**
```typescript
// In auth.ts middleware
export const authorize = (...roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};

// Usage in routes
router.post('/admin/agents', authorize('admin'), createAgent);
router.get('/decisions', authorize('admin', 'ceo', 'cfo'), getDecisions);
```

#### **2. Agent Authority Levels** (What agents can do autonomously)

```typescript
type AuthorityLevel = 'low' | 'medium' | 'high';
```

| Level | Can Auto-Approve | Requires Human Approval |
|-------|------------------|-------------------------|
| `low` | Low sensitivity decisions | Medium + High |
| `medium` | Low + Medium sensitivity | High |
| `high` | Low + Medium sensitivity | High (critical only) |

**Example:**
```typescript
// BaseAgent.ts (line 87-97)
protected requiresApproval(sensitivity: 'low' | 'medium' | 'high'): boolean {
  if (this.config.authorityLevel === 'low') {
    return sensitivity !== 'low';  // Needs approval for med/high
  }
  if (this.config.authorityLevel === 'medium') {
    return sensitivity === 'high';  // Needs approval only for high
  }
  return sensitivity === 'high';  // High authority still needs approval for critical
}
```

#### **3. Agent Permissions** (What agents can access)

```typescript
// In seed.ts (line 105-110)
permissions: {
  canApprove: agentData.authorityLevel === 'high',
  canEscalate: true,
  canAccessFinancials: agentData.role === 'cfo' || agentData.role === 'ceo',
  canManageTeam: agentData.role === 'hr' || agentData.role === 'ceo'
}
```

**Permission Matrix:**

| Agent Role | Can Access Financials | Can Manage Team | Can Approve Decisions |
|------------|----------------------|-----------------|---------------------|
| CEO | ✅ Yes | ✅ Yes | ✅ Yes (if high authority) |
| CFO | ✅ Yes | ❌ No | ✅ Yes (if high authority) |
| HR | ❌ No | ✅ Yes | ❌ No (unless high authority) |
| Sales | ❌ No | ❌ No | ❌ No |
| Support | ❌ No | ❌ No | ❌ No |

---

## 📁 **FILES & DIRECTORIES: What About File Permissions?**

### **Important: Your Current System Does NOT Handle Files**

**What Your Platform Currently Stores:**
- ✅ Text data (conversations, decisions)
- ✅ JSON data (business rules, manifesto)
- ✅ Database records
- ❌ **NOT** user-uploaded files
- ❌ **NOT** file system directories

### **If You Need File Storage in Future:**

You would add a **Files Table**:

```typescript
interface FilesTable {
  id: string;
  organization_id: string;  ← Organization isolation
  uploaded_by: string;      ← User who uploaded
  file_name: string;
  file_path: string;        ← S3/cloud storage path
  file_type: string;
  permissions: {
    viewableByRoles: string[];  ← ['admin', 'ceo', 'cfo']
    editableByRoles: string[];  ← ['admin']
    agentAccess: boolean;       ← Can agents read this?
  };
  created_at: Date;
}
```

**File Access Control:**
```typescript
// Get file
router.get('/files/:id', authenticate, async (req, res) => {
  const file = await db.selectFrom('files')
    .where('id', '=', req.params.id)
    .where('organization_id', '=', req.user.organizationId)  ← Isolation
    .executeTakeFirst();
  
  if (!file) return res.status(404);
  
  // Check role permissions
  if (!file.permissions.viewableByRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No permission to view file' });
  }
  
  // Fetch from S3 and return
  const fileData = await s3.getObject(file.file_path);
  res.send(fileData);
});
```

---

## 🌐 **DEPLOYMENT SCENARIOS**

### **Scenario 1: SaaS Model (app.ai-workforce.com)**

**Single Deployment, Multiple Companies:**
```
app.ai-workforce.com
├── Company A logs in → sees only their data
├── Company B logs in → sees only their data
└── Company C logs in → sees only their data
```

**How It Works:**
- All companies use same URL
- Authentication determines `organizationId`
- Database queries filtered by `organizationId`
- Complete data isolation

**Pros:**
- ✅ Easy to manage (one deployment)
- ✅ Easy to update (update once, all companies get it)
- ✅ Cost-effective (shared infrastructure)

**Cons:**
- ⚠️ All companies share same servers
- ⚠️ One company's traffic can affect others (mitigated with scaling)

### **Scenario 2: Custom Domain (your-company.ai-workforce.com)**

**Subdomain per Company:**
```
techstart.ai-workforce.com   → Company A
fincorp.ai-workforce.com     → Company B
startup.ai-workforce.com     → Company C
```

**How It Works:**
- Same codebase, same database
- Subdomain maps to `organizationId`
- User doesn't need to select company at login

**Implementation:**
```typescript
// In auth middleware
const subdomain = req.hostname.split('.')[0];  // 'techstart'
const org = await db.selectFrom('organizations')
  .where('subdomain', '=', subdomain)
  .executeTakeFirst();

// Use org.id for all queries
```

### **Scenario 3: White-Label (company.com/ai-workspace)**

**Company hosts on their own domain:**
```
techstart.com/ai-workspace   → Branded for TechStart
fincorp.com/ai-workspace     → Branded for FinCorp
```

**How It Works:**
- You deploy separate instance per company
- Each company has own database
- Custom branding per deployment

**Pros:**
- ✅ Complete isolation (separate servers)
- ✅ Custom branding
- ✅ Company controls their own data

**Cons:**
- ❌ More expensive (separate deployments)
- ❌ Harder to maintain (update each deployment)

---

## 🔒 **SECURITY BEST PRACTICES (Current Implementation)**

### **✅ What Your System Does Right:**

1. **Organization-Based Isolation:**
   - Every query filtered by `organization_id`
   - No cross-organization data leaks possible

2. **JWT Authentication:**
   - Tokens expire (7 days default)
   - Tokens signed with secret
   - Tokens include `organizationId`

3. **Role-Based Access:**
   - Users have roles (`admin`, `ceo`, etc.)
   - Routes protected with `authorize()` middleware
   - Agents have authority levels

4. **Password Security:**
   - Passwords hashed with bcrypt (12 rounds)
   - Never stored in plain text

5. **Agent Decision Approval:**
   - Sensitive decisions require human approval
   - Audit trail of who approved what

### **⚠️ What You Should Add (Future Enhancements):**

1. **Rate Limiting:**
   ```typescript
   // Prevent abuse
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 100  // limit each org to 100 requests per window
   });
   
   app.use('/api', limiter);
   ```

2. **Audit Logging:**
   ```typescript
   // Track all sensitive actions
   await db.insertInto('audit_logs').values({
     user_id: req.user.id,
     organization_id: req.user.organizationId,
     action: 'decision_approved',
     resource_id: decisionId,
     timestamp: new Date()
   });
   ```

3. **API Keys per Organization:**
   ```typescript
   // Each company uses their own LLM API keys
   interface OrganizationsTable {
     llm_api_keys: {
       openai?: string;
       groq?: string;
     };
   }
   ```

4. **IP Whitelisting:**
   ```typescript
   // Allow access only from company IPs
   if (!org.allowedIPs.includes(req.ip)) {
     throw new AppError('Access denied from this IP', 403);
   }
   ```

---

## 🎯 **SUMMARY: Your Permission Model**

### **Three Layers of Security:**

```
┌─────────────────────────────────────┐
│  Layer 1: Organization Isolation    │
│  - Multi-tenant database            │
│  - organization_id on every table   │
│  - Automatic query filtering        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Layer 2: User Roles                │
│  - admin, ceo, cfo, hr, etc.       │
│  - Role-based route access          │
│  - authorize() middleware           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Layer 3: Agent Permissions         │
│  - Authority levels (low/med/high)  │
│  - Permission objects               │
│  - Decision sensitivity analysis    │
└─────────────────────────────────────┘
```

### **When Deployed to company.com:**

1. **Company A users login** → JWT token has `organizationId = org-A`
2. **All queries automatically filtered** → `WHERE organization_id = 'org-A'`
3. **Company B users CANNOT access Company A data** → Different `organizationId`
4. **Within Company A:**
   - Admin can manage agents
   - CEO can approve high-level decisions
   - CFO can access financial data
   - Agents operate within authority limits

---

## ❓ **YOUR QUESTIONS ANSWERED**

### **Q: How do we prevent Company A from seeing Company B's data?**
A: Database-level isolation via `organization_id` column. Every query includes `WHERE organization_id = req.user.organizationId`. No user can change their `organizationId` (it's in signed JWT token).

### **Q: What about file/directory permissions?**
A: Current system doesn't handle files. If you add file storage, implement same pattern: `files` table with `organization_id` and `permissions` field.

### **Q: Can agents access data from other organizations?**
A: No. Agents are created with `organization_id` and can only access data from their organization via MemoryService.

### **Q: What if someone tries to access another org's agent ID?**
A: Query fails: `WHERE id = 'agent-xyz' AND organization_id = 'org-A'`. If agent-xyz belongs to org-B, query returns null → 404 error.

### **Q: Is this secure for production?**
A: Core architecture is solid. Add: rate limiting, audit logs, IP whitelisting, API key per org for production-grade security.

---

**Ready to deploy?** This permission model is production-ready for MVP testing. You can add more granular permissions as needed.
