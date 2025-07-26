/**
 * ChatSession Model for MelodAI Service
 *
 * Mongoose model implementation of ChatSessionDBObject schema with
 * proper validation, indexing, and production-ready configuration.
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import validator from "validator";
import { ChatSessionDBObject } from "../db-schema";
// Extend ChatSessionDBObject with Mongoose Document
export interface IChatSession
  extends Omit<ChatSessionDBObject, "id">,
    Document {
  _id: string;
}

// Session metadata sub-schema
const SessionMetadataSchema = new Schema(
  {
    created_at: {
      type: String,
      required: [true, "Session created at timestamp is required"],
      validate: [
        validator.isISO8601,
        "Created at must be a valid ISO 8601 date",
      ],
      default: () => new Date().toISOString(),
    },
    ended_at: {
      type: String,
      validate: [validator.isISO8601, "Ended at must be a valid ISO 8601 date"],
    },
    duration_minutes: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
    message_count: {
      type: Number,
      required: [true, "Message count is required"],
      min: [0, "Message count cannot be negative"],
      default: 0,
    },
    session_type: {
      type: String,
      required: [true, "Session type is required"],
      enum: {
        values: ["discovery", "playlist_creation", "general", "support"],
        message:
          "Session type must be discovery, playlist_creation, general, or support",
      },
      default: "general",
    },
  },
  { _id: false }
);

// Context sub-schema
const ContextSchema = new Schema(
  {
    related_track_id: {
      type: String,
      trim: true,
      index: true,
    },
    related_playlist_id: {
      type: String,
      trim: true,
      index: true,
    },
    chat_type: {
      type: String,
      required: [true, "Chat type is required"],
      enum: {
        values: ["song_discovery", "playlist_creation", "general"],
        message:
          "Chat type must be song_discovery, playlist_creation, or general",
      },
      default: "general",
    },
    user_intent: {
      type: String,
      required: [true, "User intent is required"],
      trim: true,
      maxlength: [500, "User intent cannot exceed 500 characters"],
    },
    conversation_mood: {
      type: String,
      trim: true,
      maxlength: [100, "Conversation mood cannot exceed 100 characters"],
    },
    user_satisfaction_score: {
      type: Number,
      min: [0, "User satisfaction score cannot be negative"],
      max: [10, "User satisfaction score cannot exceed 10"],
    },
  },
  { _id: false }
);

// Chat message sub-schema
const ChatMessageSchema = new Schema(
  {
    id: {
      type: String,
      required: [true, "Message ID is required"],
      trim: true,
      index: true,
    },
    timestamp: {
      type: String,
      required: [true, "Message timestamp is required"],
      validate: [
        validator.isISO8601,
        "Timestamp must be a valid ISO 8601 date",
      ],
      default: () => new Date().toISOString(),
    },
    role: {
      type: String,
      required: [true, "Message role is required"],
      enum: {
        values: ["user", "assistant"],
        message: "Role must be user or assistant",
      },
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [10000, "Message cannot exceed 10000 characters"],
    },
    message_type: {
      type: String,
      required: [true, "Message type is required"],
      enum: {
        values: ["text", "action", "spotify_result"],
        message: "Message type must be text, action, or spotify_result",
      },
      default: "text",
    },
    action_taken: {
      type: String,
      trim: true,
      maxlength: [200, "Action taken cannot exceed 200 characters"],
    },
    spotify_api_call: {
      type: String,
      trim: true,
      maxlength: [500, "Spotify API call cannot exceed 500 characters"],
    },
    response_time_ms: {
      type: Number,
      min: [0, "Response time cannot be negative"],
    },
  },
  { _id: false }
);

// Outcomes sub-schema
const OutcomesSchema = new Schema(
  {
    tracks_discovered: [
      {
        type: String,
        trim: true,
      },
    ],
    playlists_created: [
      {
        type: String,
        trim: true,
      },
    ],
    tracks_liked: [
      {
        type: String,
        trim: true,
      },
    ],
    user_satisfaction: {
      type: Number,
      min: [0, "User satisfaction cannot be negative"],
      max: [10, "User satisfaction cannot exceed 10"],
    },
    goals_achieved: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Goal description cannot exceed 200 characters"],
      },
    ],
  },
  { _id: false }
);

// Main ChatSession schema
const ChatSessionSchema = new Schema<IChatSession>(
  {
    id: {
      type: String,
      required: [true, "Chat session ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    user_id: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
      index: true,
    },
    session_metadata: {
      type: SessionMetadataSchema,
      required: [true, "Session metadata is required"],
      default: () => ({}),
    },
    context: {
      type: ContextSchema,
      required: [true, "Context is required"],
      default: () => ({}),
    },
    chat_history: {
      type: [ChatMessageSchema],
      required: [true, "Chat history is required"],
      default: [],
      validate: {
        validator: function (messages: any[]) {
          return messages.length <= 1000; // Reasonable limit for chat history
        },
        message: "Chat history cannot exceed 1000 messages",
      },
    },
    outcomes: {
      type: OutcomesSchema,
      required: [true, "Outcomes are required"],
      default: () => ({}),
    },
    created_at: {
      type: String,
      required: [true, "Created at timestamp is required"],
      validate: [
        validator.isISO8601,
        "Created at must be a valid ISO 8601 date",
      ],
      default: () => new Date().toISOString(),
    },
    updated_at: {
      type: String,
      required: [true, "Updated at timestamp is required"],
      validate: [
        validator.isISO8601,
        "Updated at must be a valid ISO 8601 date",
      ],
      default: () => new Date().toISOString(),
    },
  },
  {
    timestamps: false, // We handle timestamps manually
    versionKey: false,
    collection: "chat_sessions",
  }
);

// Indexes for performance
ChatSessionSchema.index({ user_id: 1, created_at: -1 });
ChatSessionSchema.index({ "session_metadata.session_type": 1 });
ChatSessionSchema.index({ "context.chat_type": 1 });
ChatSessionSchema.index({ "context.related_track_id": 1 }, { sparse: true });
ChatSessionSchema.index({ "context.related_playlist_id": 1 }, { sparse: true });
ChatSessionSchema.index({ created_at: -1 });
ChatSessionSchema.index({ updated_at: -1 });
ChatSessionSchema.index({ "session_metadata.ended_at": 1 }, { sparse: true });

// Pre-save middleware to update timestamps and calculate duration
ChatSessionSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updated_at = new Date().toISOString();

    // Calculate session duration if ended_at is set
    if (this.session_metadata.ended_at && this.session_metadata.created_at) {
      const startTime = new Date(this.session_metadata.created_at);
      const endTime = new Date(this.session_metadata.ended_at);
      this.session_metadata.duration_minutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );
    }

    // Update message count
    this.session_metadata.message_count = this.chat_history.length;
  }
  next();
});

ChatSessionSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (next) {
    this.set({ updated_at: new Date().toISOString() });
    next();
  }
);

// Instance methods
ChatSessionSchema.methods.addMessage = function (message: {
  id: string;
  role: "user" | "assistant";
  message: string;
  message_type?: "text" | "action" | "spotify_result";
  action_taken?: string;
  spotify_api_call?: string;
  response_time_ms?: number;
}) {
  const messageWithTimestamp = {
    ...message,
    timestamp: new Date().toISOString(),
    message_type: message.message_type || "text",
  };

  this.chat_history.push(messageWithTimestamp);
  this.session_metadata.message_count = this.chat_history.length;
  this.updated_at = new Date().toISOString();

  return this.save();
};

ChatSessionSchema.methods.endSession = function (satisfaction?: number) {
  this.session_metadata.ended_at = new Date().toISOString();

  if (satisfaction !== undefined) {
    this.context.user_satisfaction_score = satisfaction;
    this.outcomes.user_satisfaction = satisfaction;
  }

  // Calculate duration
  const startTime = new Date(this.session_metadata.created_at);
  const endTime = new Date(this.session_metadata.ended_at);
  this.session_metadata.duration_minutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  this.updated_at = new Date().toISOString();
  return this.save();
};

ChatSessionSchema.methods.addDiscoveredTrack = function (trackId: string) {
  if (!this.outcomes.tracks_discovered.includes(trackId)) {
    this.outcomes.tracks_discovered.push(trackId);
    this.updated_at = new Date().toISOString();
  }
  return this.save();
};

ChatSessionSchema.methods.addCreatedPlaylist = function (playlistId: string) {
  if (!this.outcomes.playlists_created.includes(playlistId)) {
    this.outcomes.playlists_created.push(playlistId);
    this.updated_at = new Date().toISOString();
  }
  return this.save();
};

ChatSessionSchema.methods.addLikedTrack = function (trackId: string) {
  if (!this.outcomes.tracks_liked.includes(trackId)) {
    this.outcomes.tracks_liked.push(trackId);
    this.updated_at = new Date().toISOString();
  }
  return this.save();
};

// Static methods
ChatSessionSchema.statics.findByUserId = function (
  userId: string,
  limit: number = 50
) {
  return this.find({ user_id: userId }).sort({ created_at: -1 }).limit(limit);
};

ChatSessionSchema.statics.findActiveSessionsByUserId = function (
  userId: string
) {
  return this.find({
    user_id: userId,
    "session_metadata.ended_at": { $exists: false },
  }).sort({ created_at: -1 });
};

ChatSessionSchema.statics.findBySessionType = function (
  sessionType: string,
  limit: number = 100
) {
  return this.find({ "session_metadata.session_type": sessionType })
    .sort({ created_at: -1 })
    .limit(limit);
};

ChatSessionSchema.statics.getSessionStats = function (userId?: string) {
  const matchStage = userId ? { user_id: userId } : {};

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$session_metadata.session_type",
        count: { $sum: 1 },
        avgDuration: { $avg: "$session_metadata.duration_minutes" },
        avgMessages: { $avg: "$session_metadata.message_count" },
        avgSatisfaction: { $avg: "$outcomes.user_satisfaction" },
      },
    },
  ]);
};

// Create and export the model
const ChatSession: Model<IChatSession> =
  mongoose.models.ChatSession ||
  mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);

export default ChatSession;
