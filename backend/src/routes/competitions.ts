import { Router } from 'express';
import competitionController from '../controllers/competitionController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * Competition Routes
 *
 * PATTERN: RESTful endpoints with role-based access control
 *
 * Route structure:
 *   /api/competitions           - Collection routes (list, create)
 *   /api/competitions/:id       - Single resource routes (get, update, delete)
 *   /api/competitions/:id/...   - Sub-resource routes (status, standings)
 *
 * Authorization:
 *   - GET routes: Public (anyone can view competitions)
 *   - POST/PUT/DELETE: Admin/Staff only (manage competitions)
 */

// ============== PUBLIC ROUTES ==============
// Anyone (including unauthenticated users) can view competitions

// GET /api/competitions - List all competitions (with optional filters)
router.get('/', competitionController.getAll);

// GET /api/competitions/:id - Get competition details
router.get('/:id', competitionController.getById);

// GET /api/competitions/:id/standings - Get competition standings
router.get('/:id/standings', competitionController.getStandings);

// ============== ADMIN/STAFF ROUTES ==============
// Only authenticated admin or staff can manage competitions

// POST /api/competitions - Create a new competition
router.post('/', requireRole(['admin', 'staff']), competitionController.create);

// PUT /api/competitions/:id - Update competition details
router.put('/:id', requireRole(['admin', 'staff']), competitionController.update);

// PUT /api/competitions/:id/status - Update competition status (state machine)
router.put('/:id/status', requireRole(['admin', 'staff']), competitionController.updateStatus);

// DELETE /api/competitions/:id - Delete a competition (DRAFT only)
router.delete('/:id', requireRole(['admin', 'staff']), competitionController.delete);

// ============== FUTURE: TEAM & FREE AGENT ROUTES ==============
// These will be added in Phase 2 and Phase 5:
//
// POST   /:id/teams                    - Register a team (player becomes captain)
// GET    /:id/teams/:teamId            - Get team details
// PUT    /:id/teams/:teamId/roster     - Captain updates roster
// POST   /:id/free-agents              - Register as free agent
// GET    /:id/free-agents              - List free agents (admin)
// PUT    /:id/free-agents/:faId        - Assign free agent to team (admin)

export default router;
