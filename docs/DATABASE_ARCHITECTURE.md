# Ashivam Technologies — Database Architecture & Data Models

**Document Version:** 3.0.0 (Master Engineering Release)  
**Database Engine:** MongoDB Atlas (Mongoose 9.10 ODM)  
**Classification:** Confidential — Internal Company & DevOps Use Only  
**Company:** Ashivam Technologies  
**Date:** October 30, 2026  

---

## 1. Database Connection & Pooling Strategy

The database layer is managed via Mongoose in `backend/src/db/database.js`. It enforces high-reliability cloud connection pooling parameters:
* `maxPoolSize: 10`: Limits concurrent sockets to avoid exceeding MongoDB Atlas cluster connection tiers.
* `minPoolSize: 2`: Retains warm persistent sockets to eliminate cold-start handshake latency.
* `serverSelectionTimeoutMS: 5000`: Fast-fails during temporary network partitions instead of hanging client requests.
* `autoIndex: !env.isProduction`: Disables automatic schema index generation in production to prevent performance degradation on Atlas clusters during boot. Indexes are managed via explicit migration scripts.

---

## 2. Collection Schemas & Data Model Inventory

### 1. `admins` (`models/admin.model.js`)
* **Purpose:** Stores authenticated administrative user accounts and RBAC assignments.
* **Fields:**
  * `username`: String (Unique, Indexed, Trimmed, Lowercase, Required)
  * `name`: String (Trimmed, Required)
  * `email`: String (Unique, Indexed, Trimmed, Lowercase, Optional)
  * `passwordHash`: String (Bcrypt salt rounds 12, Required)
  * `role`: String (Enum: `Superadmin`, `Admin`, Default: `Admin`, Indexed)
  * `permissions`: [String] (Allowlist: `overview`, `inquiries`, `careers`, `internships`, `employees`, `documents`, `content`, `media`, `audit`, `settings`)
  * `isActive`: Boolean (Default: `true`, Indexed)
  * `lastLoginAt`: Date (Default: `null`)
  * `passwordChangedAt`: Date (Default: `null` — used for immediate session token invalidation)
  * Timestamps: `createdAt`, `updatedAt`

### 2. `inquiries` (`modules/inquiry/inquiry.model.js`)
* **Purpose:** Client leads captured from public website contact forms.
* **Fields:**
  * `referenceNumber`: String (Unique, Indexed, e.g. `INQ-YYYYMMDD-XXXX`)
  * `name`: String (Required, Trimmed, Max 100)
  * `email`: String (Required, Trimmed, Lowercase, Validated)
  * `phone`: String (Optional, Trimmed, Max 30)
  * `company`: String (Optional, Trimmed, Max 150)
  * `projectType`: String (Required, Trimmed, Max 100)
  * `budget`: String (Optional, Trimmed, Max 100)
  * `message`: String (Required, Trimmed, Max 5000)
  * `status`: String (Enum: `new`, `in-review`, `contacted`, `archived`, Default: `new`, Indexed)
  * `internalNotes`: [Subdocument: `{ text, authorId, authorName, createdAt }`]
  * Timestamps: `createdAt`, `updatedAt`

### 3. `jobs` (`modules/career/job.model.js`)
* **Purpose:** Career openings published on the public careers portal.
* **Fields:**
  * `title`: String (Required, Trimmed, Max 150)
  * `slug`: String (Unique, Indexed, Lowercase, URL-safe)
  * `department`: String (Required, Trimmed, Indexed)
  * `location`: String (Required, Trimmed, Default: `Agra, India / Remote`)
  * `employmentType`: String (Enum: `Full-time`, `Part-time`, `Contract`, `Internship`)
  * `description`: String (Required, Max 10000)
  * `requirements`: [String]
  * `status`: String (Enum: `published`, `draft`, `closed`, Default: `published`, Indexed)
  * `isActive`: Boolean (Default: `true`, Indexed)
  * `createdBy`: ObjectId (Ref: `Admin`)
  * Timestamps: `createdAt`, `updatedAt`

