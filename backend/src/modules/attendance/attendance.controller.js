import Meeting from "./models/meeting.model.js";
import AttendanceRecord from "./models/attendanceRecord.model.js";
import AttendancePolicy from "./models/attendancePolicy.model.js";
import AttendanceCorrectionRequest from "./models/attendanceCorrectionRequest.model.js";
import ParticipantSession from "./models/participantSession.model.js";
import ReconciliationJob from "./models/reconciliationJob.model.js";
import Employee from "../employee/employee.model.js";
import {
  generateOAuthAuthUrl,
  validateOAuthState,
  exchangeCodeForTokens,
  createMeetSpace,
  getIntegrationHealth,
  disconnectGoogleIntegration,
} from "./services/googleMeet.service.js";
import {
  ingestPubSubMessage,
  reconcileMeetingAttendance,
} from "./services/reconciliation.service.js";
import { toCsv } from "../../utils/csv.js";
import env from "../../config/env.js";

// ==========================================
// EMPLOYEE CONTROLLERS
// ==========================================

export const getMyAttendance = async (req, res, next) => {
  try {
    const employeeId = req.user.id || req.user.employeeId;
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = { employeeId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      AttendanceRecord.find(filter)
        .populate("meetingId", "title scheduledStartTime scheduledEndTime meetingType googleMeetingUri status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AttendanceRecord.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySummary = async (req, res, next) => {
  try {
    const employeeId = req.user.id || req.user.employeeId;

    const records = await AttendanceRecord.find({ employeeId }).lean();
    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const short = records.filter((r) => r.status === "SHORT_ATTENDANCE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const pending = records.filter((r) => r.status === "PENDING_VERIFICATION").length;
    const exempted = records.filter((r) => r.status === "EXEMPTED").length;

    const evaluatedTotal = total - pending - exempted;
    const attendancePercentage =
      evaluatedTotal > 0
        ? Math.round(((present + late) / evaluatedTotal) * 100)
        : 100;

    return res.status(200).json({
      success: true,
      data: {
        totalMeetings: total,
        present,
        late,
        shortAttendance: short,
        absent,
        pendingVerification: pending,
        exempted,
        attendancePercentage,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCalendar = async (req, res, next) => {
  try {
    const employeeId = req.user.id || req.user.employeeId;
    const { year, month } = req.query;

    const now = new Date();
    const queryYear = Number(year) || now.getFullYear();
    const queryMonth = Number(month) || now.getMonth() + 1; // 1-12

    const startOfMonth = new Date(queryYear, queryMonth - 1, 1);
    const endOfMonth = new Date(queryYear, queryMonth, 0, 23, 59, 59);

    const records = await AttendanceRecord.find({
      employeeId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .populate("meetingId", "title scheduledStartTime scheduledEndTime meetingType googleMeetingUri status")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        year: queryYear,
        month: queryMonth,
        items: records,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingMeetings = async (req, res, next) => {
  try {
    const employeeId = req.user.id || req.user.employeeId;
    const employee = await Employee.findById(employeeId);

    const filter = {
      status: { $in: ["SCHEDULED", "IN_PROGRESS"] },
      scheduledEndTime: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // past 1 hr to future
    };

    if (employee) {
      filter.$or = [
        { assignedEmployees: employee._id },
        { assignedDepartments: employee.department },
        { assignedEmployees: { $size: 0 }, assignedDepartments: { $size: 0 } }, // Company-wide
      ];
    }

    const meetings = await Meeting.find(filter)
      .sort({ scheduledStartTime: 1 })
      .limit(10)
      .lean();

    // Check attendance status for each meeting for this employee
    const meetingIds = meetings.map((m) => m._id);
    const userRecords = await AttendanceRecord.find({
      meetingId: { $in: meetingIds },
      employeeId,
    }).lean();

    const recordMap = new Map(userRecords.map((r) => [r.meetingId.toString(), r]));

    const enriched = meetings.map((m) => ({
      ...m,
      attendanceRecord: recordMap.get(m._id.toString()) || null,
    }));

    return res.status(200).json({
      success: true,
      data: enriched,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getMeetingById = async (req, res, next) => {
  try {
    // Role-based scope protection: Validate employee profile before meeting lookup
    let employee = null;
    if (req.user && req.user.role === "Employee") {
      const employeeId = req.user.id || req.user.employeeId;
      employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Employee profile not found or inactive.",
          requestId: req.id,
        });
      }
    }

    const meeting = await Meeting.findById(req.params.id)
      .populate("assignedEmployees", "firstName lastName email department employeeId")
      .lean();

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
        requestId: req.id,
      });
    }

    // Departmental and assignment scoping for employees
    if (employee) {
      const isAssigned = meeting.assignedEmployees?.some(
        (e) => String(e._id || e) === String(employee._id)
      );
      const isDept = meeting.assignedDepartments?.includes(employee.department);
      const isCompanyWide =
        (!meeting.assignedEmployees || meeting.assignedEmployees.length === 0) &&
        (!meeting.assignedDepartments || meeting.assignedDepartments.length === 0);

      if (!isAssigned && !isDept && !isCompanyWide) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not authorized to view this meeting.",
          requestId: req.id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: meeting,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Records employee attendance when clicking "Join Google Meet" from the portal.
 * Marks attendance as PRESENT, records join timestamp and participant session.
 */
export const joinMeeting = async (req, res, next) => {
  try {
    const { id: meetingId } = req.params;
    const employeeId = req.user.id || req.user.employeeId;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
        requestId: req.id,
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
        requestId: req.id,
      });
    }

    if (meeting.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot join a cancelled meeting",
        requestId: req.id,
      });
    }

    const now = new Date();
    const scheduledStart = new Date(meeting.scheduledStartTime);
    const scheduledEnd = new Date(meeting.scheduledEndTime);

    // Calculate late arrival with 15m grace period
    const gracePeriodMinutes = 15;
    const diffFromStartMinutes = Math.round((now.getTime() - scheduledStart.getTime()) / (1000 * 60));
    const isLate = diffFromStartMinutes > gracePeriodMinutes;
    const status = isLate ? "LATE" : "PRESENT";

    // Duration calculation: scheduled duration or minimum 30 mins
    const scheduledMinutes = Math.max(
      30,
      Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60))
    );

    // 1. Create ParticipantSession
    const sessionName = `portal-join-${meeting._id}-${employee._id}-${now.getTime()}`;
    await ParticipantSession.create({
      sessionName,
      meetingId: meeting._id,
      conferenceRecordId: meeting.googleMeetingCode || meeting.googleMeetingSpaceName || `conf-${meeting._id}`,
      matchedEmployeeId: employee._id,
      googleEmail: employee.googleEmail || employee.email,
      displayName: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim(),
      startTime: now,
      endTime: scheduledEnd > now ? scheduledEnd : new Date(now.getTime() + 60 * 60 * 1000),
      durationSeconds: scheduledMinutes * 60,
      joinMethod: "PORTAL_JOIN",
    });

    // 2. Upsert AttendanceRecord as PRESENT / LATE
    const attendanceRecord = await AttendanceRecord.findOneAndUpdate(
      { meetingId: meeting._id, employeeId: employee._id },
      {
        $set: {
          status,
          isProvisional: false,
          firstJoinTime: now,
          lastLeaveTime: scheduledEnd > now ? scheduledEnd : new Date(now.getTime() + 60 * 60 * 1000),
          totalConnectedDurationMinutes: scheduledMinutes,
          eligibleSessionMinutes: scheduledMinutes,
          attendancePercentage: isLate ? 85 : 100,
          verifiedVia: "PORTAL_JOIN",
          notes: `Joined Google Meet via Employee Portal at ${now.toLocaleTimeString()}`,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: `Attendance verified as ${status}. Joining meeting...`,
      data: {
        meetingId: meeting._id,
        googleMeetingUri: meeting.googleMeetingUri,
        status,
        attendanceRecord,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const submitCorrectionRequest = async (req, res, next) => {
  try {
    const employeeId = req.user.id || req.user.employeeId;
    const { attendanceRecordId, reason, proofReference, alternativeEmailUsed, requestedStatus } = req.body || {};

    if (!attendanceRecordId || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Attendance record ID and justification reason are required",
        requestId: req.id,
      });
    }

    const attendanceRecord = await AttendanceRecord.findOne({
      _id: attendanceRecordId,
      employeeId,
    });

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found or not owned by employee",
        requestId: req.id,
      });
    }

    const existingPending = await AttendanceCorrectionRequest.findOne({
      attendanceRecordId,
      status: "PENDING",
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "A correction request is already pending review for this meeting",
        requestId: req.id,
      });
    }

    const correction = await AttendanceCorrectionRequest.create({
      attendanceRecordId,
      employeeId,
      meetingId: attendanceRecord.meetingId,
      requestedStatus: requestedStatus || "PRESENT",
      reason: reason.trim(),
      proofReference: proofReference?.trim() || "",
      alternativeEmailUsed: alternativeEmailUsed?.trim()?.toLowerCase() || null,
      status: "PENDING",
    });

    attendanceRecord.correctionStatus = "DISPUTED";
    await attendanceRecord.save();

    return res.status(201).json({
      success: true,
      message: "Attendance dispute submitted successfully for administrative review",
      data: correction,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

export const getAdminAttendanceDashboard = async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments({ deletedAt: null });
    const activeEmployees = await Employee.countDocuments({ isActive: true, deletedAt: null });

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayMeetings = await Meeting.find({
      scheduledStartTime: { $gte: startOfToday, $lte: endOfToday },
    });
    const todayMeetingIds = todayMeetings.map((m) => m._id);

    const todayRecords = await AttendanceRecord.find({
      meetingId: { $in: todayMeetingIds },
    });

    const presentToday = todayRecords.filter((r) => r.status === "PRESENT").length;
    const absentToday = todayRecords.filter((r) => r.status === "ABSENT").length;
    const lateToday = todayRecords.filter((r) => r.status === "LATE").length;
    const shortToday = todayRecords.filter((r) => r.status === "SHORT_ATTENDANCE").length;
    const pendingVerification = todayRecords.filter((r) => r.status === "PENDING_VERIFICATION").length;

    const meetingsScheduled = await Meeting.countDocuments({ status: "SCHEDULED" });
    const meetingsCompleted = await Meeting.countDocuments({ status: "COMPLETED" });

    // Average attendance percentage
    const allFinalRecords = await AttendanceRecord.find({ isProvisional: false });
    const avgAttendance =
      allFinalRecords.length > 0
        ? Math.round(
            allFinalRecords.reduce((acc, r) => acc + (r.attendancePercentage || 0), 0) /
              allFinalRecords.length
          )
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        presentToday,
        absentToday,
        lateToday,
        shortToday,
        pendingVerification,
        meetingsScheduled,
        meetingsCompleted,
        averageAttendancePercentage: avgAttendance,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminAttendanceRecords = async (req, res, next) => {
  try {
    const { meetingId, employeeId, department, status, page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = {};
    if (meetingId) filter.meetingId = meetingId;
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      AttendanceRecord.find(filter)
        .populate("employeeId", "firstName lastName email employeeId department designation")
        .populate("meetingId", "title scheduledStartTime scheduledEndTime meetingType googleMeetingUri status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AttendanceRecord.countDocuments(filter),
    ]);

    // Optional post-filter by department
    let filteredRecords = records;
    if (department) {
      filteredRecords = records.filter(
        (r) => r.employeeId?.department?.toLowerCase() === department.toLowerCase()
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        records: filteredRecords,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminAttendanceCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};

    const record = await AttendanceRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
        requestId: req.id,
      });
    }

    if (status) record.status = status;
    if (notes !== undefined) record.notes = notes;
    record.isProvisional = false;
    record.verifiedVia = "MANUAL_CORRECTION";
    record.resolvedBy = req.user.id;
    record.correctionStatus = "RESOLVED_APPROVED";
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Attendance record updated successfully",
      data: record,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Direct manual override / mark attendance for an employee in a meeting.
 * Supports marking status as PRESENT, ABSENT, LATE, or EXCUSED.
 */
export const markAttendanceManual = async (req, res, next) => {
  try {
    const { id: meetingId } = req.params;
    const { employeeId, status = "PRESENT", notes } = req.body || {};

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
        requestId: req.id,
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
        requestId: req.id,
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
        requestId: req.id,
      });
    }

    const validStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
    const targetStatus = String(status).toUpperCase();
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid attendance status. Allowed: ${validStatuses.join(", ")}`,
        requestId: req.id,
      });
    }

    const scheduledStart = new Date(meeting.scheduledStartTime);
    const scheduledEnd = new Date(meeting.scheduledEndTime);
    const scheduledMinutes = Math.max(
      30,
      Math.round((scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60))
    );

    const record = await AttendanceRecord.findOneAndUpdate(
      { meetingId: meeting._id, employeeId: employee._id },
      {
        $set: {
          status: targetStatus,
          isProvisional: false,
          verifiedVia: "MANUAL_CORRECTION",
          resolvedBy: req.user.id,
          notes: notes || `Direct manual status update to ${targetStatus} by Admin`,
          ...(targetStatus === "PRESENT" || targetStatus === "LATE"
            ? {
                firstJoinTime: scheduledStart,
                lastLeaveTime: scheduledEnd,
                totalConnectedDurationMinutes: scheduledMinutes,
                eligibleSessionMinutes: scheduledMinutes,
                attendancePercentage: targetStatus === "LATE" ? 85 : 100,
              }
            : {
                totalConnectedDurationMinutes: 0,
                eligibleSessionMinutes: 0,
                attendancePercentage: 0,
              }),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.fullName || employee.firstName} attendance marked as ${targetStatus}`,
      data: record,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminCorrectionRequests = async (req, res, next) => {
  try {
    const { status = "PENDING" } = req.query;
    const requests = await AttendanceCorrectionRequest.find({ status })
      .populate("employeeId", "firstName lastName email employeeId department")
      .populate("meetingId", "title scheduledStartTime scheduledEndTime")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: requests,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveAdminCorrectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reviewNotes } = req.body || {}; // action: "APPROVE" | "REJECT"

    const request = await AttendanceCorrectionRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Dispute correction request not found",
        requestId: req.id,
      });
    }

    if (action === "APPROVE") {
      request.status = "APPROVED";
      request.reviewedBy = req.user.id;
      request.reviewNotes = reviewNotes || "Approved by administration";
      request.reviewedAt = new Date();
      await request.save();

      // Update attendance record
      await AttendanceRecord.findByIdAndUpdate(request.attendanceRecordId, {
        status: request.requestedStatus,
        isProvisional: false,
        correctionStatus: "RESOLVED_APPROVED",
        verifiedVia: "MANUAL_CORRECTION",
        resolvedBy: req.user.id,
        notes: `Correction approved: ${request.reason}`,
      });
    } else {
      request.status = "REJECTED";
      request.reviewedBy = req.user.id;
      request.reviewNotes = reviewNotes || "Rejected by administration";
      request.reviewedAt = new Date();
      await request.save();

      await AttendanceRecord.findByIdAndUpdate(request.attendanceRecordId, {
        correctionStatus: "RESOLVED_REJECTED",
        resolvedBy: req.user.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Dispute request ${request.status.toLowerCase()} successfully`,
      data: request,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const exportAttendanceReport = async (req, res, next) => {
  try {
    const { meetingId, format = "csv" } = req.query;

    const filter = {};
    if (meetingId) filter.meetingId = meetingId;

    const records = await AttendanceRecord.find(filter)
      .populate("employeeId", "firstName lastName email employeeId department")
      .populate("meetingId", "title scheduledStartTime scheduledEndTime")
      .sort({ createdAt: -1 })
      .lean();

    const columns = [
      {
        key: "employeeId",
        label: "Employee ID",
        transform: (r) => r.employeeId?.employeeId || r.employeeId?._id?.toString() || "N/A",
      },
      {
        key: "employeeName",
        label: "Employee Name",
        transform: (r) => (r.employeeId ? `${r.employeeId.firstName || ""} ${r.employeeId.lastName || ""}`.trim() : "Unknown"),
      },
      { key: "workEmail", label: "Work Email", transform: (r) => r.employeeId?.email || "N/A" },
      { key: "department", label: "Department", transform: (r) => r.employeeId?.department || "General" },
      { key: "meetingTitle", label: "Meeting Title", transform: (r) => r.meetingId?.title || "Daily Standup" },
      {
        key: "meetingDate",
        label: "Meeting Date",
        transform: (r) =>
          r.meetingId?.scheduledStartTime ? new Date(r.meetingId.scheduledStartTime).toLocaleDateString("en-IN") : "N/A",
      },
      { key: "status", label: "Status" },
      { key: "duration", label: "Duration (Mins)", transform: (r) => r.totalConnectedDurationMinutes || 0 },
      { key: "lateArrival", label: "Late Arrival (Mins)", transform: (r) => r.lateArrivalMinutes || 0 },
      { key: "attendancePercentage", label: "Attendance %", transform: (r) => `${r.attendancePercentage || 0}%` },
      { key: "verified", label: "Verified", transform: (r) => (r.isProvisional ? "Provisional" : r.verifiedVia || "Finalized") },
    ];

    if (format === "csv") {
      const csvString = toCsv(records, columns);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="attendance_report.csv"');
      return res.status(200).send(csvString);
    }

    return res.status(200).json({
      success: true,
      data: records,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const listMeetings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.title = new RegExp(search.trim(), "i");

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .populate("assignedEmployees", "firstName lastName email employeeId department")
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Meeting.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        meetings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const createMeeting = async (req, res, next) => {
  try {
    const {
      title,
      description,
      meetingType,
      scheduledStartTime,
      scheduledEndTime,
      timeZone,
      googleMeetingUri,
      assignedDepartments,
      assignedEmployees,
      isRecurring,
      recurrenceRule,
      createGoogleMeetSpace,
    } = req.body || {};

    if (!title?.trim() || !scheduledStartTime || !scheduledEndTime) {
      return res.status(400).json({
        success: false,
        message: "Title, start time, and end time are required",
        requestId: req.id,
      });
    }

    const start = new Date(scheduledStartTime);
    const end = new Date(scheduledEndTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start time or end time format",
        requestId: req.id,
      });
    }
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "Scheduled end time must be after scheduled start time",
        requestId: req.id,
      });
    }

    let spaceName = null;
    let meetingUri = googleMeetingUri?.trim() || null;
    let meetingCode = null;

    // Optional dynamic space creation via Google Meet REST API v2
    if (createGoogleMeetSpace) {
      try {
        const spaceResult = await createMeetSpace();
        spaceName = spaceResult.spaceName;
        meetingUri = spaceResult.meetingUri;
        meetingCode = spaceResult.meetingCode;
      } catch (err) {
        console.warn(`[Google Meet Create Notice]: ${err.message}. Using manual URI.`);
      }
    }

    if (meetingUri && !meetingCode) {
      const match = meetingUri.match(/meet\.google\.com\/([a-z0-9-]+)/i);
      if (match) meetingCode = match[1];
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description?.trim() || "",
      meetingType: meetingType || "Daily Standup",
      scheduledStartTime: new Date(scheduledStartTime),
      scheduledEndTime: new Date(scheduledEndTime),
      timeZone: timeZone || "Asia/Kolkata",
      googleMeetingSpaceName: spaceName,
      googleMeetingUri: meetingUri,
      googleMeetingCode: meetingCode,
      assignedDepartments: Array.isArray(assignedDepartments) ? assignedDepartments : [],
      assignedEmployees: Array.isArray(assignedEmployees) ? assignedEmployees : [],
      isRecurring: Boolean(isRecurring),
      recurrenceRule: recurrenceRule || "NONE",
      status: "SCHEDULED",
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Meeting scheduled successfully",
      data: meeting,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    updates.updatedBy = req.user.id;

    const existing = await Meeting.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
        requestId: req.id,
      });
    }

    if (updates.scheduledStartTime || updates.scheduledEndTime) {
      const start = updates.scheduledStartTime ? new Date(updates.scheduledStartTime) : existing.scheduledStartTime;
      const end = updates.scheduledEndTime ? new Date(updates.scheduledEndTime) : existing.scheduledEndTime;
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start time or end time format",
          requestId: req.id,
        });
      }
      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: "Scheduled end time must be after scheduled start time",
          requestId: req.id,
        });
      }
    }

    const meeting = await Meeting.findByIdAndUpdate(id, { $set: updates }, { returnDocument: "after" });

    if (updates.status === "CANCELLED") {
      await AttendanceRecord.updateMany(
        { meetingId: id },
        { $set: { status: "CANCELLED", isProvisional: false } }
      );
    }

    if (updates.status === "COMPLETED") {
      try {
        await reconcileMeetingAttendance(id);
      } catch (recErr) {
        console.warn(`[Attendance Controller] Auto-reconciliation on meeting completion:`, recErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Meeting updated successfully",
      data: meeting,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { status: "CANCELLED", updatedBy: req.user.id },
      { returnDocument: "after" }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
        requestId: req.id,
      });
    }

    // Cancel all attendance records for this meeting
    await AttendanceRecord.updateMany(
      { meetingId: id },
      { $set: { status: "CANCELLED", isProvisional: false } }
    );

    return res.status(200).json({
      success: true,
      message: "Meeting cancelled successfully",
      data: meeting,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerReconciliation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await reconcileMeetingAttendance(id);

    return res.status(200).json({
      success: true,
      message: "Reconciliation completed successfully",
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GOOGLE INTEGRATION & PUBSUB CONTROLLERS
// ==========================================

export const getGoogleOAuthAuthorizeUrl = (req, res, next) => {
  try {
    const { url, state } = generateOAuthAuthUrl();
    return res.status(200).json({
      success: true,
      data: { url, state },
      requestId: req.id,
    });
  } catch (error) {
    const statusCode = error.statusCode || 503;
    return res.status(statusCode).json({
      success: false,
      code: error.code || "GOOGLE_OAUTH_CONFIG_ERROR",
      message: error.message || "Failed to initialize Google OAuth authorization",
      requestId: req.id,
    });
  }
};

export const handleGoogleOAuthCallback = async (req, res, next) => {
  const clientUrl = env.clientUrl || "https://ashivam-tec-h.vercel.app";
  const acceptsHtml = req.headers.accept?.includes("text/html");

  try {
    const { code, state, error } = req.query;

    if (error) {
      if (acceptsHtml) {
        return res.redirect(`${clientUrl}/admin?tab=google&status=error&message=${encodeURIComponent(`Google OAuth authorization denied: ${error}`)}`);
      }
      return res.status(400).json({
        success: false,
        message: `Google OAuth authorization denied: ${error}`,
        requestId: req.id,
      });
    }

    if (!state || !validateOAuthState(state)) {
      if (acceptsHtml) {
        return res.redirect(`${clientUrl}/admin?tab=google&status=error&message=${encodeURIComponent("Invalid or expired OAuth state parameter (CSRF protection)")}`);
      }
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OAuth state parameter (CSRF protection)",
        requestId: req.id,
      });
    }

    const integration = await exchangeCodeForTokens(code);

    if (acceptsHtml) {
      return res.redirect(`${clientUrl}/admin?tab=google&status=connected`);
    }

    return res.status(200).json({
      success: true,
      message: "Google Workspace successfully authorized",
      data: {
        status: integration.status,
        connectedAccountEmail: integration.connectedAccountEmail,
      },
      requestId: req.id,
    });
  } catch (error) {
    if (acceptsHtml) {
      return res.redirect(`${clientUrl}/admin?tab=google&status=error&message=${encodeURIComponent(error.message || "Failed to exchange authorization code for tokens")}`);
    }
    next(error);
  }
};

export const getGoogleIntegrationStatus = async (req, res, next) => {
  try {
    const health = await getIntegrationHealth();
    return res.status(200).json({
      success: true,
      data: health,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const disconnectGoogleIntegrationController = async (req, res, next) => {
  try {
    const result = await disconnectGoogleIntegration();
    return res.status(200).json({
      success: true,
      message: "Google Workspace integration disconnected and tokens revoked",
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const handlePubSubWebhook = async (req, res, next) => {
  try {
    // Secret or query token verification
    const secret = req.query.secret || req.headers["x-pubsub-secret"] || req.headers["x-goog-channel-token"];
    const authHeader = req.headers.authorization;

    if (secret && env.googlePubSubSecret && secret !== env.googlePubSubSecret) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized Pub/Sub webhook sender: invalid secret",
        requestId: req.id,
      });
    }

    if (env.isProduction && !secret && !authHeader) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized Pub/Sub webhook sender: authentication required in production",
        requestId: req.id,
      });
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          if (
            (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") ||
            (payload.exp && payload.exp * 1000 <= Date.now())
          ) {
            return res.status(403).json({
              success: false,
              message: "Unauthorized Pub/Sub webhook sender: invalid Google service account token",
              requestId: req.id,
            });
          }
        }
      } catch {
        return res.status(403).json({
          success: false,
          message: "Unauthorized Pub/Sub webhook sender: malformed authorization token",
          requestId: req.id,
        });
      }
    }

    const { message, subscription } = req.body || {};
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Missing Pub/Sub message body",
        requestId: req.id,
      });
    }

    const result = await ingestPubSubMessage({ message, subscription });

    // Pub/Sub requires HTTP 200/204 to acknowledge receipt
    return res.status(200).json({
      success: true,
      status: result.status,
      messageId: result.messageId,
      requestId: req.id,
    });
  } catch (error) {
    console.error("[PubSub Error]:", error);
    // Return 200 with error log so Pub/Sub does not spam endless retries on poison messages
    return res.status(200).json({
      success: false,
      error: error.message,
      requestId: req.id,
    });
  }
};

export const triggerGlobalReconciliation = async (req, res, next) => {
  try {
    // Locate all meetings that ended in the past 24 hours but are not reconciled
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completedMeetings = await Meeting.find({
      scheduledEndTime: { $gte: past24h, $lte: new Date() },
    });

    const results = [];
    for (const m of completedMeetings) {
      try {
        const r = await reconcileMeetingAttendance(m._id);
        results.push({ meetingId: m._id, ...r });
      } catch (err) {
        results.push({ meetingId: m._id, status: "FAILED", error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Global reconciliation executed for ${completedMeetings.length} meetings`,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
