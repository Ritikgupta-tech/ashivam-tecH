# DATABASE AND INDEX REPORT
## Ashivam Technologies — MongoDB Schemas, Indexes & Concurrency Guarantees

**Document Version:** 3.0.0-PROD-VERIFIED  
**Database Engine:** MongoDB Atlas (M0/M10 Compatible)  
**ORM:** Mongoose 8/9 (Native Node.js ESM)  
**Verification Level:** [PASS] Complete Schema & Index Validation  

---

## 1. Schema Extensions & Canonical Employee Collection

To prevent disparate databases and synchronize employee profiles across HRMS, recruitment, and attendance, the canonical `Employee` collection was extended with non-breaking optional fields:

| Field | Type | Modifiers | Purpose |
|---|---|---|---|
| `employeeId` | `String` | `trim: true, uppercase: true` | Company identification code (e.g. `ASH-EMP-1042`). |
| `googleEmail` | `String` | `trim: true, lowercase: true` | Verified Google account used for Google Meet login. |
| `passwordHash` | `String` | `select: false` | Salted bcrypt hash for Employee Portal login. Excluded from general queries. |
| `role` | `String` | `enum: ["Admin", "Superadmin", "Employee"], default: "Employee"` | RBAC authority marker. |
| `lastLoginAt` | `Date` | default: `null` | Audit timestamp of last session. |
| `passwordChangedAt` | `Date` | default: `null` | Invalidation marker for JWT revocation. |

### Partial Unique Indexes on `Employee`:
```javascript
employeeSchema.index(
  { employeeId: 1 },
  { unique: true, partialFilterExpression: { employeeId: { $type: "string" } } }
);

employeeSchema.index(
  { googleEmail: 1 },
  { unique: true, partialFilterExpression: { googleEmail: { $type: "string" } } }
);
```

---

## 2. Attendance Domain Schemas & Compound Indexes

### 2.1. `AttendanceRecord` Compound Unique Index
To guarantee that an employee has exactly one consolidated record per meeting regardless of concurrent Pub/Sub deliveries:
```javascript
attendanceRecordSchema.index({ meetingId: 1, employeeId: 1 }, { unique: true });
```
- **Concurrency Test Verification:** In `backend/tests/attendance-concurrency.test.js`, 20 simultaneous upserts yielded exactly 1 document in the collection without race-condition duplicates or unhandled crashes.

### 2.2. `GoogleEventInbox` Message Deduplication & TTL
```javascript
googleEventInboxSchema.index({ messageId: 1 }, { unique: true });
googleEventInboxSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
```
- **Primary Unique Index on `messageId`:** Guarantees that Google Cloud Pub/Sub duplicate deliveries are caught by MongoDB E11000 duplicate key error and safely acknowledged.
- **30-Day TTL Auto-Purge:** Automatically purges records older than 30 days (`2,592,000` seconds), maintaining a bounded database storage footprint.

---

## 3. Database Health & Migration Safety

1. **Non-Destructive Schema Evolution:** Zero existing fields were renamed, modified, or dropped.
2. **Backward Compatibility:** All newly introduced fields on `Employee` are optional, ensuring existing queries continue executing with zero downtime.
3. **Transaction Independence:** All attendance upserts utilize atomic document-level operations (`findOneAndUpdate` with `{ returnDocument: 'after' }`), ensuring ACID compliance on standalone MongoDB instances without requiring multi-document replica set transactions.
