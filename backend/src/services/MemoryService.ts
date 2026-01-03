import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/schema';
import { createLLMProvider } from './llm/LLMProvider';
import { logger } from '../utils/logger';

export type MemoryType = 'short_term' | 'episodic' | 'role' | 'org';

export interface Memory {
  id: string;
  agentId: string;
  organizationId: string;
  type: MemoryType;
  content: any;
  embeddingId?: string;
  createdAt: Date;
}

export class MemoryService {
  private vectorClient: QdrantClient;
  private collectionName: string;
  private embeddingProvider: any;

  constructor() {
    this.vectorClient = new QdrantClient({
      url: process.env.VECTOR_DB_URL || 'http://localhost:6333'
    });
    this.collectionName = process.env.VECTOR_DB_COLLECTION || 'ai_workforce_memory';
    
    // Initialize embedding provider
    const embeddingKey = process.env.OPENAI_API_KEY || process.env.COHERE_API_KEY;
    if (embeddingKey) {
      this.embeddingProvider = createLLMProvider({
        provider: process.env.OPENAI_API_KEY ? 'openai' : 'cohere',
        model: 'text-embedding-3-small',
        apiKey: embeddingKey
      });
    }
  }

  async initialize(): Promise<void> {
    try {
      // Check if collection exists, create if not
      const collections = await this.vectorClient.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        await this.vectorClient.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI embedding size
            distance: 'Cosine'
          }
        });
        logger.info(`Vector collection ${this.collectionName} created`);
      }
    } catch (error) {
      logger.error('Failed to initialize vector database', { error });
    }
  }

  async store(
    agentId: string,
    organizationId: string,
    content: any,
    type: MemoryType
  ): Promise<string> {
    const memoryId = uuidv4();
    
    try {
      // Store in SQL database
      await db.insertInto('memory')
        .values({
          id: memoryId,
          agent_id: agentId,
          organization_id: organizationId,
          memory_type: type,
          content: JSON.stringify(content),
          created_at: new Date()
        })
        .execute();

      // Store embedding in vector database if provider is available
      if (this.embeddingProvider && type !== 'short_term') {
        const textContent = typeof content === 'string' ? content : JSON.stringify(content);
        const embedding = await this.embeddingProvider.embed(textContent);

        await this.vectorClient.upsert(this.collectionName, {
          points: [{
            id: memoryId,
            vector: embedding,
            payload: {
              agentId,
              organizationId,
              type,
              content: textContent,
              timestamp: new Date().toISOString()
            }
          }]
        });

        // Update embedding_id in database
        await db.updateTable('memory')
          .set({ embedding_id: memoryId })
          .where('id', '=', memoryId)
          .execute();
      }

      logger.info('Memory stored', { memoryId, agentId, type });
      return memoryId;
    } catch (error) {
      logger.error('Failed to store memory', { error, agentId, type });
      throw error;
    }
  }

  async search(
    agentId: string,
    query: string,
    type?: MemoryType,
    limit: number = 5
  ): Promise<any[]> {
    try {
      if (!this.embeddingProvider) {
        // Fallback to SQL search if no embedding provider
        return await this.sqlSearch(agentId, type, limit);
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingProvider.embed(query);

      // Search vector database
      const searchResult = await this.vectorClient.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        filter: {
          must: [
            { key: 'agentId', match: { value: agentId } },
            ...(type ? [{ key: 'type', match: { value: type } }] : [])
          ]
        }
      });

      return searchResult.map(result => ({
        id: result.id,
        score: result.score,
        ...result.payload
      }));
    } catch (error) {
      logger.error('Memory search failed', { error, agentId, query });
      // Fallback to SQL search
      return await this.sqlSearch(agentId, type, limit);
    }
  }

  private async sqlSearch(
    agentId: string,
    type?: MemoryType,
    limit: number = 5
  ): Promise<any[]> {
    let query = db.selectFrom('memory')
      .selectAll()
      .where('agent_id', '=', agentId)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (type) {
      query = query.where('memory_type', '=', type);
    }

    const results = await query.execute();
    return results.map(r => ({
      id: r.id,
      content: r.content,
      type: r.memory_type,
      timestamp: r.created_at
    }));
  }

  async clearShortTermMemory(agentId: string): Promise<void> {
    try {
      await db.deleteFrom('memory')
        .where('agent_id', '=', agentId)
        .where('memory_type', '=', 'short_term')
        .execute();
      
      logger.info('Short-term memory cleared', { agentId });
    } catch (error) {
      logger.error('Failed to clear short-term memory', { error, agentId });
    }
  }
}

export const memoryService = new MemoryService();
