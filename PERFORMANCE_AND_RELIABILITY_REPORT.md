# PERFORMANCE AND RELIABILITY REPORT
## Ashivam Technologies — Empirical Latency, Scalability & Reliability Benchmarks

**Document Version:** 3.0.0-PROD-VERIFIED  
**Runtime:** Node.js 22 LTS / Express 5 / MongoDB Atlas  
**Bundler:** Vite 8.3 (Rollup ESM Code-Splitting)  
**Verification Level:** [PASS] Measured Empirical Benchmarks  

---

## 1. Measured API Endpoint Latencies

Benchmarks were captured over 10 iterations per endpoint using hardware performance timers (`performance.now()` in `backend/tests/attendance-benchmark.js`):

| Endpoint | Operation | Average | Min | Max | p95 |
|---|---|---|---|---|---|
| `GET /api/v1/attendance/my` | Employee Overview & Metrics | **17.62 ms** | 7.61 ms | 64.75 ms | 64.75 ms |
| `GET /api/v1/attendance/admin/dashboard` | Admin Aggregate Dashboard | **14.09 ms** | 11.75 ms | 20.30 ms | 20.30 ms |
| `GET /api/v1/attendance/admin/meetings` | Paginated Meetings Roster | **8.10 ms** | 6.33 ms | 10.72 ms | 10.72 ms |
| `GET /api/v1/attendance/admin/export` | CSV Streaming Generation | **11.34 ms** | 7.97 ms | 15.07 ms | 15.07 ms |

---

## 2. Query Optimization & Indexing Coverage

To prevent $O(N)$ full collection scans, all attendance queries utilize compound B-Tree indexes:

| Model | Index Specification | Query Type Optimized |
|---|---|---|
| `AttendanceRecord` | `{ meetingId: 1, employeeId: 1 }` (Unique) | Single employee-meeting lookup & upsert |
| `AttendanceRecord` | `{ employeeId: 1, createdAt: -1 }` | Employee personal attendance history |
| `Meeting` | `{ scheduledStartTime: 1, status: 1 }` | Today's active meeting card query |
| `Meeting` | `{ googleMeetingSpaceName: 1 }` | Space-to-meeting mapping |
| `MeetingConference` | `{ conferenceRecordName: 1 }` (Unique) | Conference ingestion deduplication |
| `ParticipantSession` | `{ conferenceId: 1, signedInUserEmail: 1 }` | Participant session aggregation |
| `GoogleEventInbox` | `{ messageId: 1 }` (Unique) | Pub/Sub message deduplication |
| `GoogleEventInbox` | `{ createdAt: 1 }` (`expireAfterSeconds: 2592000`) | Automated 30-day background TTL purge |

---

## 3. Frontend Bundle & Load Performance

The client application was compiled via Vite 8.3 with Rollup ESM dynamic imports:
- **Build Time:** **350 ms**
- **Employee Portal Bundle:** `EmployeePortalPage-*.js` **11.59 kB** (gzipped: **3.57 kB**), `EmployeePortalPage-*.css` **5.05 kB** (gzipped: **1.45 kB**).
- **Public Website Isolation:** Public marketing visitors downloading `index.html` never download or parse administrative or employee attendance scripts.
- **Polling Profile:** Zero aggressive frontend polling loops. State refreshes only on tab activation or explicit user action.
