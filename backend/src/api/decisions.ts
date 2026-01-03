import { Router } from 'express';
import { db } from '../database/schema';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const decisionsRouter = Router();

decisionsRouter.use(authenticate);

// Get pending decisions
decisionsRouter.get('/pending', async (req: AuthRequest, res, next) => {
  try {
    const organizationId = req.user?.organizationId;

    const decisions = await db.selectFrom('decisions')
      .selectAll()
      .where('organization_id', '=', organizationId!)
      .where('status', '=', 'pending')
      .orderBy('created_at', 'desc')
      .execute();

    res.json({ decisions });
  } catch (error) {
    next(error);
  }
});

// Approve decision
decisionsRouter.post('/:id/approve', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    await db.updateTable('decisions')
      .set({
        status: 'approved',
        approved_by: userId,
        updated_at: new Date()
      })
      .where('id', '=', id)
      .where('organization_id', '=', organizationId!)
      .execute();

    res.json({ message: 'Decision approved' });
  } catch (error) {
    next(error);
  }
});

// Reject decision
decisionsRouter.post('/:id/reject', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const organizationId = req.user?.organizationId;

    await db.updateTable('decisions')
      .set({
        status: 'rejected',
        approved_by: userId,
        updated_at: new Date()
      })
      .where('id', '=', id)
      .where('organization_id', '=', organizationId!)
      .execute();

    res.json({ message: 'Decision rejected' });
  } catch (error) {
    next(error);
  }
});
