# ATTENDANCE WORKFLOW REPORT
## Ashivam Technologies — Controlled Meeting Scenarios & 12 Edge-Case Matrix

**Document Version:** 2.0.0-PROD-VERIFIED  
**Test Suite:** `backend/tests/attendance-workflow-12cases.test.js`  
**Execution Time:** 945.9 ms  
**Pass Rate:** 12 / 12 Tests Passed (100%)  
**Verification Level:** [IMP], [UNT], [INT], [STG]  

---

## 1. Complete 12-Case Workflow Test Results

| Case # | Scenario | Inputs & Conditions | Evaluated Status | Metrics Verified | Result |
|---|---|---|---|---|:---:|
| **Case 1** | **Joins on time** | Start 10:00, Join 10:02, Leave 10:47 | `PRESENT` | Duration: 45m (>=30m), Late: 0m | **PASS** |
| **Case 2** | **Joins late** | Start 10:00, Join 10:16, Leave 10:50 | `LATE` | Duration: 34m (>=30m), Late: 16m (>10m grace) | **PASS** |
| **Case 3** | **Leaves early** | Start 10:00, Join 10:01, Leave 10:20 | `SHORT_ATTENDANCE` | Duration: 19m (<30m minimum threshold) | **PASS** |
| **Case 4** | **Disconnects & Rejoins** | 10:02-10:18 (16m) + 10:22-10:48 (26m) | `PRESENT` | Merged: 42m, Reconnection Count: 1 | **PASS** |
| **Case 5** | **Never joins** | Meeting completed, 0 sessions recorded | `ABSENT` | Duration: 0m, Status: ABSENT | **PASS** |
| **Case 6** | **Anonymous caller** | Participant has `anonymousUser` object | `NEEDS_REVIEW` | Zero employee mapped, held for HR review | **PASS** |
| **Case 7** | **Unregistered Google ID** | Participant email not in employee roster | `NEEDS_REVIEW` | Zero employee mapped, zero credit | **PASS** |
| **Case 8** | **Second device overlap** | Laptop 10:00-10:30 + Phone 10:20-10:45 | `PRESENT` | Merged: 45m (10m overlap neutralized) | **PASS** |
| **Case 9** | **Duplicate Pub/Sub** | Same `messageId` delivered twice | `PROCESSED` | 1st accepted, 2nd caught E11000 & ACKed | **PASS** |
| **Case 10** | **Transient API failure** | Google Meet API responds HTTP 503 | `RETRYABLE` | Flags retry without worker crash | **PASS** |
| **Case 11** | **Delayed Pub/Sub** | Webhook arrives 20 min post-meeting | `PRESENT` | Retroactive reconciliation succeeds (43m) | **PASS** |
| **Case 12** | **Meeting cancelled** | Admin cancels meeting prior to start | `CANCELLED` | Zero absence penalties assigned | **PASS** |

---

## 2. In-Depth Scenario Analysis

### 2.1. Network Disconnection & Reconnection (Case 4)
- **Problem:** An employee experiencing Wi-Fi flicker disconnects at 10:18 and reconnects via cellular hotspot at 10:22.
- **Verification:** The interval merging algorithm (`mergeTimeIntervals`) extracts both sessions, verifies they are disjoint, and calculates total duration:
  $$\text{Total Duration} = (10:18 - 10:02) + (10:48 - 10:22) = 16 + 26 = 42\text{ minutes}$$
- Because 42 minutes $\ge$ 30-minute threshold, the employee is awarded `PRESENT` with `reconnectionCount: 1`.

### 2.2. Dual-Device Handover & Overlapping Sessions (Case 8)
- **Problem:** An employee transitions from laptop to mobile phone. Both devices remain connected simultaneously from 10:20 to 10:30.
- **Verification:** Naive summation would calculate $30 + 25 = 55$ minutes. The interval merging engine identifies that `10:20 <= 10:30`, extends the boundary to `10:45`, and produces a single interval `[10:00, 10:45]`. The duration is accurately calculated as 45 minutes, completely preventing double-counting.

### 2.3. Anti-Spoofing Policy (Cases 6 & 7)
- **Anonymous Participants:** Google Meet participants lacking a `signedinUser.user` email are classified as `ANONYMOUS` and assigned zero duration credits.
- **External Accounts:** If an employee joins from a personal Gmail not registered as their `googleEmail`, no employee record is matched. The session is recorded as unmapped and highlighted on the Admin Attendance Dashboard. The employee can subsequently submit an attendance dispute via the Employee Portal attaching proof of identity.

---

## 3. Test Runner TAP Log Evidence

```text
TAP version 13
# Subtest: Case 1: Employee joins on time (PRESENT)
ok 1 - Case 1: Employee joins on time (PRESENT)
# Subtest: Case 2: Employee joins late (LATE)
ok 2 - Case 2: Employee joins late (LATE)
# Subtest: Case 3: Employee leaves early (SHORT_ATTENDANCE)
ok 3 - Case 3: Employee leaves early (SHORT_ATTENDANCE)
# Subtest: Case 4: Employee disconnects and rejoins across network drops
ok 4 - Case 4: Employee disconnects and rejoins across network drops
# Subtest: Case 5: Employee never joins (ABSENT upon meeting completion)
ok 5 - Case 5: Employee never joins (ABSENT upon meeting completion)
# Subtest: Case 6: Anonymous participant joins (flagged, zero employee credit)
ok 6 - Case 6: Anonymous participant joins (flagged, zero employee credit)
# Subtest: Case 7: Unregistered Google account joins (NEEDS_REVIEW / unmapped)
ok 7 - Case 7: Unregistered Google account joins (NEEDS_REVIEW / unmapped)
# Subtest: Case 8: Employee joins using a second device simultaneously (no double counting)
ok 8 - Case 8: Employee joins using a second device simultaneously (no double counting)
# Subtest: Case 9: Duplicate Pub/Sub event delivery occurs (Idempotency inbox)
ok 9 - Case 9: Duplicate Pub/Sub event delivery occurs (Idempotency inbox)
# Subtest: Case 10: Google API temporary failure (Non-crashing retryable failure)
ok 10 - Case 10: Google API temporary failure (Non-crashing retryable failure)
# Subtest: Case 11: Delayed Pub/Sub delivery arrives post-meeting (Retroactive correction)
ok 11 - Case 11: Delayed Pub/Sub delivery arrives post-meeting (Retroactive correction)
# Subtest: Case 12: Meeting is cancelled (Zero absent penalty)
ok 12 - Case 12: Meeting is cancelled (Zero absent penalty)
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 945.9344
```
