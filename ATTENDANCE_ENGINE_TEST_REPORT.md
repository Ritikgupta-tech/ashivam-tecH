# ATTENDANCE ENGINE TEST REPORT
## Ashivam Technologies — Attendance Calculation Engine & Interval Merging

**Document Version:** 1.0.0-PROD  
**Service:** `backend/src/modules/attendance/services/attendanceEngine.service.js`  
**Test Suite:** `backend/tests/attendance-engine.test.js`  
**Verification Result:** 8 / 8 Tests Passing (100% Pass Rate)  

---

## 1. Algorithmic Overview & Mathematical Model

In corporate remote work environments, employees frequently encounter transient network disconnections, switch from desktop Wi-Fi to cellular hotspot, or experience browser crashes. When an employee reconnects to a Google Meet call, Google Meet v2 REST API generates separate `participantSession` objects for each segment.

A naive summation of raw timestamps can fail catastrophically:
- If sessions overlap (e.g., dual connection during device handover where desktop and phone are connected simultaneously for 2 minutes), naive summation double-counts those 2 minutes.
- If sessions are out of order, naive subtraction yields negative durations.

### 1.1. Disjoint & Overlapping Interval Merging (`mergeTimeIntervals`)
The engine implements an optimal $O(N \log N)$ interval-merging algorithm:

```javascript
export function mergeTimeIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];
  // 1. Filter invalid intervals and convert to timestamps
  const valid = intervals
    .filter((iv) => iv.start && iv.end && new Date(iv.end) >= new Date(iv.start))
    .map((iv) => ({ start: new Date(iv.start).getTime(), end: new Date(iv.end).getTime() }));

  if (valid.length === 0) return [];

  // 2. Sort intervals monotonically by start timestamp
  valid.sort((a, b) => a.start - b.start);

  const merged = [valid[0]];

  for (let i = 1; i < valid.length; i++) {
    const current = valid[i];
    const lastMerged = merged[merged.length - 1];

    if (current.start <= lastMerged.end) {
      // Overlap or contiguous connection: extend boundary to maximum end time
      lastMerged.end = Math.max(lastMerged.end, current.end);
    } else {
      // Disjoint interval: push new segment
      merged.push({ ...current });
    }
  }

  return merged.map((iv) => ({ start: new Date(iv.start), end: new Date(iv.end) }));
}
```

### 1.2. Connected Duration Calculation
$$\text{Total Duration (Minutes)} = \sum_{k=1}^{M} \frac{\text{Merged}[k].\text{end} - \text{Merged}[k].\text{start}}{60\,000}$$

---

## 2. Status Classification Rules Matrix

Given a meeting with:
- $\text{Scheduled Start Time } (T_{\text{start}})$
- $\text{Scheduled End Time } (T_{\text{end}})$
- $\text{Scheduled Duration } D_{\text{sched}} = T_{\text{end}} - T_{\text{start}}$
- $\text{Policy Grace Period } G$ (default: 10 minutes)
- $\text{Policy Minimum Percentage } P_{\text{min}}$ (default: 70%) or Minimum Minutes $D_{\text{min}}$ (default: 30 minutes)
- $\text{Employee First Join Timestamp } T_{\text{join}}$
- $\text{Total Connected Minutes } D_{\text{conn}}$
- $\text{Meeting State } S_{\text{meet}} \in \{ \text{SCHEDULED}, \text{ACTIVE}, \text{COMPLETED}, \text{CANCELLED} \}$

| Status | Condition | Rationale |
|---|---|---|
| `PRESENT` | $D_{\text{conn}} \ge D_{\text{min}} \land (T_{\text{join}} - T_{\text{start}}) \le G$ | Joined within grace window and attended required duration. |
| `LATE` | $D_{\text{conn}} \ge D_{\text{min}} \land (T_{\text{join}} - T_{\text{start}}) > G$ | Attended required duration but joined after grace period elapsed. |
| `SHORT_ATTENDANCE` | $0 < D_{\text{conn}} < D_{\text{min}}$ | Joined call, but stayed less than required minimum duration. |
| `PENDING_VERIFICATION` | $D_{\text{conn}} == 0 \land S_{\text{meet}} \ne \text{COMPLETED}$ | Meeting is active or in progress; cannot mark absent prematurely. |
| `ABSENT` | $D_{\text{conn}} == 0 \land S_{\text{meet}} == \text{COMPLETED}$ | Meeting has concluded and zero verified Google Meet participation was recorded. |
| `NEEDS_REVIEW` | Anonymous / Unmatched participant email | Requires HR or Admin to verify identity. |

---

## 3. Automated Test Execution Evidence

The unit test suite `backend/tests/attendance-engine.test.js` exercises every branch of the calculation engine:

```text
TAP version 13
# Subtest: Attendance Engine: mergeTimeIntervals correctly merges overlapping intervals
ok 1 - Attendance Engine: mergeTimeIntervals correctly merges overlapping intervals
  ---
  duration_ms: 1.1331
  type: 'test'
  ...
# Subtest: Attendance Engine: calculateTotalDurationMinutes sums disjoint intervals accurately
ok 2 - Attendance Engine: calculateTotalDurationMinutes sums disjoint intervals accurately
  ---
  duration_ms: 0.9161
  type: 'test'
  ...
# Subtest: Attendance Engine: evaluateAttendanceStatus marks PRESENT when within grace period and met threshold
ok 3 - Attendance Engine: evaluateAttendanceStatus marks PRESENT when within grace period and met threshold
  ---
  duration_ms: 0.4993
  type: 'test'
  ...
# Subtest: Attendance Engine: evaluateAttendanceStatus marks LATE when joining after grace period
ok 4 - Attendance Engine: evaluateAttendanceStatus marks LATE when joining after grace period
  ---
  duration_ms: 0.3028
  type: 'test'
  ...
# Subtest: Attendance Engine: evaluateAttendanceStatus marks SHORT_ATTENDANCE when duration < minimum
ok 5 - Attendance Engine: evaluateAttendanceStatus marks SHORT_ATTENDANCE when duration < minimum
  ---
  duration_ms: 0.2439
  type: 'test'
  ...
# Subtest: Attendance Engine: evaluateAttendanceStatus marks PENDING_VERIFICATION while meeting is in progress
ok 6 - Attendance Engine: evaluateAttendanceStatus marks PENDING_VERIFICATION while meeting is in progress
  ---
  duration_ms: 0.0974
  type: 'test'
  ...
# Subtest: Attendance Engine: evaluateAttendanceStatus marks ABSENT only after meeting conclusion
ok 7 - Attendance Engine: evaluateAttendanceStatus marks ABSENT only after meeting conclusion
  ---
  duration_ms: 0.1371
  type: 'test'
  ...
# Subtest: Attendance Engine: Handles multiple reconnections without duplicating attendance
ok 8 - Attendance Engine: Handles multiple reconnections without duplicating attendance
  ---
  duration_ms: 0.1407
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 125.2334
```

---

## 4. Reconnection & Edge Case Verification

### Case Study: Multi-Device Reconnection (Test 8)
- **Scenario:** An employee joins at 10:00 AM on a laptop. At 10:18 AM, the Wi-Fi flickers; the employee connects via phone hotspot at 10:19 AM while the laptop session lingers until 10:20 AM (1-minute overlap: [10:00 - 10:20] and [10:19 - 10:45]).
- **Raw Sum:** 20 mins + 26 mins = 46 mins (wrong: exceeds 45-minute total duration).
- **Engine Merged Interval:** `[10:00, 10:45]` = exactly 45 contiguous minutes.
- **Result:** Accurately classified as `PRESENT` with `sessionCount = 2`.
