import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorData {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  score_threshold?: number;
  filter?: Record<string, unknown>;
  with_payload?: boolean;
  with_vector?: boolean;
}

export interface QdrantConfig {
  url?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

class QdrantDatabase {
  private client: QdrantClient;
  private config: QdrantConfig;
  private connectionPromise: Promise<boolean> | null = null;

  constructor(config: QdrantConfig = {}) {
    this.config = {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      timeout: 30000,
      retries: 3,
      ...config
    };

    this.client = new QdrantClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });
  }

  async ensureConnection(): Promise<boolean> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.client.getCollections()
      .then(() => true)
      .catch((error) => {
        console.error('Failed to connect to Qdrant:', error);
        this.connectionPromise = null;
        throw new Error(`Qdrant connection failed: ${error.message}`);
      });

    return this.connectionPromise;
  }

  async createCollection(
    name: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    await this.ensureConnection();

    try {
      await this.client.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance,
        },
      });
    } catch (error) {
      if ((error as {status?: number}).status !== 409) { // 409 = collection already exists
        throw new Error(`Failed to create collection: ${(error as Error).message}`);
      }
    }
  }

  async deleteCollection(name: string): Promise<void> {
    await this.ensureConnection();

    try {
      await this.client.deleteCollection(name);
    } catch (error) {
      throw new Error(`Failed to delete collection: ${(error as Error).message}`);
    }
  }

  async upsertVectors(
    collection: string,
    vectors: VectorData[]
  ): Promise<void> {
    await this.ensureConnection();

    const points = vectors.map(({ id, vector, payload }) => ({
      id,
      vector,
      payload: payload || {},
    }));

    try {
      await this.client.upsert(collection, {
        wait: true,
        points,
      });
    } catch (error) {
      throw new Error(`Failed to upsert vectors: ${(error as Error).message}`);
    }
  }

  async deleteVectors(
    collection: string,
    ids: (string | number)[]
  ): Promise<void> {
    await this.ensureConnection();

    try {
      await this.client.delete(collection, {
        wait: true,
        points: ids,
      });
    } catch (error) {
      throw new Error(`Failed to delete vectors: ${(error as Error).message}`);
    }
  }

  async search(
    collection: string,
    queryVector: number[],
    options: SearchOptions = {}
  ): Promise<Array<{id: string | number; score: number; payload?: Record<string, unknown>; vector?: number[]}>> {
    await this.ensureConnection();

    const {
      limit = 10,
      score_threshold,
      filter,
      with_payload = true,
      with_vector = false,
    } = options;

    try {
      const results = await this.client.search(collection, {
        vector: queryVector,
        limit,
        score_threshold,
        filter,
        with_payload,
        with_vector,
      });

      return results;
    } catch (error) {
      throw new Error(`Search failed: ${(error as Error).message}`);
    }
  }

  async getVector(
    collection: string,
    id: string | number,
    withVector: boolean = false
  ): Promise<{id: string | number; payload?: Record<string, unknown>; vector?: number[]} | null> {
    await this.ensureConnection();

    try {
      const result = await this.client.retrieve(collection, {
        ids: [id],
        with_payload: true,
        with_vector: withVector,
      });

      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to retrieve vector: ${(error as Error).message}`);
    }
  }

  async updatePayload(
    collection: string,
    id: string | number,
    payload: Record<string, unknown>
  ): Promise<void> {
    await this.ensureConnection();

    try {
      await this.client.setPayload(collection, {
        payload,
        points: [id],
      });
    } catch (error) {
      throw new Error(`Failed to update payload: ${(error as Error).message}`);
    }
  }

  async count(collection: string, filter?: Record<string, unknown>): Promise<number> {
    await this.ensureConnection();

    try {
      const result = await this.client.count(collection, {
        filter,
        exact: true,
      });

      return result.count;
    } catch (error) {
      throw new Error(`Failed to count vectors: ${(error as Error).message}`);
    }
  }

  async createIndex(
    collection: string,
    fieldName: string,
    fieldType: 'keyword' | 'integer' | 'float' | 'bool' = 'keyword'
  ): Promise<void> {
    await this.ensureConnection();

    try {
      await this.client.createFieldIndex(collection, {
        field_name: fieldName,
        field_schema: fieldType,
      });
    } catch (error) {
      if ((error as {status?: number}).status !== 409) { // 409 = index already exists
        throw new Error(`Failed to create index: ${(error as Error).message}`);
      }
    }
  }

  async scroll(
    collection: string,
    options: {
      limit?: number;
      offset?: string | number;
      filter?: Record<string, unknown>;
      with_payload?: boolean;
      with_vector?: boolean;
    } = {}
  ): Promise<{ points: Array<{id: string | number; payload?: Record<string, unknown>; vector?: number[]}>; next_page_offset?: string | number }> {
    await this.ensureConnection();

    try {
      const result = await this.client.scroll(collection, {
        limit: options.limit || 100,
        offset: options.offset,
        filter: options.filter,
        with_payload: options.with_payload !== false,
        with_vector: options.with_vector || false,
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to scroll through collection: ${(error as Error).message}`);
    }
  }

  getClient(): QdrantClient {
    return this.client;
  }
}

export const qdrantDB = new QdrantDatabase();

export const configureQdrant = (config: QdrantConfig) => {
  Object.assign(qdrantDB, new QdrantDatabase(config));
};

export const createQdrantClient = (config?: QdrantConfig) => {
  return new QdrantDatabase(config);
};