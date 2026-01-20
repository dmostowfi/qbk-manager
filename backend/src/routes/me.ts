import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import meController from '../controllers/meController.js';
import teamController from '../controllers/teamController.js';

const router = Router();

// All /me routes require any authenticated user (admin, staff, or player with record)
router.use(requireRole(['admin', 'staff', 'player']));

router.get('/', meController.getProfile);
router.put('/', meController.updateProfile);
router.get('/enrollments', meController.getEnrollments);
router.get('/transactions', meController.getTransactions);
router.post('/sign', meController.signAgreement);

// Competition-related routes for current player
router.get('/teams', teamController.getMyTeams);

export default router;
