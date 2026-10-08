import Employee from "./employee.model.js";
import { escapeRegex } from "../../utils/query.js";

const EMPLOYEE_PROJECTION =
  "_id firstName lastName email phone profileImage designation department employmentType joiningDate workLocation bio skills socialLinks displayOrder isFeatured isActive createdAt updatedAt";

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
        .select(EMPLOYEE_PROJECTION)
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

  const employee =
    await Employee.create({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: normalizedEmail,
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
        data.isActive ?? true,
      createdBy: adminId,
      updatedBy: adminId,
    });

  return getEmployeeById(employee._id);
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

  employee.isActive = Boolean(isActive);
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
  employee.updatedBy = adminId;

  await employee.save();

  return true;
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