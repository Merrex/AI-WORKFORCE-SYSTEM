// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ai_workforce_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Mock LLM API keys (not real, for testing only)
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.COHERE_API_KEY = 'test-cohere-key';

// Disable actual API calls in tests by default
jest.setTimeout(10000);
