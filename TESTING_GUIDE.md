# RentWise Testing Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Running the Application](#running-the-application)
4. [Smoke Testing Checklist](#smoke-testing-checklist)
5. [Security Testing](#security-testing)
6. [API Testing](#api-testing)
7. [Role-Based Testing](#role-based-testing)

---

## Prerequisites

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/CodeCrafter19programmer/rentwise.git
cd rentwise

# Install dependencies
npm install

# Copy environment templates
cp .env.example .env
cp client/.env.example client/.env
```

### 2. Configure Environment Variables

**Root `.env`:**
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
PORT=5000
NODE_ENV=development
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**`client/.env`:**
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

---

## Database Setup

### Apply RLS Policies (if not already done)
Run the full `RLSpolicies.SQL` in your Supabase SQL Editor.

### Apply DELETE Policies Migration
If you already have the base policies, run only the new DELETE policies:

```sql
-- Run this in Supabase SQL Editor
-- File: migrations/add_delete_policies.sql
```

**To verify policies are applied:**
```sql
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

---

## Running the Application

### Development Mode
```bash
npm run dev
```
Application runs at: `http://localhost:5000`

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run check
```

---

## Smoke Testing Checklist

### ✅ Authentication Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Login Page Load** | Navigate to `/login` | Login form displays | ☐ |
| **Valid Login** | Enter valid credentials, click Sign In | Redirect to role dashboard | ☐ |
| **Invalid Login** | Enter wrong password | Error toast "Invalid email or password" | ☐ |
| **Session Persistence** | Refresh page after login | User stays logged in | ☐ |
| **Logout** | Click logout button | Redirect to login page | ☐ |

### ✅ Registration Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **No Token** | Navigate to `/register` without token | "Invalid invitation" message | ☐ |
| **With Token** | Navigate to `/register?token=abc` | Registration form displays | ☐ |
| **Weak Password** | Enter password < 8 chars | Validation error | ☐ |
| **No Uppercase** | Enter password without uppercase | Validation error | ☐ |
| **No Special Char** | Enter password without special char | Validation error | ☐ |
| **Valid Password** | Enter `Test@1234` | Password accepted | ☐ |

### ✅ Admin Dashboard Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Access as Admin** | Login as admin, go to `/admin` | Dashboard loads | ☐ |
| **Access as Manager** | Login as manager, go to `/admin` | Redirect to `/manager` | ☐ |
| **Properties List** | View properties section | Properties display | ☐ |
| **Stats Display** | Check stat cards | Numbers render correctly | ☐ |

### ✅ Manager Dashboard Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Access as Manager** | Login as manager, go to `/manager` | Dashboard loads | ☐ |
| **Access as Tenant** | Login as tenant, go to `/manager` | Redirect to `/tenant` | ☐ |
| **My Properties** | View properties section | Only managed properties show | ☐ |
| **Maintenance List** | View maintenance section | Open requests display | ☐ |

### ✅ Tenant Dashboard Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Access as Tenant** | Login as tenant, go to `/tenant` | Dashboard loads | ☐ |
| **Lease Info** | View lease section | Current lease displays | ☐ |
| **Payment Status** | View payments | Next due payment shows | ☐ |
| **Submit Maintenance** | Create maintenance request | Success toast, request appears | ☐ |

---

## Security Testing

### ✅ Rate Limiting Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **API Rate Limit** | Send 101 requests to `/api/health` in 15 min | 429 error on 101st | ☐ |
| **Auth Rate Limit** | Send 11 login attempts in 15 min | 429 error on 11th | ☐ |

**Test Command:**
```bash
# Test rate limiting (run this 101 times quickly)
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health
done
```

### ✅ Security Headers Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **X-Content-Type-Options** | Check response headers | `nosniff` present | ☐ |
| **X-Frame-Options** | Check response headers | `DENY` present | ☐ |
| **Strict-Transport-Security** | Check response headers | HSTS present | ☐ |

**Test Command:**
```bash
curl -I http://localhost:5000 | grep -E "(X-Content-Type|X-Frame|Strict-Transport)"
```

### ✅ CSRF Protection Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **Get CSRF Token** | GET `/api/csrf-token` | Token returned, cookie set | ☐ |
| **POST without Token** | POST to form endpoint without CSRF header | 403 error | ☐ |
| **POST with Token** | POST with valid CSRF header | Request succeeds | ☐ |

### ✅ Input Validation Tests

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **XSS in Title** | Submit `<script>alert(1)</script>` as title | Script escaped/sanitized | ☐ |
| **SQL Injection** | Submit `'; DROP TABLE users; --` | Input safely handled | ☐ |
| **Long Input** | Submit > max length string | Validation error | ☐ |

---

## API Testing

### Health Check
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Protected Endpoints (require Bearer token)

**Get token from browser DevTools:**
1. Login to app
2. Open DevTools → Application → Local Storage
3. Find `sb-*-auth-token` and copy the access_token

```bash
TOKEN="your-access-token-here"

# Admin endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/users

# Manager endpoint  
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/manager/properties

# Create maintenance request (tenant)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test description here","priority":"medium","unitId":"uuid-here"}' \
  http://localhost:5000/api/maintenance-requests
```

---

## Role-Based Testing

### Test Users Setup

Create these test users in Supabase:

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | Admin@123 | admin |
| manager@test.com | Manager@123 | manager |
| tenant@test.com | Tenant@123 | tenant |

### Role Access Matrix

| Route | Admin | Manager | Tenant | Unauthenticated |
|-------|-------|---------|--------|-----------------|
| `/login` | ✅ Redirect | ✅ Redirect | ✅ Redirect | ✅ |
| `/admin` | ✅ | ❌ Redirect | ❌ Redirect | ❌ Redirect |
| `/admin/properties` | ✅ | ❌ | ❌ | ❌ |
| `/admin/managers` | ✅ | ❌ | ❌ | ❌ |
| `/admin/reports` | ✅ | ❌ | ❌ | ❌ |
| `/admin/settings` | ✅ | ❌ | ❌ | ❌ |
| `/manager` | ❌ Redirect | ✅ | ❌ Redirect | ❌ |
| `/manager/properties` | ❌ | ✅ | ❌ | ❌ |
| `/manager/units` | ❌ | ✅ | ❌ | ❌ |
| `/manager/tenants` | ❌ | ✅ | ❌ | ❌ |
| `/manager/leases` | ❌ | ✅ | ❌ | ❌ |
| `/manager/payments` | ❌ | ✅ | ❌ | ❌ |
| `/manager/maintenance` | ❌ | ✅ | ❌ | ❌ |
| `/tenant` | ❌ Redirect | ❌ Redirect | ✅ | ❌ |
| `/tenant/lease` | ❌ | ❌ | ✅ | ❌ |
| `/tenant/payments` | ❌ | ❌ | ✅ | ❌ |
| `/tenant/maintenance` | ❌ | ❌ | ✅ | ❌ |
| `/tenant/messages` | ❌ | ❌ | ✅ | ❌ |

---

## RLS Policy Testing

### Test Data Isolation

**As Tenant:**
```sql
-- Should only see own lease
SELECT * FROM leases;  -- Only tenant's lease

-- Should only see own payments
SELECT * FROM payments; -- Only payments for tenant's lease

-- Should only see own maintenance requests
SELECT * FROM maintenance_requests; -- Only tenant's requests
```

**As Manager:**
```sql
-- Should only see managed properties
SELECT * FROM properties; -- Only manager's properties

-- Should see units in managed properties
SELECT * FROM units; -- Only units in manager's properties
```

### Test DELETE Restrictions

**As Tenant:**
```sql
-- Should be able to delete own open maintenance request
DELETE FROM maintenance_requests 
WHERE tenant_id = auth.uid() AND status = 'open';

-- Should NOT be able to delete resolved request
DELETE FROM maintenance_requests 
WHERE tenant_id = auth.uid() AND status = 'resolved';
-- Expected: No rows deleted
```

---

## Browser Testing Checklist

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ☐ |
| Firefox | Latest | ☐ |
| Safari | Latest | ☐ |
| Edge | Latest | ☐ |
| Mobile Chrome | Latest | ☐ |
| Mobile Safari | Latest | ☐ |

---

## Performance Testing

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| API Response Time | < 200ms | Network tab |

---

## Error Handling Tests

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Network Error | Disable network, try action | Error toast displays |
| 404 Page | Navigate to `/nonexistent` | Not Found page |
| Session Expired | Use expired token | Redirect to login |
| Server Error | Trigger 500 | Generic error message (no stack trace) |

---

## Deployment Verification

After deploying to Vercel:

```bash
# Check security headers
curl -I https://your-app.vercel.app | grep -E "(X-Content-Type|X-Frame|Strict)"

# Check health endpoint
curl https://your-app.vercel.app/api/health

# Verify CSP header
curl -I https://your-app.vercel.app | grep "Content-Security-Policy"
```

---

## Test Completion Sign-off

| Section | Tester | Date | Pass/Fail |
|---------|--------|------|-----------|
| Authentication | | | |
| Authorization | | | |
| Security Headers | | | |
| Rate Limiting | | | |
| Input Validation | | | |
| RLS Policies | | | |
| UI/UX | | | |
| Performance | | | |

---

**Repository:** https://github.com/CodeCrafter19programmer/rentwise.git
**Last Updated:** December 26, 2024
