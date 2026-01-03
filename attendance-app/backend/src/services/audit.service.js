const AuditLog = require('../models/AuditLog');

const logAudit = async (action, userId, actorId, details) => {
  try {
    await AuditLog.create({
      action,
      userId,
      actorId,
      details
    });
  } catch (err) {
    console.error('Audit Log Failed:', err);
    // Don't crash the request if audit fails, but log it
  }
};

module.exports = { logAudit };
