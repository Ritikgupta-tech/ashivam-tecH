/**
 * Merges an array of [start, end] time intervals, resolving any overlapping intervals.
 * Returns array of disjoint [start, end] intervals.
 */
export const mergeTimeIntervals = (intervals) => {
  if (!Array.isArray(intervals) || intervals.length === 0) return [];

  // Filter valid intervals and sort by start time
  const valid = intervals
    .map((iv) => ({
      start: new Date(iv.start).getTime(),
      end: new Date(iv.end || Date.now()).getTime(),
    }))
    .filter((iv) => !isNaN(iv.start) && !isNaN(iv.end) && iv.end >= iv.start)
    .sort((a, b) => a.start - b.start);

  if (valid.length === 0) return [];

  const merged = [valid[0]];

  for (let i = 1; i < valid.length; i++) {
    const current = valid[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping or contiguous interval
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
};

/**
 * Calculates total duration in minutes from merged intervals.
 */
export const calculateTotalDurationMinutes = (intervals) => {
  const merged = mergeTimeIntervals(intervals);
  const totalMs = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
  return Math.round((totalMs / (1000 * 60)) * 10) / 10; // 1 decimal precision
};

/**
 * Calculates attendance status and metrics for an employee in a meeting based on policy.
 */
export const evaluateAttendanceStatus = ({
  sessions = [],
  meeting = {},
  policy = {},
  isMeetingConcluded = false,
  isExempted = false,
}) => {
  if (isExempted) {
    return {
      status: "EXEMPTED",
      isProvisional: false,
      firstJoinTime: null,
      lastLeaveTime: null,
      totalConnectedDurationMinutes: 0,
      eligibleSessionMinutes: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      reconnectionCount: 0,
      attendancePercentage: 0,
    };
  }

  const gracePeriodMinutes = policy.gracePeriodMinutes ?? 5;
  const minimumAttendanceMinutes = policy.minimumAttendanceMinutes ?? 30;
  const minimumAttendancePercentage = policy.minimumAttendancePercentage ?? 60;

  const scheduledStartMs = new Date(meeting.scheduledStartTime).getTime();
  const scheduledEndMs = new Date(meeting.scheduledEndTime).getTime();
  const scheduledDurationMinutes = Math.max(
    1,
    Math.round((scheduledEndMs - scheduledStartMs) / (1000 * 60))
  );

  // If no sessions exist
  if (!sessions || sessions.length === 0) {
    if (!isMeetingConcluded) {
      return {
        status: "PENDING_VERIFICATION",
        isProvisional: true,
        firstJoinTime: null,
        lastLeaveTime: null,
        totalConnectedDurationMinutes: 0,
        eligibleSessionMinutes: 0,
        lateArrivalMinutes: 0,
        earlyDepartureMinutes: 0,
        reconnectionCount: 0,
        attendancePercentage: 0,
      };
    }
    return {
      status: "ABSENT",
      isProvisional: false,
      firstJoinTime: null,
      lastLeaveTime: null,
      totalConnectedDurationMinutes: 0,
      eligibleSessionMinutes: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      reconnectionCount: 0,
      attendancePercentage: 0,
    };
  }

  // Extract session intervals
  const rawIntervals = sessions.map((s) => ({
    start: s.startTime,
    end: s.endTime || (isMeetingConcluded ? meeting.scheduledEndTime : new Date()),
  }));

  const mergedIntervals = mergeTimeIntervals(rawIntervals);
  const totalDurationMinutes = calculateTotalDurationMinutes(mergedIntervals);

  // Sort starts and ends for timestamps
  const startTimes = sessions
    .map((s) => new Date(s.startTime).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  const endTimes = sessions
    .map((s) => (s.endTime ? new Date(s.endTime).getTime() : NaN))
    .filter((t) => !isNaN(t))
    .sort((a, b) => b - a);

  const firstJoinMs = startTimes[0];
  const lastLeaveMs = endTimes.length > 0 ? endTimes[0] : null;

  const firstJoinTime = firstJoinMs ? new Date(firstJoinMs) : null;
  const lastLeaveTime = lastLeaveMs ? new Date(lastLeaveMs) : null;

  // Late arrival calculation: minutes after scheduledStart + gracePeriod
  const graceCutoffMs = scheduledStartMs + gracePeriodMinutes * 60 * 1000;
  const isLate = firstJoinMs > graceCutoffMs;
  const lateArrivalMinutes = isLate
    ? Math.max(0, Math.round((firstJoinMs - scheduledStartMs) / (60 * 1000)))
    : 0;

  // Early departure calculation: minutes departed before scheduledEnd
  const earlyDepartureMinutes =
    lastLeaveMs && lastLeaveMs < scheduledEndMs
      ? Math.max(0, Math.round((scheduledEndMs - lastLeaveMs) / (60 * 1000)))
      : 0;

  const reconnectionCount = Math.max(0, sessions.length - 1);
  const attendancePercentage = Math.min(
    100,
    Math.round((totalDurationMinutes / scheduledDurationMinutes) * 100)
  );

  // Status classification
  let status = "PENDING_VERIFICATION";

  if (totalDurationMinutes < minimumAttendanceMinutes || attendancePercentage < minimumAttendancePercentage) {
    if (!isMeetingConcluded) {
      status = "PENDING_VERIFICATION";
    } else {
      status = "SHORT_ATTENDANCE";
    }
  } else if (isLate) {
    status = "LATE";
  } else {
    status = "PRESENT";
  }

  return {
    status,
    isProvisional: !isMeetingConcluded,
    firstJoinTime,
    lastLeaveTime,
    totalConnectedDurationMinutes: totalDurationMinutes,
    eligibleSessionMinutes: totalDurationMinutes,
    lateArrivalMinutes,
    earlyDepartureMinutes,
    reconnectionCount,
    attendancePercentage,
  };
};
