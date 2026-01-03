import { LLMProvider, LLMMessage, LLMResponse, LLMProviderConfig } from '../../src/services/llm/LLMProvider';

export class MockLLMProvider extends LLMProvider {
  private responses: Map<string, string> = new Map();
  private callCount: number = 0;

  constructor(config: LLMProviderConfig) {
    super(config);
  }

  // Set a mock response for testing
  setMockResponse(key: string, response: string): void {
    this.responses.set(key, response);
  }

  // Set a default response for all requests
  setDefaultResponse(response: string): void {
    this.responses.set('default', response);
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    this.callCount++;
    
    // Extract last user message as key
    const lastMessage = messages.find(m => m.role === 'user');
    const key = lastMessage?.content.substring(0, 50) || 'default';
    
    // Return mock response
    const content = this.responses.get(key) || 
                   this.responses.get('default') || 
                   'This is a mock LLM response for testing purposes.';

    return {
      content,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };
  }

  async embed(text: string): Promise<number[]> {
    // Return a mock embedding vector (1536 dimensions for OpenAI)
    return new Array(1536).fill(0).map(() => Math.random());
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.responses.clear();
    this.callCount = 0;
  }
}