### 4. `applications` (`modules/career/application.model.js`)
* **Purpose:** Candidate job applications with resume storage metadata.
* **Fields:**
  * `job`: ObjectId (Ref: `Job`, Required, Indexed)
  * `firstName`: String (Required, Trimmed, Max 50)
  * `lastName`: String (Required, Trimmed, Max 50)
  * `email`: String (Required, Trimmed, Lowercase, Indexed)
  * `phone`: String (Required, Trimmed, Max 30)
  * `currentLocation`: String (Required, Trimmed, Max 100)
  * `experience`: String (Required, Trimmed, Max 50)
  * `resume`: Object:
    * `storageProvider`: String (Enum: `s3`, `local`, Required)
    * `storageKey`: String (Required, Unique file identifier)
    * `originalName`: String (Required, Trimmed)
    * `mimeType`: String (Required)
    * `size`: Number (Required, Max 5MB)
  * `status`: String (Enum: `new`, `reviewing`, `shortlisted`, `rejected`, `hired`, Default: `new`, Indexed)
  * Timestamps: `createdAt`, `updatedAt`

### 5. `internships` (`modules/internship/internship.model.js`)
* **Purpose:** Student internship candidate applications.
* **Fields:**
  * `name`: String (Required, Trimmed, Max 100)
  * `email`: String (Required, Trimmed, Lowercase, Indexed)
  * `phone`: String (Required, Trimmed, Max 30)
  * `college`: String (Required, Trimmed, Max 200)
  * `course`: String (Optional, Trimmed, Max 100)
  * `domain`: String (Required, Trimmed, Indexed)
  * `duration`: String (Optional, Trimmed, Default: `3 Months`)
  * `status`: String (Enum: `pending`, `under_review`, `shortlisted`, `selected`, `rejected`, Default: `pending`, Indexed)
  * `convertedToIntern`: Boolean (Default: `false`, Indexed)
  * `internId`: String (Optional, Ref to created Intern record)
  * Timestamps: `createdAt`, `updatedAt`

### 6. `interns` (`modules/internship/intern.model.js`)
* **Purpose:** Active and enrolled interns roster.
* **Fields:**
  * `internId`: String (Unique, Indexed, Required, Format: `ASH-INT-YYYY-XXX`)
  * `applicationId`: ObjectId (Ref: `Internship`, Nullable)
  * `name`: String (Required, Trimmed, Max 100)
  * `email`: String (Required, Trimmed, Lowercase)
  * `phone`: String (Required, Trimmed, Max 30)
  * `college`: String (Required, Trimmed, Max 200)
  * `course`: String (Trimmed, Max 100)
  * `domain`: String (Required, Trimmed)
  * `department`: String (Default: `Software Engineering`)
  * `designation`: String (Default: `Intern`)
  * `mentorName`: String (Trimmed, Max 100)
  * `joiningDate`: Date (Required)
  * `expectedEndDate`: Date (Required)
  * `actualEndDate`: Date (Nullable)
  * `duration`: String (Default: `3 Months`)
  * `stipend`: Number (Default: 0)
  * `isUnpaid`: Boolean (Default: false)
  * `onboarding`: Object:
    * `status`: String (Enum: `pending`, `in_progress`, `completed`, Default: `pending`)
    * `idProofVerified`: Boolean (Default: false)
    * `collegeNocVerified`: Boolean (Default: false)
    * `agreementSigned`: Boolean (Default: false)
    * `ndaSigned`: Boolean (Default: false)
    * `completedAt`: Date
  * `status`: String (Enum: `active`, `on_hold`, `completed`, `extended`, `withdrawn`, `terminated`, Default: `active`, Indexed)
  * `deletedAt`: Date (Default: `null` for soft-deletion)
  * `createdBy`: ObjectId (Ref: `Admin`)
  * Timestamps: `createdAt`, `updatedAt`

