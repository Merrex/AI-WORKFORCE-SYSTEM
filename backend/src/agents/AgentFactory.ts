import { BaseAgent, AgentConfig, AgentRole } from './BaseAgent';
import { CEOAgent } from './CEOAgent';
import { CFOAgent } from './CFOAgent';
import { HRAgent } from './HRAgent';
import { SalesAgent } from './SalesAgent';
import { SupportAgent } from './SupportAgent';
import { LLMProvider } from '../services/llm/LLMProvider';
import { MemoryService } from '../services/MemoryService';

export class AgentFactory {
  static createAgent(
    config: AgentConfig,
    llmProvider: LLMProvider,
    memoryService: MemoryService
  ): BaseAgent {
    switch (config.role) {
      case 'ceo':
        return new CEOAgent(config, llmProvider, memoryService);
      case 'cfo':
        return new CFOAgent(config, llmProvider, memoryService);
      case 'hr':
        return new HRAgent(config, llmProvider, memoryService);
      case 'sales':
        return new SalesAgent(config, llmProvider, memoryService);
      case 'support':
        return new SupportAgent(config, llmProvider, memoryService);
      default:
        throw new Error(`Unknown agent role: ${config.role}`);
    }
  }
}
