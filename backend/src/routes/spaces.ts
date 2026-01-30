import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/spaces
 * List all spaces, optionally filtered by type (e.g., ?type=COURT)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where = req.query.type ? { type: req.query.type as any } : {};
    const spaces = await prisma.space.findMany({
      where,
      include: { facility: { select: { id: true, name: true } } },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, data: spaces });
  } catch (error) {
    next(error);
  }
});

export default router;
