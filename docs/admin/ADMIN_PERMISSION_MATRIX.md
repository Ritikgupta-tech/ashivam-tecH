# Ashivam Technologies — Admin Role-Based Access Control (RBAC) & Permission Matrix

**Document Version:** 1.0.0  
**Security Reference:** OWASP Authorization Cheat Sheet, OWASP Authorization Patterns  
**Architecture Principle:** Server-Enforced Deny-by-Default Authorization  
**Status:** Canonical Reference Specification  

---

## 1. Architectural Principles

1. **Default Deny:** Unless an endpoint explicitly allows unauthenticated public access, all administrative API routes require valid JWT authentication (`authenticate`).
2. **Server-Side Enforcement:** Frontend conditional rendering (e.g. hiding tabs or buttons) is treated solely as a UI affordance. Every protected backend route independently verifies the caller's role (`requireRole`) and permission claims (`requirePermission`).
3. **No Client Trust:** Client-supplied role IDs, permission arrays, and user credentials in request bodies are ignored. Roles and permissions are decoded strictly from verified server-signed JWTs and checked against the database.
4. **Privilege Hierarchy:**
   - `Superadmin`: Full platform access across all modules, including administrative account provisioning, permanent deletions, and platform configuration.
   - `Admin`: Operational access restricted strictly to modules explicitly granted in the admin's `permissions` array. Destructive deletions across core business entities require `Superadmin` role.

---

## 2. Granular Permission Matrix

| Module Domain | Permission Key | Action | Superadmin | Admin (with Key) | Admin (without Key) | Unauthenticated |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Executive Dashboard** | `dashboard` | View metrics & KPIs | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `dashboard` | Filter by time range | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| **Inquiries** | `inquiries` | List & search inquiries | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `inquiries` | Update status & notes | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `inquiries` | Export inquiries CSV | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `inquiries` | Delete inquiry | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| **Careers & Jobs** | `careers` | Create / Edit job | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Delete job opening | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `careers` | View / Download resumes | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Update application stage | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Export applications CSV | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Delete application | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| **Internships** | `careers` | List & search interns | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Direct intern onboarding | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Convert candidate to intern | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Toggle onboarding checks | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Update status / extend | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Export intern / app CSV | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Delete intern record | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `careers` | Manage programs / tracks | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `careers` | Delete program track | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| **Employees** | `employees` | List & view employees | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Create / Edit employee | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Toggle active status | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Soft-delete employee | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `employees` | Restore employee | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `employees` | Export employees CSV | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| **HR Documents** | `employees` | List & filter documents | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Upload HR document | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Download / view document| **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Update doc status | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `employees` | Delete HR document | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| **CMS Content** | `content` | View content blocks | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `content` | Create / Edit content | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `content` | Publish / Unpublish | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `content` | Delete content block | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| **Media Assets** | `media` | List media library | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `media` | Upload media file | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `media` | Delete media file | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| **Audit Logs** | `audit` | View security audit log | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `audit` | Export audit trail CSV | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `audit` | Delete / Clear logs | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| **Settings** | `settings` | View system settings | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `settings` | Update corporate config | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| | `settings` | Reset to defaults | **ALLOW** | **ALLOW** | **403 DENY** | **401 DENY** |
| **Admin Accounts** | `admins` (Super) | List administrator accounts| **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `admins` (Super) | Create operational admin | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `admins` (Super) | Update admin permissions | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `admins` (Super) | Toggle admin active status| **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |
| | `admins` (Super) | Delete admin account | **ALLOW** | **403 DENY** (Role) | **403 DENY** | **401 DENY** |

---

## 3. Server-Side Middleware Implementation

### 3.1 Authentication Check (`authenticate`)
```javascript
// Validates Authorization: Bearer <jwt> header
// Verifies cryptographic signature using env.jwtSecret
// Resolves admin from DB; verifies admin.isActive === true
// Attaches req.user = { id, username, name, role, permissions }
```

### 3.2 Role Check (`requireRole(...allowedRoles)`)
```javascript
// Checks req.user.role matches one of allowedRoles
// If mismatch, halts request with HTTP 403 Forbidden:
// { success: false, message: "Forbidden: Superadmin access required" }
```

### 3.3 Permission Check (`requirePermission(permissionKey)`)
```javascript
// Superadmin automatically passes all permission checks
// For normal Admin, checks req.user.permissions.includes(permissionKey)
// If missing, halts request with HTTP 403 Forbidden:
// { success: false, message: `Forbidden: '${permissionKey}' permission required` }
```
