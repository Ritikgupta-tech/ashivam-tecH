# ATTENDANCE POLICY AND ENGINE REPORT
## Ashivam Technologies — Attendance Calculation Engine & Business Rules Specification

**Document Version:** 3.0.0-PROD-VERIFIED  
**Engine Module:** `backend/src/modules/attendance/services/attendanceEngine.service.js`  
**Test Suite:** `backend/tests/attendance-workflow-12cases.test.js` & `attendance-engine.test.js`  
**Pass Rate:** 20 / 20 Tests Passed (100%)  
**Verification Level:** [PASS] Empirical Code & Staging Verification  

---

## 1. Attendance Policy Parameters & Defaults

Attendance policies are managed through the database (`AttendancePolicy` model) and configurable via the Administrative Portal:

| Parameter | Default Value | Description |
|---|---|---|
| `gracePeriodMinutes` | **10 minutes** | Maximum allowable delay past scheduled start time before a join is marked late. |
| `minimumAttendanceMinutes` | **30 minutes** | Minimum cumulative connected duration required for `PRESENT` or `LATE` qualification. |
| `minimumAttendancePercentage` | **60%** | Alternative threshold: minimum percentage of total meeting duration attended. |
| `autoReconcileDelayMinutes` | **10 minutes** | Buffer post-meeting scheduled end time before running final absentee reconciliation. |
| `allowDisputes` | **true** | Permits employees to file formal correction requests with explanation and proof. |

---

## 2. Mathematical Model: Interval Merging Algorithm

In remote work environments, employees frequently disconnect due to unstable Wi-Fi, reboot their machines, or switch from desktop to phone hotspot.

### 2.1. Overlapping & Disjoint Session Merging (`mergeTimeIntervals`)
Given a set of raw sessions $S = \{ [s_1, e_1], [s_2, e_2], \dots, [s_n, e_n] \}$:
1. Filter out malformed intervals where $e_i < s_i$.
2. Sort intervals monotonically: $s_1 \le s_2 \le \dots \le s_n$.
3. For each interval $i$:
   - If $s_i \le e_{\text{prev}}$, merge: $e_{\text{prev}} \leftarrow \max(e_{\text{prev}}, e_i)$.
   - Else, append as a distinct disjoint interval.

$$\text{Total Duration (Minutes)} = \sum_{k=1}^{M} \frac{E_k - S_k}{60\,000}$$

### 2.2. Dual-Device Overlap Neutralization (Verified in Case 8)
- **Scenario:** Employee joins from laptop (10:00 - 10:30) and mobile phone (10:20 - 10:45) simultaneously.
- **Naive Sum:** $30 + 25 = 55\text{ minutes}$ (Invalid: exceeds 45-minute total meeting duration).
- **Engine Output:** Merged to $[10:00, 10:45] = \mathbf{45\text{ minutes}}$ (Accurate, zero double-counting).

---

## 3. Status Classification Decision Matrix

```mermaid
flowchart TD
    A["Evaluate Participant Sessions"] --> B{"Is Meeting Concluded?"}
    B -- "NO" --> C{"Any Connected Duration?"}
    C -- "NO" --> D["PENDING_VERIFICATION (Provisional)"]
    C -- "YES" --> E{"Duration >= Minimum Threshold?"}
    E -- "NO" --> D
    E -- "YES" --> F{"Joined <= Grace Period?"}
    F -- "YES" --> G["PRESENT"]
    F -- "NO" --> H["LATE"]
    
    B -- "YES" --> I{"Total Duration > 0?"}
    I -- "NO" --> J["ABSENT"]
    I -- "YES" --> K{"Duration >= Minimum Threshold?"}
    K -- "NO" --> L["SHORT_ATTENDANCE"]
    K -- "YES" --> M{"Joined <= Grace Period?"}
    M -- "YES" --> G
    M -- "NO" --> H
```

---

## 4. Empirical 12-Case Workflow Test Evidence

All 12 cases executed cleanly in `backend/tests/attendance-workflow-12cases.test.js`:

| Case | Condition | Evaluated Status | Verified Metrics |
|---|---|---|---|
| **Case 1** | Joined within grace, met duration | `PRESENT` | Duration: 45m, Late: 0m |
| **Case 2** | Joined after grace, met duration | `LATE` | Duration: 34m, Late: 16m |
| **Case 3** | Left early, duration < threshold | `SHORT_ATTENDANCE` | Duration: 19m (<30m) |
| **Case 4** | Disconnected & rejoined (2 sessions) | `PRESENT` | Merged: 42m, Reconnection: 1 |
| **Case 5** | Meeting ended with 0 sessions | `ABSENT` | Duration: 0m |
| **Case 6** | Anonymous participant (`anonymousUser`) | `NEEDS_REVIEW` | 0 employee credit |
| **Case 7** | External Google ID not in roster | `NEEDS_REVIEW` | 0 employee credit |
| **Case 8** | Dual device connection overlap | `PRESENT` | Merged: 45m (no double count) |
| **Case 9** | Duplicate Pub/Sub delivery | `PROCESSED` | 1st accepted, 2nd ACKed |
| **Case 10** | Transient Google 503 error | `RETRYABLE` | Non-fatal error handling |
| **Case 11** | Delayed webhook post-meeting | `PRESENT` | Retroactive reconciliation |
| **Case 12** | Meeting cancelled by admin | `CANCELLED` | 0 absence penalty |

---

## 5. Security & Dispute Governance

- **Self-Mutation Block:** Ordinary employees have zero write access to `AttendanceRecord`.
- **Dispute Submission:** Employees invoke `POST /api/v1/attendance/corrections` providing reason and proof URL.
- **Admin Adjudication:** Administrators approve or reject disputes via `PATCH /api/v1/attendance/admin/corrections/:id`, updating records with an indelible audit trail (`reviewedBy`, `reviewNotes`, `reviewedAt`).
