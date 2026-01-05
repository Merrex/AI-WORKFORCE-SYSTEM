import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/schema';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AgentFactory } from '../agents/AgentFactory';
import { createLLMProvider } from '../services/llm/LLMProvider';
import { memoryService } from '../services/MemoryService';
import { logger } from '../utils/logger';

export const agentsRouter = Router();

// All routes require authentication
agentsRouter.use(authenticate);

// Get all agents for user's organization
agentsRouter.get('/', async (req: AuthRequest, res, next) => {
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

// Get specific agent
agentsRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const agent = await db.selectFrom('agents')
      .selectAll()
      .where('id', '=', id)
      .where('organization_id', '=', organizationId!)
      .executeTakeFirst();

    if (!agent) {
      throw new AppError('Agent not found', 404);
    }

    res.json({ agent });
  } catch (error) {
    next(error);
  }
});

// Chat with agent
agentsRouter.post('/:id/chat', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const organizationId = req.user?.organizationId;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    // Get agent config
    const agentData = await db.selectFrom('agents')
      .selectAll()
      .where('id', '=', id)
      .where('organization_id', '=', organizationId!)
      .executeTakeFirst();

    if (!agentData) {
      throw new AppError('Agent not found', 404);
    }

    // Get organization context
    const organization = await db.selectFrom('organizations')
      .selectAll()
      .where('id', '=', organizationId!)
      .executeTakeFirst();

    // Get recent decisions
    const recentDecisions = await db.selectFrom('decisions')
      .selectAll()
      .where('organization_id', '=', organizationId!)
      .orderBy('created_at', 'desc')
      .limit(10)
      .execute();

    // Initialize LLM provider (user's API key should be stored securely)
    // For now, using environment variable
    const provider = (process.env.DEFAULT_LLM_PROVIDER as any) || 'openai';
    const model = process.env.DEFAULT_LLM_MODEL || 'gpt-4';
    
    // Get the appropriate API key based on provider
    const apiKeyMap: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      cohere: process.env.COHERE_API_KEY,
      groq: process.env.GROQ_API_KEY
    };
    
    const apiKey = apiKeyMap[provider];
    if (!apiKey) {
      throw new AppError(`API key not configured for provider: ${provider}`, 500);
    }
    
    const llmProvider = createLLMProvider({
      provider,
      model,
      apiKey
    });

    // Create agent instance using factory
    const agent = AgentFactory.createAgent(
      {
        id: agentData.id,
        role: agentData.role,
        name: agentData.name,
        organizationId: agentData.organization_id,
        permissions: agentData.permissions as Record<string, boolean>,
        authorityLevel: agentData.authority_level
      },
      llmProvider,
      memoryService
    );

    // Process request
    const response = await agent.processRequest(message, {
      userId: req.user?.id,
      organizationData: {},
      recentDecisions: recentDecisions.map(d => ({
        title: d.title,
        status: d.status,
        sensitivity: d.sensitivity
      })),
      manifesto: organization?.manifesto as Record<string, any> || {}
    });

    // If requires approval, create decision record
    if (response.requiresApproval) {
      const decisionId = uuidv4();
      await db.insertInto('decisions')
        .values({
          id: decisionId,
          agent_id: id,
          organization_id: organizationId!,
          title: message.substring(0, 100),
          description: message,
          sensitivity: response.sensitivity,
          status: 'pending',
          recommendation: JSON.stringify(response),
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();

      response.recommendation = { decisionId };
    }

    logger.info('Agent chat completed', { agentId: id, requiresApproval: response.requiresApproval });

    res.json(response);
  } catch (error) {
    next(error);
  }
});
