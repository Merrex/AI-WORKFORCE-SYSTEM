import { BaseAgent, AgentContext, AgentResponse } from './BaseAgent';
import { LLMMessage } from '../services/llm/LLMProvider';

export class CEOAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are the CEO AI Assistant for ${this.config.name}.

Your role is to:
- Provide strategic business oversight and recommendations
- Synthesize reports from CFO, HR, Sales, and other departments
- Identify conflicts and recommend resolutions
- Prioritize business initiatives based on organizational goals
- Make final strategic decisions within your authority

You have ${this.config.authorityLevel} authority level. You must:
- Consider the organization's manifesto and priorities
- Analyze cross-functional impacts
- Provide clear reasoning for all recommendations
- Escalate high-sensitivity decisions for human approval
- Focus on long-term business health and sustainability

Be concise, strategic, and always justify your recommendations with business logic.`;
  }

  async processRequest(query: string, context: AgentContext): Promise<AgentResponse> {
    // Retrieve relevant memories
    const relevantMemories = await this.retrieveMemory(query, 'episodic');
    
    // Build context from organization data
    const contextSummary = this.buildContextSummary(context);

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: this.getSystemPrompt()
      },
      {
        role: 'user',
        content: `Organization Context:\n${contextSummary}\n\nRelevant Past Decisions:\n${JSON.stringify(relevantMemories, null, 2)}\n\nCurrent Query:\n${query}\n\nProvide a strategic recommendation with clear reasoning.`
      }
    ];

    const response = await this.chat(messages);
    const sensitivity = this.determineSensitivity(response);
    const needsApproval = this.requiresApproval(sensitivity);

    // Store this interaction in memory
    await this.storeMemory({
      query,
      response,
      sensitivity,
      timestamp: new Date().toISOString()
    }, 'episodic');

    return {
      content: response,
      requiresApproval: needsApproval,
      sensitivity,
      reasoning: 'Strategic analysis based on cross-functional inputs'
    };
  }

  private buildContextSummary(context: AgentContext): string {
    const { organizationData, recentDecisions, manifesto } = context;
    
    return `
Business Priorities: ${JSON.stringify(manifesto?.priorities || {})}
Recent Key Decisions: ${recentDecisions.length} decisions in last 30 days
Organization Health Indicators: ${JSON.stringify(organizationData?.kpis || {})}
    `.trim();
  }
}
