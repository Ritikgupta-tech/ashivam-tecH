# Ashivam Technologies — Database Schema Specifications & Field Dictionary

> **Document Version:** 1.0.0  
> **Classification:** Engineering Reference  
> **Database:** MongoDB Atlas 7.0  
> **Target Audience:** Backend Developers, QA Automation, Database Administrators  

---

## 1. Schema Specifications

### 1.1 `Inquiry` Schema (`inquiries` collection)
Captures public lead submissions and corporate contact requests.

| Field Name | Type | Required | Default | Indexes / Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | Primary Key | Canonical MongoDB identifier |
| `fullName` | `String` | Yes | — | Trimmed, 2–100 chars | Lead full contact name |
| `email` | `String` | Yes | — | Lowercase, RFC 5322 regex | Primary contact email |
| `phone` | `String` | Yes | — | 10–15 digits | Contact phone number |
| `subject` | `String` | No | `"General Inquiry"` | Max 150 chars | Topic of interest |
| `message` | `String` | Yes | — | 10–3000 chars | Detailed customer requirements |
| `status` | `String` | Yes | `"NEW"` | Enum: `NEW`, `IN_REVIEW`, `CONTACTED`, `RESOLVED`, `ARCHIVED` | Workflow triage state |
| `isArchived` | `Boolean` | No | `false` | B-tree index | Soft archival toggle |
| `adminNotes` | `String` | No | `""` | — | Internal triage notes |
| `ipAddress` | `String` | No | `null` | Masked / Anonymized | Source IP for anti-spam tracking |
| `createdAt` | `Date` | Yes | `Date.now` | Compound with `status`, TTL (180d) | Submission timestamp |

---

### 1.2 `Employee` Schema (`employees` collection)
Authoritative enterprise employee directory.

| Field Name | Type | Required | Default | Indexes / Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | Primary Key | Canonical MongoDB identifier |
| `employeeId` | `String` | Yes | — | **Unique**, Uppercase | Enterprise employee code (`ASH-EMP-XXXX`) |
| `userId` | `ObjectId` | No | `null` | Ref: `User` | Linked authentication user record |
| `fullName` | `String` | Yes | — | 2–100 chars | Legal employee name |
| `workEmail` | `String` | Yes | — | **Partial Unique** (`isDeleted: false`) | Official Ashivam corporate email |
| `personalEmail`| `String` | Yes | — | Valid email | Personal recovery email |
| `phone` | `String` | Yes | — | Phone regex | Mobile phone number |
| `department` | `String` | Yes | — | Index | Department (Engineering, QA, Design, HR) |
| `designation` | `String` | Yes | — | — | Professional job title |
| `employmentStatus`| `String`| Yes | `"PROBATION"` | Enum: `PROBATION`, `CONFIRMED`, `NOTICE`, `TERMINATED` | Current employment status |
| `isDeleted` | `Boolean` | Yes | `false` | Index | Soft delete flag |
| `deletedAt` | `Date` | No | `null` | — | Soft deletion timestamp |
| `deletedBy` | `ObjectId` | No | `null` | Ref: `User` | Offboarding administrator |
| `__v` | `Number` | Yes | `0` | OCC Version Key | Optimistic concurrency control counter |

---

### 1.3 `EmployeeDocument` Schema (`employeedocuments` collection)
Encrypted confidential KYC identity documents.

| Field Name | Type | Required | Default | Indexes / Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | Primary Key | Document record identifier |
| `employeeId` | `ObjectId` | Yes | — | Ref: `Employee`, Index | Owning employee foreign key |
| `documentType`| `String` | Yes | — | Enum: `AADHAAR`, `PAN`, `DEGREE`, `EXPERIENCE`, `CHEQUE` | Document category |
| `s3StorageKey`| `String` | Yes | — | Encrypted storage path | KMS-encrypted S3 object key |
| `originalFileName`| `String`| Yes | — | Sanitized string | Original upload filename |
| `mimeType` | `String` | Yes | — | Enum: `application/pdf`, `image/png` | Verified file MIME type |
| `fileSize` | `Number` | Yes | — | Max 10MB | File size in bytes |
| `sha256Checksum`| `String`| Yes | — | 64-char Hex string | Cryptographic tamper-evidence hash |
| `verificationStatus`| `String`| Yes | `"PENDING"` | Enum: `PENDING`, `VERIFIED`, `REJECTED` | KYC approval state |
| `verifiedBy` | `ObjectId` | No | `null` | Ref: `User` | Approving HR manager |
| `verifiedAt` | `Date` | No | `null` | — | Timestamp of KYC approval |
| `rejectionReason`| `String`| No | `""` | — | Explanation if document rejected |

---

### 1.4 `Career` & `Application` Schema
Job listings and applicant tracking.

| Field Name | Type | Required | Default | Indexes / Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `title` | `String` | Yes | — | 3–150 chars | Job opening title |
| `department` | `String` | Yes | — | Index | Engineering, Product, Design, Sales |
| `jobType` | `String` | Yes | `"FULL_TIME"`| Enum: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP` | Employment arrangement |
| `location` | `String` | Yes | `"Agra, UP (Hybrid)"` | — | Job location |
| `experienceLevel`| `String`| Yes | — | Enum: `ENTRY`, `MID`, `SENIOR`, `LEAD` | Required seniority level |
| `status` | `String` | Yes | `"ACTIVE"` | Enum: `DRAFT`, `ACTIVE`, `PAUSED`, `CLOSED` | Listing status |
| `requirements` | `[String]` | Yes | `[]` | — | Array of required skill criteria |

---

### 1.5 `OutboxEvent` Schema (`outbox_events` collection)
Transactional outbox table for resilient asynchronous message publishing.

| Field Name | Type | Required | Default | Indexes / Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `_id` | `ObjectId` | Yes | Auto | Primary Key | Event record identifier |
| `aggregateType`| `String` | Yes | — | Index | Domain aggregate (`INQUIRY`, `EMPLOYEE`, `INTERN`) |
| `aggregateId` | `String` | Yes | — | Stringified ObjectId | ID of the mutated entity |
| `eventType` | `String` | Yes | — | Index | Domain event (`inquiry.created`, `doc.verified`) |
| `payload` | `Mixed` | Yes | `{}` | JSONB payload | Serialized event payload |
| `status` | `String` | Yes | `"PENDING"` | Enum: `PENDING`, `PUBLISHED`, `FAILED`, Partial Index | Processing status |
| `retryCount` | `Number` | Yes | `0` | Max: 5 | Number of dispatch attempts |
| `lastError` | `String` | No | `null` | — | Error message from failed attempt |
| `createdAt` | `Date` | Yes | `Date.now` | Index | Event insertion timestamp |
| `publishedAt` | `Date` | No | `null` | — | Final successful dispatch timestamp |
