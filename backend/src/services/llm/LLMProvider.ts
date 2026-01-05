import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CohereClient } from 'cohere-ai';
import Groq from 'groq-sdk';
import { logger } from '../../utils/logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'cohere' | 'groq';
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export abstract class LLMProvider {
  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract chat(messages: LLMMessage[]): Promise<LLMResponse>;
  abstract embed(text: string): Promise<number[]>;
}

export class OpenAIProvider extends LLMProvider {
  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000
      });

      return {
        content: response.choices[0].message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      logger.error('OpenAI API error', { error });
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI embedding error', { error });
      throw new Error(`OpenAI embedding error: ${error}`);
    }
  }
}

export class AnthropicProvider extends LLMProvider {
  private client: Anthropic;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 2000,
        system: systemMessage?.content,
        messages: userMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      const content = response.content[0];
      return {
        content: content.type === 'text' ? content.text : '',
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error('Anthropic API error', { error });
      throw new Error(`Anthropic API error: ${error}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic doesn't provide embeddings, fallback to OpenAI if available
    throw new Error('Anthropic does not support embeddings. Please use OpenAI or Cohere.');
  }
}

export class CohereProvider extends LLMProvider {
  private client: CohereClient;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new CohereClient({ token: config.apiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const chatHistory = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'USER' as const : 'CHATBOT' as const,
        message: m.content
      }));
      
      const lastMessage = messages[messages.length - 1];

      const response = await this.client.chat({
        model: this.config.model,
        message: lastMessage.content,
        chatHistory: chatHistory,
        temperature: this.config.temperature || 0.7
      });

      return {
        content: response.text,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      logger.error('Cohere API error', { error });
      throw new Error(`Cohere API error: ${error}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embed({
        texts: [text],
        model: 'embed-english-v3.0',
        inputType: 'search_document'
      });
      return response.embeddings[0];
    } catch (error) {
      logger.error('Cohere embedding error', { error });
      throw new Error(`Cohere embedding error: ${error}`);
    }
  }
}

export class GroqProvider extends LLMProvider {
  private client: Groq;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new Groq({ apiKey: config.apiKey });
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'llama-3.1-70b-versatile',
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000
      });

      return {
        content: response.choices[0].message.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      logger.error('Groq API error', { error });
      throw new Error(`Groq API error: ${error}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    // Groq doesn't provide embeddings yet
    // Fallback to a simple approach or throw error
    logger.warn('Groq does not support embeddings. Consider using OpenAI or Cohere for memory features.');
    throw new Error('Groq does not support embeddings. Please use OpenAI or Cohere.');
  }
}

// Factory function
export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'cohere':
      return new CohereProvider(config);
    case 'groq':
      return new GroqProvider(config);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
