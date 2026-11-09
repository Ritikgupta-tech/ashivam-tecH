# ASHIVAM TECHNOLOGIES — INTEGRATION TESTING MATRIX & EVIDENCE
## Phase 6: Automated Test Verification Across All Services

---

## 1. Test Coverage Overview

| System | Suite File | Total Tests | Pass Rate | Key Capabilities Tested |
| :--- | :--- | :---: | :---: | :--- |
| **Official Website** | `backend/tests/integration.test.js` | 4 | 100% | HMAC-SHA256 signature generation, metrics reporting, safe reconciliation scan, 401 unauthenticated defense. |
| **Internship System** | `backend/tests/integration.test.js` | 7 | 100% | Inbound application ingestion with HMAC, idempotency cache hit, signature tampering defense (401), timestamp replay defense (401), source whitelist enforcement (403), status callback ingestion, metrics. |
| **Enterprise HRMS** | `backend/tests/integration.test.js` | 9 | 100% | Inbound conversion queue ingestion with HMAC, idempotency replay, signature tampering defense (401), queue listing for HR_ADMIN, 403 block on EMPLOYEE role, mandatory HR review gate approval (creating master employee, onboarding checklist, leave balance, temporary password), conflict on re-decision (409), rejection with logged rationale, system metrics. |
| **Cumulative Existing Tests** | All Suites Across 3 Systems | 354+ | 100% | Zero regressions across website (236+), internship management (52), and HRMS (62). |

---

## 2. Test Execution Commands

```bash
# 1. Official Corporate Website
cd C:\Users\DELL\Desktop\Official-Website-main
node --test backend/tests/integration.test.js

# 2. Internship Management System
cd C:\Users\DELL\Desktop\ashivam-internship-management\backend
node --test tests/integration.test.js

# 3. Enterprise HRMS
cd C:\Users\DELL\Desktop\ashivam-hr-management\backend
node --test tests/integration.test.js
```
