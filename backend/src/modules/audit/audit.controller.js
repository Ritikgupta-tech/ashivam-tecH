import {
  listAuditLogs,
  getAuditLogById,
  deleteAuditLog,
  clearAuditLogs,
  createAuditLog,
  exportAuditLogsCsv,
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
    await createAuditLog({
      req,
      action: "SECURITY_VIOLATION_ATTEMPT",
      entity: "AuditLog",
      entityId: req.params.id,
      description: "Attempted to delete an immutable audit log record. Operation rejected.",
      status: "failure",
    }).catch((err) => {
      console.warn("[Audit Violation Alert Error]", err.message);
    });

    return res.status(403).json({
      success: false,
      message:
        "Audit logs are strictly append-only and immutable. Deletion is prohibited for compliance and security.",
    });
  } catch (error) {
    next(error);
  }
};

export const removeAuditLogs = async (req, res, next) => {
  try {
    await createAuditLog({
      req,
      action: "SECURITY_VIOLATION_ATTEMPT",
      entity: "AuditLog",
      description: "Attempted bulk deletion of immutable audit logs. Operation rejected.",
      metadata: {
        before: req.body.before || null,
      },
      status: "failure",
    }).catch((err) => {
      console.warn("[Audit Violation Alert Error]", err.message);
    });

    return res.status(403).json({
      success: false,
      message:
        "Audit logs are strictly append-only and immutable. Deletion is prohibited for compliance and security.",
    });
  } catch (error) {
    next(error);
  }
};

export const exportAuditCsv = async (req, res, next) => {
  try {
    const csv = await exportAuditLogsCsv(req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="security_audit_export.csv"'
    );
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
