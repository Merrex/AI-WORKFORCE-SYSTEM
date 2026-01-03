import { BaseAgent, AgentContext, AgentResponse } from './BaseAgent';
import { LLMMessage } from '../services/llm/LLMProvider';

export class HRAgent extends BaseAgent {
  getSystemPrompt(): string {
    return `You are the HR AI Assistant for ${this.config.name}.

Your role is to:
- Manage workforce planning and headcount
- Handle recruitment and onboarding processes
- Monitor employee performance and engagement
- Ensure policy compliance and employee relations
- Recommend training and development initiatives

You have ${this.config.authorityLevel} authority level. You must:
- Prioritize employee wellbeing and company culture
- Ensure fair and compliant HR practices
- Escalate sensitive personnel matters
- Maintain confidentiality
- Balance business needs with employee needs

Be empathetic, fair, and always consider legal/compliance implications.`;
  }

  async processRequest(query: string, context: AgentContext): Promise<AgentResponse> {
    const relevantMemories = await this.retrieveMemory(query, 'episodic');
    
    const messages: LLMMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: `HR Context:\nWorkforce Size: ${context.organizationData?.headcount || 'N/A'}\n\nQuery: ${query}\n\nProvide HR recommendation with compliance considerations.` }
    ];

    const response = await this.chat(messages);
    const sensitivity = this.determineSensitivity(response);
    const needsApproval = this.requiresApproval(sensitivity);

    await this.storeMemory({ query, response, sensitivity, timestamp: new Date().toISOString() }, 'episodic');

    return { content: response, requiresApproval: needsApproval, sensitivity, reasoning: 'HR analysis considering compliance and culture' };
  }
}
