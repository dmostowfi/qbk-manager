import { Router } from 'express';
import competitionController from '../controllers/competitionController.js';
import teamController from '../controllers/teamController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * Competition Routes
 *
 * PATTERN: RESTful endpoints with role-based access control
 *
 * Route structure:
 *   /api/competitions                      - Collection routes (list, create)
 *   /api/competitions/:id                  - Single resource routes (get, update, delete)
 *   /api/competitions/:id/teams            - Team routes (nested under competition)
 *   /api/competitions/:id/teams/:teamId    - Single team routes
 *
 * Authorization:
 *   - GET routes: Public (anyone can view competitions)
 *   - POST/PUT/DELETE competitions: Admin/Staff only
 *   - Team registration: Any authenticated player
 *   - Roster modification: Captain or Admin/Staff
 */

// ============== COMPETITION ROUTES (PUBLIC) ==============

// GET /api/competitions - List all competitions (with optional filters)
router.get('/', competitionController.getAll);

// GET /api/competitions/:id - Get competition details
router.get('/:id', competitionController.getById);

// GET /api/competitions/:id/standings - Get competition standings
router.get('/:id/standings', competitionController.getStandings);

// ============== COMPETITION ROUTES (ADMIN/STAFF) ==============

// POST /api/competitions - Create a new competition
router.post('/', requireRole(['admin', 'staff']), competitionController.create);

// PUT /api/competitions/:id - Update competition details
router.put('/:id', requireRole(['admin', 'staff']), competitionController.update);

// PUT /api/competitions/:id/status - Update competition status (state machine)
router.put('/:id/status', requireRole(['admin', 'staff']), competitionController.updateStatus);

// DELETE /api/competitions/:id - Delete a competition (DRAFT only)
router.delete('/:id', requireRole(['admin', 'staff']), competitionController.delete);

// ============== SCHEDULE/MATCH ROUTES ==============

// POST /api/competitions/:id/schedule - Generate round-robin schedule
// Creates Events and Matches for the entire season
router.post('/:id/schedule', requireRole(['admin', 'staff']), competitionController.generateSchedule);

// GET /api/competitions/:id/matches - Get all matches (the schedule)
router.get('/:id/matches', competitionController.getMatches);

// PUT /api/competitions/:id/matches/:matchId/score - Record match score
router.put('/:id/matches/:matchId/score', requireRole(['admin', 'staff']), competitionController.recordScore);

// ============== TEAM ROUTES ==============

// GET /api/competitions/:competitionId/teams - List teams in competition
router.get('/:competitionId/teams', teamController.getByCompetition);

// GET /api/competitions/:competitionId/teams/:teamId - Get team details
router.get('/:competitionId/teams/:teamId', teamController.getById);

// GET /api/competitions/:competitionId/teams/:teamId/validate - Validate roster
router.get('/:competitionId/teams/:teamId/validate', teamController.validateRoster);

// POST /api/competitions/:competitionId/teams - Register a new team (player becomes captain)
router.post('/:competitionId/teams', requireRole(['admin', 'staff', 'player']), teamController.register);

// POST /api/competitions/:competitionId/teams/:teamId/roster - Add player to roster
// (Captain can add to their team, Admin/Staff can add to any team)
router.post('/:competitionId/teams/:teamId/roster', requireRole(['admin', 'staff', 'player']), teamController.addToRoster);

// DELETE /api/competitions/:competitionId/teams/:teamId/roster/:playerId - Remove player from roster
// (Captain can remove from their team, Admin/Staff can remove from any team)
router.delete('/:competitionId/teams/:teamId/roster/:playerId', requireRole(['admin', 'staff', 'player']), teamController.removeFromRoster);

// ============== FUTURE: FREE AGENT ROUTES (Phase 5) ==============
// POST   /:competitionId/free-agents              - Register as free agent
// GET    /:competitionId/free-agents              - List free agents (admin)
// PUT    /:competitionId/free-agents/:faId        - Assign free agent to team (admin)

export default router;
