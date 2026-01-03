import { BaseAgent, AgentConfig, AgentContext, AgentResponse } from '../../../src/agents/BaseAgent';
import { MockLLMProvider } from '../../mocks/MockLLMProvider';
import { MemoryService } from '../../../src/services/MemoryService';

// Concrete implementation for testing
class TestAgent extends BaseAgent {
  getSystemPrompt(): string {
    return 'You are a test agent.';
  }

  async processRequest(query: string, context: AgentContext): Promise<AgentResponse> {
    const response = await this.chat([
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: query }
    ]);

    const sensitivity = this.determineSensitivity(response);
    const requiresApproval = this.requiresApproval(sensitivity);

    return {
      content: response,
      requiresApproval,
      sensitivity
    };
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let mockLLM: MockLLMProvider;
  let mockMemory: jest.Mocked<MemoryService>;
  let config: AgentConfig;

  beforeEach(() => {
    config = {
      id: 'test-agent-123',
      role: 'ceo',
      name: 'Test CEO Agent',
      organizationId: 'org-123',
      permissions: {},
      authorityLevel: 'medium'
    };

    mockLLM = new MockLLMProvider({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key'
    });

    mockMemory = {
      search: jest.fn().mockResolvedValue([]),
      store: jest.fn().mockResolvedValue('memory-id'),
      clearShortTermMemory: jest.fn()
    } as any;

    agent = new TestAgent(config, mockLLM, mockMemory);
  });

  afterEach(() => {
    mockLLM.reset();
  });

  describe('determineSensitivity', () => {
    it('should detect high sensitivity keywords', () => {
      const sensitivity = agent['determineSensitivity']('We need to fire the employee immediately');
      expect(sensitivity).toBe('high');
    });

    it('should detect medium sensitivity keywords', () => {
      const sensitivity = agent['determineSensitivity']('We should hire a new developer');
      expect(sensitivity).toBe('medium');
    });

    it('should return low sensitivity for normal content', () => {
      const sensitivity = agent['determineSensitivity']('What is the weather today?');
      expect(sensitivity).toBe('low');
    });
  });

  describe('requiresApproval', () => {
    it('should require approval for medium sensitivity with low authority', () => {
      config.authorityLevel = 'low';
      agent = new TestAgent(config, mockLLM, mockMemory);
      expect(agent['requiresApproval']('medium')).toBe(true);
    });

    it('should not require approval for low sensitivity with low authority', () => {
      config.authorityLevel = 'low';
      agent = new TestAgent(config, mockLLM, mockMemory);
      expect(agent['requiresApproval']('low')).toBe(false);
    });

    it('should require approval for high sensitivity regardless of authority', () => {
      config.authorityLevel = 'high';
      agent = new TestAgent(config, mockLLM, mockMemory);
      expect(agent['requiresApproval']('high')).toBe(true);
    });
  });

  describe('processRequest', () => {
    it('should process request and return response', async () => {
      mockLLM.setDefaultResponse('This is a test response');

      const context: AgentContext = {
        organizationData: {},
        recentDecisions: [],
        manifesto: {}
      };

      const response = await agent.processRequest('Test query', context);

      expect(response.content).toBe('This is a test response');
      expect(response.sensitivity).toBeDefined();
      expect(response.requiresApproval).toBeDefined();
      expect(mockLLM.getCallCount()).toBe(1);
    });
  });
});
