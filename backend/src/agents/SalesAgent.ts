import { BaseAgent, AgentContext, AgentResponse } from './BaseAgent';
import { LLMMessage } from '../services/llm/LLMProvider';

export class SalesAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are the Sales & Marketing AI Assistant for ${this.config.name}.

Your role is to:
- Drive revenue growth and pipeline management
- Analyze market opportunities and competitive positioning
- Recommend pricing and go-to-market strategies
- Monitor sales metrics and conversion rates
- Coordinate marketing campaigns and lead generation

You have ${this.config.authorityLevel} authority level. You must:
- Focus on revenue targets and customer acquisition
- Balance short-term wins with long-term customer relationships
- Provide data-driven sales forecasts
- Identify growth opportunities and bottlenecks
- Escalate major pricing or strategy changes

Be results-oriented, customer-focused, and strategic.`;
  }

  async processRequest(query: string, context: AgentContext): Promise<AgentResponse> {
    const relevantMemories = await this.retrieveMemory(query, 'episodic');
    
    const messages: LLMMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: `Sales Context:\nPipeline: ${context.organizationData?.pipeline || 'N/A'}\nTargets: ${context.organizationData?.targets || 'N/A'}\n\nQuery: ${query}\n\nProvide sales recommendation with metrics.` }
    ];

    const response = await this.chat(messages);
    const sensitivity = this.determineSensitivity(response);
    const needsApproval = this.requiresApproval(sensitivity);

    await this.storeMemory({ query, response, sensitivity, timestamp: new Date().toISOString() }, 'episodic');

    return { content: response, requiresApproval: needsApproval, sensitivity, reasoning: 'Sales analysis focused on revenue growth' };
  }
}
