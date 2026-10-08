import {
  createJob,
  listPublicJobs,
  getPublicJob,
  listAdminJobs,
  updateJob,
  deleteJob,
  createApplication,
  listApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "./career.service.js";

import {
  validateJob,
  validateApplication,
  validateApplicationUpdate,
} from "./career.validator.js";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

const allowedResumeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const getPublicJobs = async (req, res, next) => {
  try {
    const jobs = await listPublicJobs();

    return res.status(200).json({
      success: true,
      data: {
        jobs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicJobById = async (
  req,
  res,
  next
) => {
  try {
    const job = await getPublicJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createJobHandler = async (
  req,
  res,
  next
) => {
  try {
    const validation = validateJob(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const job = await createJob(
      validation.data,
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminJobs = async (
  req,
  res,
  next
) => {
  try {
    const result = await listAdminJobs({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      isActive: req.query.isActive,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateJobHandler = async (
  req,
  res,
  next
) => {
  try {
    const validation = validateJob(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const job = await updateJob(
      req.params.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJobHandler = async (
  req,
  res,
  next
) => {
  try {
    await deleteJob(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const applyForJob = async (
  req,
  res,
  next
) => {
  try {
    const validation = validateApplication(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume is required",
      });
    }

    if (req.file.size > MAX_RESUME_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Resume size cannot exceed 5MB",
      });
    }

    if (!allowedResumeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Only PDF, DOC and DOCX resumes are allowed",
      });
    }

    const application = await createApplication(
      req.params.jobId,
      validation.data,
      {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: {
        application: {
          id: application._id,
          status: application.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getApplications = async (
  req,
  res,
  next
) => {
  try {
    const result = await listApplications({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      job: req.query.job,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplication = async (
  req,
  res,
  next
) => {
  try {
    const application =
      await getApplicationById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplicationHandler = async (
  req,
  res,
  next
) => {
  try {
    const validation =
      validateApplicationUpdate(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const application =
      await updateApplication(
        req.params.id,
        validation.data,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteApplicationHandler = async (
  req,
  res,
  next
) => {
  try {
    await deleteApplication(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};