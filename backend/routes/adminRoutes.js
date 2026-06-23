import express from 'express';
import { authMiddleWare, allowRoles } from '../middleware/authMiddleware.js';
import {
  getAuditLogs,
  getQueueHealth,
  getSystemHealth,
  getTechnicianWorkload,
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication + Admin role
router.use(authMiddleWare);
router.use(allowRoles(['Admin']));

router.get('/audit-logs', getAuditLogs);
router.get('/queue-health', getQueueHealth);
router.get('/system-health', getSystemHealth);
router.get('/technician-workload', getTechnicianWorkload);

export default router;
