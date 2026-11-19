import crypto from "crypto";
import bcrypt from "bcryptjs";
import Employee from "./employee.model.js";
import Counter from "../../models/counter.model.js";
import RefreshToken from "../../models/refreshToken.model.js";
import env from "../../config/env.js";
import { escapeRegex } from "../../utils/query.js";
import { toCsv } from "../../utils/csv.js";
import {
  sendEmployeeInvitation,
  sendEmployeePasswordReset,
} from "../notification/email.service.js";

export const EMPLOYEE_PROJECTION =
  "_id firstName lastName email employeeId googleEmail role phone profileImage designation department employmentType employmentStatus accountStatus joiningDate workLocation bio skills socialLinks displayOrder isFeatured isActive isEmailVerified activationSentAt activationResendCount lastLoginAt createdAt updatedAt";

export const PUBLIC_EMPLOYEE_PROJECTION =
  "_id firstName lastName designation department profileImage bio skills socialLinks displayOrder isFeatured workLocation";

const normalizeEmail = (email) =>
  email.trim().toLowerCase();

const buildSearchFilter = ({
  search,
  department,
  designation,
  employmentType,
  workLocation,
  isActive,
  isFeatured,
}) => {
  const filter = {
    deletedAt: null,
  };

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { designation: regex },
      { department: regex },
    ];
  }

  if (department) {
    filter.department = department;
  }

  if (designation) {
    filter.designation = designation;
  }

  if (employmentType) {
    filter.employmentType = employmentType;
  }

  if (workLocation) {
    filter.workLocation = workLocation;
  }

  if (isActive !== undefined) {
    filter.isActive =
      String(isActive).toLowerCase() === "true";
  }

  if (isFeatured !== undefined) {
    filter.isFeatured =
      String(isFeatured).toLowerCase() === "true";
  }

  return filter;
};

export const listEmployees = async ({
  page = 1,
  limit = 20,
  search,
  department,
  designation,
  employmentType,
  workLocation,
  isActive,
  isFeatured,
  sort = "displayOrder",
  order = "asc",
  projection = EMPLOYEE_PROJECTION,
}) => {
  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const skip =
    (safePage - 1) * safeLimit;

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "firstName",
    "lastName",
    "joiningDate",
    "displayOrder",
    "department",
    "designation",
  ];

  const sortField =
    allowedSortFields.includes(sort)
      ? sort
      : "displayOrder";

  const sortDirection =
    String(order).toLowerCase() === "desc"
      ? -1
      : 1;

  const filter = buildSearchFilter({
    search,
    department,
    designation,
    employmentType,
    workLocation,
    isActive,
    isFeatured,
  });

  const [employees, total] =
    await Promise.all([
      Employee.find(filter)
        .select(projection)
        .sort({
          [sortField]: sortDirection,
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Employee.countDocuments(filter),
    ]);

  return {
    employees,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit
      ),
    },
  };
};

export const listPublicEmployees = async ({
  page = 1,
  limit = 50,
  department,
  designation,
  isFeatured,
}) => {
  return listEmployees({
    page,
    limit,
    department,
    designation,
    isFeatured,
    isActive: true,
    sort: "displayOrder",
    order: "asc",
    projection: PUBLIC_EMPLOYEE_PROJECTION,
  });
};

export const getEmployeeById = async (
  employeeId
) => {
  return Employee.findOne({
    _id: employeeId,
    deletedAt: null,
  })
    .select(EMPLOYEE_PROJECTION)
    .lean();
};

