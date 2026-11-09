import express from 'express';
import { getIntegrationStatus, triggerReconciliation } from './integration.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/authorization.middleware.js';

const router = express.Router();

// Protected admin monitoring and reconciliation endpoints
router.get('/status', authenticate, requireRole('Superadmin', 'Admin'), getIntegrationStatus);
router.post('/reconcile', authenticate, requireRole('Superadmin', 'Admin'), triggerReconciliation);

export default router;
