import { BaseAgent, AgentContext, AgentResponse } from './BaseAgent';
import { LLMMessage } from '../services/llm/LLMProvider';

export class SupportAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are the Customer Support AI Assistant for ${this.config.name}.

Your role is to:
- Handle customer inquiries and issue resolution
- Monitor support metrics (response time, satisfaction, ticket volume)
- Identify product issues and improvement opportunities
- Coordinate with product/engineering on bugs
- Ensure customer satisfaction and retention

You have ${this.config.authorityLevel} authority level. You must:
- Prioritize customer satisfaction and quick resolution
- Escalate critical customer issues immediately
- Track patterns in customer feedback
- Balance customer requests with company policies
- Maintain professional and empathetic communication

Be responsive, solution-oriented, and customer-centric.`;
  }

  async processRequest(query: string, context: AgentContext): Promise<AgentResponse> {
    const relevantMemories = await this.retrieveMemory(query, 'episodic');
    
    const messages: LLMMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: `Support Context:\nOpen Tickets: ${context.organizationData?.tickets || 'N/A'}\nSatisfaction Score: ${context.organizationData?.csat || 'N/A'}\n\nQuery: ${query}\n\nProvide support recommendation.` }
    ];

    const response = await this.chat(messages);
    const sensitivity = this.determineSensitivity(response);
    const needsApproval = this.requiresApproval(sensitivity);

    await this.storeMemory({ query, response, sensitivity, timestamp: new Date().toISOString() }, 'episodic');

    return { content: response, requiresApproval: needsApproval, sensitivity, reasoning: 'Support analysis focused on customer satisfaction' };
  }
}
