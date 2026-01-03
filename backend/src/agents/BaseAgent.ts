import { v4 as uuidv4 } from 'uuid';
import { LLMProvider, LLMMessage, createLLMProvider } from '../services/llm/LLMProvider';
import { MemoryService } from '../services/MemoryService';
import { logger } from '../utils/logger';

export type AgentRole = 'ceo' | 'cfo' | 'hr' | 'sales' | 'support';
export type AuthorityLevel = 'low' | 'medium' | 'high';

export interface AgentConfig {
  id: string;
  role: AgentRole;
  name: string;
  organizationId: string;
  assignedUserId?: string;
  permissions: Record<string, boolean>;
  authorityLevel: AuthorityLevel;
}

export interface AgentContext {
  userId?: string;
  organizationData: Record<string, any>;
  recentDecisions: any[];
  manifesto: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  requiresApproval: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  recommendation?: any;
  reasoning?: string;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected llm: LLMProvider;
  protected memory: MemoryService;

  constructor(config: AgentConfig, llmProvider: LLMProvider, memoryService: MemoryService) {
    this.config = config;
    this.llm = llmProvider;
    this.memory = memoryService;
  }

  abstract getSystemPrompt(): string;
  abstract processRequest(query: string, context: AgentContext): Promise<AgentResponse>;

  protected async chat(messages: LLMMessage[]): Promise<string> {
    try {
      const response = await this.llm.chat(messages);
      logger.info(`Agent ${this.config.role} chat completion`, {
        agentId: this.config.id,
        tokensUsed: response.usage?.totalTokens
      });
      return response.content;
    } catch (error) {
      logger.error(`Agent ${this.config.role} chat error`, { error });
      throw error;
    }
  }

  protected async retrieveMemory(query: string, memoryType: string): Promise<any[]> {
    return await this.memory.search(this.config.id, query, memoryType);
  }

  protected async storeMemory(content: any, memoryType: string): Promise<void> {
    await this.memory.store(this.config.id, this.config.organizationId, content, memoryType);
  }

  protected determineSensitivity(content: string): 'low' | 'medium' | 'high' {
    // Simple rule-based sensitivity detection
    // In production, this could use more sophisticated analysis
    const highSensitivityKeywords = ['fire', 'terminate', 'lawsuit', 'critical', 'emergency'];
    const mediumSensitivityKeywords = ['hire', 'budget', 'contract', 'policy', 'approval'];

    const lowerContent = content.toLowerCase();
    
    if (highSensitivityKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    }
    if (mediumSensitivityKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  protected requiresApproval(sensitivity: 'low' | 'medium' | 'high'): boolean {
    // Based on authority level and sensitivity
    if (this.config.authorityLevel === 'low') {
      return sensitivity !== 'low';
    }
    if (this.config.authorityLevel === 'medium') {
      return sensitivity === 'high';
    }
    // High authority still requires approval for high sensitivity
    return sensitivity === 'high';
  }

  public getConfig(): AgentConfig {
    return this.config;
  }
}