export const createEmployee = async (
  data,
  adminId
) => {
  const normalizedEmail =
    normalizeEmail(data.email);

  const existingEmployee =
    await Employee.findOne({
      email: normalizedEmail,
      deletedAt: null,
    });

  if (existingEmployee) {
    const error = new Error(
      "Employee email already exists"
    );

    error.statusCode = 409;

    throw error;
  }

  let assignedEmployeeId = data.employeeId ? String(data.employeeId).trim().toUpperCase() : null;
  if (!assignedEmployeeId) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "employeeId" },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    assignedEmployeeId = `ASH-EMP-${String(1000 + counter.seq).padStart(4, "0")}`;
  } else {
    const duplicateId = await Employee.findOne({
      employeeId: assignedEmployeeId,
      deletedAt: null,
    });
    if (duplicateId) {
      const error = new Error("Employee ID already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  let passwordHash = null;
  let accountStatus = data.accountStatus || "INVITED";
  let isEmailVerified = false;
  let rawActivationToken = null;
  let activationTokenHash = null;
  let activationTokenExpiresAt = null;

  if (data.password && typeof data.password === "string") {
    passwordHash = await bcrypt.hash(data.password, 12);
    accountStatus = "ACTIVE";
    isEmailVerified = true;
  } else {
    rawActivationToken = crypto.randomBytes(32).toString("hex");
    activationTokenHash = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
    activationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }

  const employee =
    await Employee.create({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: normalizedEmail,
      employeeId: assignedEmployeeId,
      googleEmail: data.googleEmail ? String(data.googleEmail).trim().toLowerCase() : normalizedEmail,
      passwordHash,
      role: data.role || "Employee",
      accountStatus,
      employmentStatus: data.employmentStatus || "ACTIVE",
      activationTokenHash,
      activationTokenExpiresAt,
      activationSentAt: null,
      activationResendCount: 0,
      isEmailVerified,
      phone: data.phone?.trim() || "",
      profileImage:
        data.profileImage?.trim() || null,
      designation: data.designation.trim(),
      department: data.department.trim(),
      employmentType: data.employmentType,
      joiningDate: new Date(data.joiningDate),
      workLocation:
        data.workLocation || "Office",
      bio: data.bio?.trim() || "",
      skills: Array.isArray(data.skills)
        ? data.skills.map((skill) =>
            String(skill).trim()
          ).filter(Boolean)
        : [],
      socialLinks: {
        linkedin:
          data.socialLinks?.linkedin?.trim() || "",
        github:
          data.socialLinks?.github?.trim() || "",
      },
      displayOrder:
        Number(data.displayOrder) || 0,
      isFeatured:
        data.isFeatured ?? false,
      isActive:
        data.isActive ?? (accountStatus === "ACTIVE"),
      createdBy: adminId,
      updatedBy: adminId,
    });

  let invitationStatus = "NOT_REQUIRED";
  let invitationError = null;

  if (rawActivationToken && accountStatus !== "ACTIVE") {
    try {
      await sendEmployeeInvitation({
        employee,
        rawToken: rawActivationToken,
      });
      employee.accountStatus = "PENDING_ACTIVATION";
      employee.activationSentAt = new Date();
      await employee.save();
      invitationStatus = "SENT";
    } catch (err) {
      invitationStatus = "FAILED";
      invitationError = err.message;
      if (!env.isTest) {
        console.warn(`[Employee Service] Invitation email delivery failed for ${employee.email}:`, err.message);
      }
    }
  }

  const createdRecord = await getEmployeeById(employee._id);
  return {
    ...createdRecord,
    invitationStatus,
    invitationError,
    ...(env.isTest && rawActivationToken ? { rawActivationToken } : {}),
  };
};

export const updateEmployee = async (
  employeeId,
  data,
  adminId
) => {
  const employee =
    await Employee.findOne({
      _id: employeeId,
      deletedAt: null,
    });

  if (!employee) {
    return null;
  }

  if (data.email !== undefined) {
    const normalizedEmail =
      normalizeEmail(data.email);

    const duplicate =
      await Employee.findOne({
        email: normalizedEmail,
        _id: { $ne: employeeId },
        deletedAt: null,
      });

    if (duplicate) {
      const error = new Error(
        "Employee email already exists"
      );

      error.statusCode = 409;

      throw error;
    }

    employee.email = normalizedEmail;
  }

  const stringFields = [
    "firstName",
    "lastName",
    "phone",
    "profileImage",
    "designation",
    "department",
    "bio",
  ];

  for (const field of stringFields) {
    if (data[field] !== undefined) {
      employee[field] =
        data[field] === null
          ? ""
          : String(data[field]).trim();
    }
  }

  if (data.employeeId !== undefined) {
    employee.employeeId = data.employeeId ? String(data.employeeId).trim().toUpperCase() : null;
  }

  if (data.googleEmail !== undefined) {
    employee.googleEmail = data.googleEmail ? String(data.googleEmail).trim().toLowerCase() : null;
  }

  if (data.password && typeof data.password === "string") {
    employee.passwordHash = await bcrypt.hash(data.password, 12);
    employee.passwordChangedAt = new Date();
  }

  if (data.employmentType !== undefined) {
    employee.employmentType =
      data.employmentType;
  }

  if (data.joiningDate !== undefined) {
    employee.joiningDate =
      new Date(data.joiningDate);
  }

  if (data.workLocation !== undefined) {
    employee.workLocation =
      data.workLocation;
  }

  if (Array.isArray(data.skills)) {
    employee.skills = data.skills
      .map((skill) => String(skill).trim())
      .filter(Boolean);
  }

  if (data.socialLinks !== undefined) {
    employee.socialLinks = {
      linkedin:
        data.socialLinks?.linkedin?.trim() || "",
      github:
        data.socialLinks?.github?.trim() || "",
    };
  }

  if (data.displayOrder !== undefined) {
    employee.displayOrder =
      Number(data.displayOrder);
  }

  if (data.isFeatured !== undefined) {
    employee.isFeatured =
      data.isFeatured;
  }

  if (data.isActive !== undefined) {
    employee.isActive =
      data.isActive;
  }

  if (data.accountStatus !== undefined) {
    employee.accountStatus = data.accountStatus;
    if (data.accountStatus === "DEACTIVATED" || data.accountStatus === "SUSPENDED") {
      employee.isActive = false;
      await RefreshToken.updateMany(
        { userId: employee._id },
        { $set: { isRevoked: true } }
      );
    } else if (data.accountStatus === "ACTIVE") {
      employee.isActive = true;
    }
  }

  if (data.employmentStatus !== undefined) {
    employee.employmentStatus = data.employmentStatus;
    if (data.employmentStatus === "TERMINATED" || data.employmentStatus === "INACTIVE") {
      employee.accountStatus = "DEACTIVATED";
      employee.isActive = false;
      await RefreshToken.updateMany(
        { userId: employee._id },
        { $set: { isRevoked: true } }
      );
    }
  }

  employee.updatedBy = adminId;

  await employee.save();

  return getEmployeeById(employee._id);
};

export const updateEmployeeStatus = async (
  employeeId,
  isActive,
  adminId
) => {
  const employee =
    await Employee.findOne({
      _id: employeeId,
      deletedAt: null,
    });

  if (!employee) {
    return null;
  }

  const boolActive = Boolean(isActive);
  employee.isActive = boolActive;
  if (!boolActive) {
    employee.accountStatus = "DEACTIVATED";
    await RefreshToken.updateMany(
      { userId: employee._id },
      { $set: { isRevoked: true } }
    );
  } else if (boolActive && employee.accountStatus === "DEACTIVATED") {
    employee.accountStatus = "ACTIVE";
    employee.employmentStatus = "ACTIVE";
  }
  employee.updatedBy = adminId;

  await employee.save();

  return getEmployeeById(employee._id);
};

export const deleteEmployee = async (
  employeeId,
  adminId
) => {
  const employee =
    await Employee.findOne({
      _id: employeeId,
      deletedAt: null,
    });

  if (!employee) {
    return null;
  }

  employee.deletedAt = new Date();
  employee.isActive = false;
  employee.accountStatus = "DEACTIVATED";
  employee.employmentStatus = "INACTIVE";
  employee.updatedBy = adminId;

  await RefreshToken.updateMany(
    { userId: employee._id },
    { $set: { isRevoked: true } }
  );

  await employee.save();

  return true;
};

export const resendEmployeeInvitation = async (employeeId, adminId) => {
  const employee = await Employee.findOne({
    _id: employeeId,
    deletedAt: null,
  }).select("+activationTokenHash");

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  if (employee.accountStatus === "ACTIVE") {
    const error = new Error("Employee account is already activated and active.");
    error.statusCode = 400;
    throw error;
  }

  if (employee.accountStatus === "DEACTIVATED") {
    const error = new Error(
      "Cannot send invitation to a deactivated employee. Please reactivate the employee first."
    );
    error.statusCode = 400;
    throw error;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  employee.activationTokenHash = tokenHash;
  employee.activationTokenExpiresAt = expiresAt;
  employee.activationSentAt = new Date();
  employee.activationResendCount = (employee.activationResendCount || 0) + 1;
  employee.accountStatus = "PENDING_ACTIVATION";
  employee.updatedBy = adminId;
  await employee.save();

  let invitationStatus = "SENT";
  let invitationError = null;

  try {
    await sendEmployeeInvitation({
      employee,
      rawToken,
    });
  } catch (err) {
    invitationStatus = "FAILED";
    invitationError = err.message;
    if (!env.isTest) {
      console.warn(`[Employee Service] Resend invitation failed for ${employee.email}:`, err.message);
    }
  }

  const updatedRecord = await getEmployeeById(employee._id);
  return {
    employee: updatedRecord,
    invitationStatus,
    invitationError,
    ...(env.isTest ? { rawToken } : {}),
  };
};

export const updateEmployeeAccountStatus = async (employeeId, newStatus, adminId) => {
  const allowed = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];
  if (!allowed.includes(newStatus)) {
    const error = new Error(`Invalid account status. Allowed: ${allowed.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    deletedAt: null,
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  if (adminId && String(employee._id) === String(adminId)) {
    const error = new Error("You cannot change the status of your own account");
    error.statusCode = 400;
    throw error;
  }

  employee.accountStatus = newStatus;
  employee.updatedBy = adminId;

  if (newStatus === "SUSPENDED" || newStatus === "DEACTIVATED") {
    employee.isActive = false;
    await RefreshToken.updateMany(
      { userId: employee._id },
      { $set: { isRevoked: true } }
    );
  } else if (newStatus === "ACTIVE") {
    employee.isActive = true;
    if (employee.employmentStatus === "INACTIVE" || employee.employmentStatus === "TERMINATED") {
      employee.employmentStatus = "ACTIVE";
    }
  }

  await employee.save();
  return getEmployeeById(employee._id);
};

export const updateEmployeeEmploymentStatus = async (employeeId, newStatus, adminId) => {
  const allowed = ["ACTIVE", "INACTIVE", "TERMINATED", "ON_LEAVE"];
  if (!allowed.includes(newStatus)) {
    const error = new Error(`Invalid employment status. Allowed: ${allowed.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    deletedAt: null,
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  employee.employmentStatus = newStatus;
  employee.updatedBy = adminId;

  if (newStatus === "TERMINATED" || newStatus === "INACTIVE") {
    employee.accountStatus = "DEACTIVATED";
    employee.isActive = false;
    await RefreshToken.updateMany(
      { userId: employee._id },
      { $set: { isRevoked: true } }
    );
  } else if (newStatus === "ACTIVE" && employee.accountStatus === "DEACTIVATED") {
    employee.accountStatus = "ACTIVE";
    employee.isActive = true;
  }

  await employee.save();
  return getEmployeeById(employee._id);
};

export const initiateAdminPasswordReset = async (employeeId, adminId) => {
  const employee = await Employee.findOne({
    _id: employeeId,
    deletedAt: null,
  }).select("+resetPasswordTokenHash");

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  if (employee.accountStatus !== "ACTIVE") {
    const error = new Error("Cannot send password reset to an unactivated or inactive employee.");
    error.statusCode = 400;
    throw error;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  employee.resetPasswordTokenHash = tokenHash;
  employee.resetPasswordExpiresAt = expiresAt;
  employee.resetPasswordSentAt = new Date();
  employee.updatedBy = adminId;
  await employee.save();

  let dispatchStatus = "SENT";
  let dispatchError = null;

  try {
    await sendEmployeePasswordReset({
      employee,
      rawToken,
    });
  } catch (err) {
    dispatchStatus = "FAILED";
    dispatchError = err.message;
  }

  return {
    success: true,
    message: "Password reset instructions dispatched.",
    dispatchStatus,
    dispatchError,
    ...(env.isTest ? { rawToken } : {}),
  };
};

export const restoreEmployee = async (
  employeeId,
  adminId
) => {
  const employee =
    await Employee.findOne({
      _id: employeeId,
      deletedAt: { $ne: null },
    });

  if (!employee) {
    return null;
  }

  const existingActive =
    await Employee.findOne({
      email: employee.email,
      deletedAt: null,
    });

  if (existingActive) {
    const error = new Error(
      "Cannot restore employee: another active employee is already using this email"
    );
    error.statusCode = 409;
    throw error;
  }

  employee.deletedAt = null;
  employee.isActive = true;
  employee.accountStatus = "ACTIVE";
  employee.employmentStatus = "ACTIVE";
  employee.updatedBy = adminId;

  await employee.save();

  return getEmployeeById(employee._id);
};

export const getEmployeeDepartments =
  async () => {
    return Employee.distinct("department", {
      deletedAt: null,
      isActive: true,
    });
  };

export const getEmployeeDesignations =
  async () => {
    return Employee.distinct("designation", {
      deletedAt: null,
      isActive: true,
    });
  };

export const exportEmployeesCsv = async ({
  search,
  department,
  designation,
  employmentType,
  workLocation,
  isActive,
  isFeatured,
} = {}) => {
  const filter = buildSearchFilter({
    search,
    department,
    designation,
    employmentType,
    workLocation,
    isActive,
    isFeatured,
  });

  const employees = await Employee.find(filter)
    .sort({ department: 1, lastName: 1, firstName: 1 })
    .lean();

  const columns = [
    { key: "employeeId", label: "Employee ID", transform: (e) => e.employeeId || e._id?.toString() || "" },
    {
      key: "name",
      label: "Full Name",
      transform: (e) => `${e.firstName || ""} ${e.lastName || ""}`.trim(),
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone", transform: (e) => e.phone || "" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "googleEmail", label: "Google Workspace Email", transform: (e) => e.googleEmail || e.email || "" },
    { key: "employmentType", label: "Employment Type", transform: (e) => e.employmentType || "Full-time" },
    { key: "employmentStatus", label: "Employment Status", transform: (e) => e.employmentStatus || (e.isActive ? "ACTIVE" : "INACTIVE") },
    { key: "accountStatus", label: "Account Security Status", transform: (e) => e.accountStatus || (e.isActive ? "ACTIVE" : "DEACTIVATED") },
    { key: "workLocation", label: "Work Location", transform: (e) => e.workLocation || "" },
    {
      key: "joiningDate",
      label: "Joining Date",
      transform: (e) => (e.joiningDate ? new Date(e.joiningDate).toISOString().slice(0, 10) : ""),
    },
    { key: "status", label: "Overall Active", transform: (e) => (e.isActive ? "Yes" : "No") },
    { key: "featured", label: "Featured on Website", transform: (e) => (e.isFeatured ? "Yes" : "No") },
  ];

  return toCsv(employees, columns);
};