### 7. `internship_programs` (`modules/internship/internshipProgram.model.js`)
* **Fields:** `title`, `slug` (Unique), `domain`, `description`, `duration`, `stipend`, `mode` (`Remote`/`Onsite`), `status` (`published`/`draft`), `syllabus` ([String]), `createdBy`.

### 8. `employees` (`modules/employee/employee.model.js`)
* **Fields:** `employeeId` (Unique), `name`, `email` (Filtered Unique: only enforces uniqueness where `deletedAt: null`), `phone`, `role`, `department`, `designation`, `joiningDate`, `status` (`active`, `inactive`, `on_leave`), `deletedAt` (Soft delete), `featuredOnWebsite` (Boolean).

### 9. `hr_documents` (`modules/hr-document/hrDocument.model.js`)
* **Fields:** `title`, `documentType` (`policy`, `contract`, `handbook`, `id_proof`, `tax_form`, `other`), `fileUrl`, `storageKey`, `fileSize`, `mimeType`, `restrictedRoles` ([String]), `verified`, `issuedAt`, `expiresAt`, `uploadedBy`.

### 10. `contents` (`modules/content/content.model.js`)
* **Fields:** `key` (Unique, Indexed), `section`, `title`, `content` (Object/Parsed JSON), `status` (`published`, `draft`), `sortOrder`, `publishedAt`, `createdBy`, `updatedBy`.

### 11. `media` (`modules/media/media.model.js`)
* **Fields:** `originalName`, `fileName` (Random UUID), `mimeType`, `size`, `url`, `category` (`image`, `svg`, `pdf`, `other`), `uploadedBy`.

### 12. `notifications` (`modules/notification/notification.model.js`)
* **Fields:** `recipient` (ObjectId Ref: `Admin`), `type` (`system`, `inquiry`, `career`, `security`), `title`, `message`, `priority` (`low`, `normal`, `high`), `read`, `emailSent`, `emailSentAt`.

### 13. `settings` (`modules/settings/settings.model.js`)
* **Fields:** `key` (Unique, default: `general`), `company: { name, tagline, description, email, phone, address }`, `social: { linkedin, github, twitter }`, `features: { inquiries, careerApplications }`, `maintenance: { enabled, message }`.

### 14. `audit_logs` (`modules/audit/audit.model.js`)
* **Fields:** `actor: { userId, username, role }`, `action` (String), `entity` (String), `entityId` (String), `description` (String), `metadata` (Object), `status` (`success`, `failure`), `request: { method, path, ip, userAgent }`, `createdAt`.

---

## 3. Safe Migration & Backup Protocol

> [!CAUTION]
> **CRITICAL RULE: NEVER USE `--drop` ON PRODUCTION DATABASES**  
> Running `mongorestore` with `--drop` purges existing collections before restoring. Production migrations must always restore to an isolated target cluster without `--drop`.

### Non-Destructive Backup & Restore Command Sequence:
```bash
# 1. Non-destructive backup of live database to timestamped local directory:
mongodump --uri="mongodb+srv://<USER>:<PASS>@<SOURCE_CLUSTER>/ashivam_technologies" --out="./backup_$(date +%Y%m%d_%H%M%S)"

# 2. Verify document counts locally:
ls -lh ./backup_*/ashivam_technologies

# 3. Restore into fresh isolated company cluster (NO --drop):
mongorestore --uri="mongodb+srv://<TARGET_USER>:<PASS>@<COMPANY_CLUSTER>/ashivam_technologies" ./backup_*/ashivam_technologies

# 4. Reconcile collection document counts in mongosh:
use ashivam_technologies
db.admins.countDocuments()
db.jobs.countDocuments()
db.inquiries.countDocuments()
db.applications.countDocuments()
db.interns.countDocuments()
db.employees.countDocuments()
```
