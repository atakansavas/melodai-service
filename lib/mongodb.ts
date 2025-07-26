/**
 * MongoDB Connection Utility for MelodAI Service
 *
 * Provides a singleton MongoDB connection with proper error handling,
 * connection pooling, and production-ready configuration.
 */

import mongoose, { Connection } from "mongoose";

interface MongoDBConfig {
  uri?: string;
  options?: mongoose.ConnectOptions;
}

class MongoDBManager {
  private static instance: MongoDBManager;
  private connection: Connection | null = null;
  private connectionPromise: Promise<Connection> | null = null;
  private config: Required<MongoDBConfig>;

  private constructor() {
    this.config = {
      uri: process.env.MONGODB_URI || "mongodb://localhost:27017/melodai",
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
        retryWrites: true,
        retryReads: true,
        ...JSON.parse(process.env.MONGODB_OPTIONS || "{}"),
      },
    };

    // Configure mongoose settings
    mongoose.set("strictQuery", false);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected successfully");
    });

    mongoose.connection.on("error", (err: Error) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    // Handle process termination
    process.on("SIGINT", this.gracefulShutdown.bind(this));
    process.on("SIGTERM", this.gracefulShutdown.bind(this));
  }

  public static getInstance(): MongoDBManager {
    if (!MongoDBManager.instance) {
      MongoDBManager.instance = new MongoDBManager();
    }
    return MongoDBManager.instance;
  }

  public async connect(): Promise<Connection> {
    if (this.connection && this.connection.readyState === 1) {
      return this.connection;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  private async establishConnection(): Promise<Connection> {
    try {
      const mongooseInstance = await mongoose.connect(
        this.config.uri,
        this.config.options
      );
      this.connection = mongooseInstance.connection;
      this.connectionPromise = null;
      return this.connection;
    } catch (error) {
      this.connectionPromise = null;
      console.error("Failed to connect to MongoDB:", error);
      throw new Error(
        `MongoDB connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.connectionPromise = null;
    }
  }

  public isConnected(): boolean {
    return this.connection !== null && this.connection.readyState === 1;
  }

  public getConnection(): Connection | null {
    return this.connection;
  }

  private async gracefulShutdown(): Promise<void> {
    console.log("Gracefully shutting down MongoDB connection...");
    await this.disconnect();
    process.exit(0);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        await this.connect();
      }

      // Simple ping to check database connectivity
      const connection = this.connection;
      if (!connection?.db) {
        throw new Error("No database connection available");
      }
      await connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error("MongoDB health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance and connection function
const mongoManager = MongoDBManager.getInstance();

export default async function connectToDatabase(): Promise<Connection> {
  return mongoManager.connect();
}

export { mongoManager };

// Environment variable validation
if (typeof window === "undefined" && !process.env.MONGODB_URI) {
  console.warn(
    "MONGODB_URI environment variable is not set. Using default: mongodb://localhost:27017/melodai"
  );
}
