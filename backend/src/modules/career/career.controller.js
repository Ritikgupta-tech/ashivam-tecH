import path from "path";

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
  getApplicationResumeFile,
} from "./career.service.js";

import {
  validateJob,
  validateApplication,
  validateApplicationUpdate,
} from "./career.validator.js";

import {
  validateFileSignature,
  sanitizeDownloadFilename,
} from "../../services/storage.service.js";

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
        errors: {},
        requestId: req.id,
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
        requestId: req.id,
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
        requestId: req.id,
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
        requestId: req.id,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume is required",
        errors: { resume: "Resume file is required" },
        requestId: req.id,
      });
    }

    if (req.file.size > MAX_RESUME_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Resume size cannot exceed 5MB",
        errors: { resume: "Resume size exceeds maximum allowed 5MB limit" },
        requestId: req.id,
      });
    }

    if (!allowedResumeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message:
          "Only PDF, DOC and DOCX resumes are allowed",
        errors: { resume: "Unsupported file type" },
        requestId: req.id,
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!validateFileSignature(req.file.buffer, req.file.mimetype, ext)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid file signature. File content does not match allowed PDF, DOC, or DOCX formats",
        errors: {
          resume: "Invalid file content signature",
        },
        requestId: req.id,
      });
    }

    const application = await createApplication(
      req.params.jobId,
      validation.data,
      req.file
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
        errors: {},
        requestId: req.id,
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
        requestId: req.id,
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

export const downloadApplicationResumeHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const fileResult = await getApplicationResumeFile(id);

    const safeFilename = sanitizeDownloadFilename(fileResult.originalName);

    res.setHeader(
      "Content-Type",
      fileResult.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (fileResult.contentLength) {
      res.setHeader("Content-Length", fileResult.contentLength);
    }

    fileResult.stream.on("error", (streamError) => {
      if (!res.headersSent) {
        next(streamError);
      } else {
        res.end();
      }
    });

    fileResult.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const downloadApplicationResume = downloadApplicationResumeHandler;