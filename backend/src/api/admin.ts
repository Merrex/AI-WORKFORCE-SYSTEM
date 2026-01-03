import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/schema';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const adminRouter = Router();

// All routes require admin role
adminRouter.use(authenticate);
adminRouter.use(authorize('admin'));

// Create new agent
adminRouter.post('/agents', async (req: AuthRequest, res, next) => {
  try {
    const { role, name, authorityLevel, assignedUserId } = req.body;
    const organizationId = req.user?.organizationId;

    if (!role || !name) {
      throw new AppError('Role and name are required', 400);
    }

    const agentId = uuidv4();
    await db.insertInto('agents')
      .values({
        id: agentId,
        role,
        name,
        organization_id: organizationId!,
        assigned_user_id: assignedUserId || null,
        status: 'active',
        permissions: JSON.stringify({}),
        authority_level: authorityLevel || 'medium',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    res.status(201).json({
      message: 'Agent created successfully',
      agentId
    });
  } catch (error) {
    next(error);
  }
});

// Update agent
adminRouter.put('/agents/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status, authorityLevel, assignedUserId, permissions } = req.body;
    const organizationId = req.user?.organizationId;

    const updateData: any = { updated_at: new Date() };
    if (status) updateData.status = status;
    if (authorityLevel) updateData.authority_level = authorityLevel;
    if (assignedUserId !== undefined) updateData.assigned_user_id = assignedUserId;
    if (permissions) updateData.permissions = JSON.stringify(permissions);

    await db.updateTable('agents')
      .set(updateData)
      .where('id', '=', id)
      .where('organization_id', '=', organizationId!)
      .execute();

    res.json({ message: 'Agent updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete agent
adminRouter.delete('/agents/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    await db.deleteFrom('agents')
      .where('id', '=', id)
      .where('organization_id', '=', organizationId!)
      .execute();

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get all agents (admin view with full details)
adminRouter.get('/agents', async (req: AuthRequest, res, next) => {
  try {
    const organizationId = req.user?.organizationId;

    const agents = await db.selectFrom('agents')
      .selectAll()
      .where('organization_id', '=', organizationId!)
      .execute();

    res.json({ agents });
  } catch (error) {
    next(error);
  }
});
