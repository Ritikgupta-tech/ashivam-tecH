import {
  listAuditLogs,
  getAuditLogById,
  deleteAuditLog,
  clearAuditLogs,
  createAuditLog,
} from "./audit.service.js";

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await listAuditLogs(req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLog = async (req, res, next) => {
  try {
    const auditLog = await getAuditLogById(req.params.id);

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        auditLog,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeAuditLog = async (req, res, next) => {
  try {
    const auditLog = await deleteAuditLog(req.params.id);

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    await createAuditLog({
      req,
      action: "DELETE",
      entity: "AuditLog",
      entityId: req.params.id,
      description: "Audit log deleted",
    });

    return res.status(200).json({
      success: true,
      message: "Audit log deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const removeAuditLogs = async (req, res, next) => {
  try {
    const result = await clearAuditLogs(req.body);

    await createAuditLog({
      req,
      action: "DELETE_MANY",
      entity: "AuditLog",
      description: "Audit logs cleared",
      metadata: {
        before: req.body.before || null,
        deletedCount: result.deletedCount,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Audit logs cleared successfully",
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};