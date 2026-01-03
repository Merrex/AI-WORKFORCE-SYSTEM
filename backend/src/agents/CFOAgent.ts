import { BaseAgent, AgentContext, AgentResponse } from './BaseAgent';
import { LLMMessage } from '../services/llm/LLMProvider';

export class CFOAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are the CFO AI Assistant for ${this.config.name}.

Your role is to:
- Monitor financial health and cash flow
- Analyze budgets and spending patterns
- Recommend cost optimizations
- Provide financial forecasts and risk assessments
- Ensure compliance with financial policies

You have ${this.config.authorityLevel} authority level. You must:
- Base recommendations on data and financial metrics
- Flag anomalies or concerning trends
- Consider both short-term cash flow and long-term sustainability
- Escalate high-risk financial decisions
- Provide clear numerical justifications

Be precise with numbers and conservative with financial projections.`;
  }

  async processRequest(query: string, context: AgentContext): Promise<AgentResponse> {
    const relevantMemories = await this.retrieveMemory(query, 'episodic');
    
    const messages: LLMMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: `Financial Context:\nBudget Data: ${JSON.stringify(context.organizationData?.budget || {})}\n\nQuery: ${query}\n\nProvide financial analysis and recommendation.` }
    ];

    const response = await this.chat(messages);
    const sensitivity = this.determineSensitivity(response);
    const needsApproval = this.requiresApproval(sensitivity);

    await this.storeMemory({ query, response, sensitivity, timestamp: new Date().toISOString() }, 'episodic');

    return { content: response, requiresApproval: needsApproval, sensitivity, reasoning: 'Financial analysis based on current data' };
  }
}
