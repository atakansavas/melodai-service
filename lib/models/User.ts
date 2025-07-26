/**
 * User Model for MelodAI Service
 *
 * Mongoose model implementation of UserDBObject schema with
 * proper validation, indexing, and production-ready configuration.
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import validator from "validator";
import { UserDBObject } from "../db-schema";
// Extend UserDBObject with Mongoose Document
export interface IUser extends Omit<UserDBObject, "id">, Document {
  _id: string;
}

// Spotify profile sub-schema
const SpotifyProfileSchema = new Schema(
  {
    id: {
      type: String,
      required: [true, "Spotify ID is required"],
      trim: true,
      index: true,
    },
    display_name: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [100, "Display name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
      index: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      uppercase: true,
      length: [2, "Country code must be 2 characters (ISO 3166-1 alpha-2)"],
      validate: {
        validator: (v: string) => validator.isISO31661Alpha2(v),
        message: "Country must be a valid ISO 3166-1 alpha-2 code",
      },
    },
    product: {
      type: String,
      required: [true, "Spotify product type is required"],
      enum: {
        values: ["premium", "free"],
        message: "Product must be either premium or free",
      },
    },
    followers: {
      type: Number,
      required: [true, "Followers count is required"],
      min: [0, "Followers count cannot be negative"],
      default: 0,
    },
    images: [
      {
        url: {
          type: String,
          required: [true, "Image URL is required"],
          validate: [validator.isURL, "Please provide a valid URL"],
        },
        height: {
          type: Number,
          min: [1, "Height must be positive"],
          default: null,
        },
        width: {
          type: Number,
          min: [1, "Width must be positive"],
          default: null,
        },
      },
    ],
    external_urls: {
      spotify: {
        type: String,
        required: [true, "Spotify URL is required"],
        validate: [validator.isURL, "Please provide a valid Spotify URL"],
      },
    },
  },
  { _id: false }
);

// App metadata sub-schema
const AppMetadataSchema = new Schema(
  {
    created_at: {
      type: String,
      required: [true, "Created at timestamp is required"],
      validate: [
        validator.isISO8601,
        "Created at must be a valid ISO 8601 date",
      ],
    },
    last_login: {
      type: String,
      required: [true, "Last login timestamp is required"],
      validate: [
        validator.isISO8601,
        "Last login must be a valid ISO 8601 date",
      ],
    },
    last_activity: {
      type: String,
      required: [true, "Last activity timestamp is required"],
      validate: [
        validator.isISO8601,
        "Last activity must be a valid ISO 8601 date",
      ],
    },
    language_preference: {
      type: String,
      required: [true, "Language preference is required"],
      minlength: [2, "Language preference must be at least 2 characters"],
      maxlength: [5, "Language preference cannot exceed 5 characters"],
      default: "en",
    },
    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      default: "UTC",
    },
    total_sessions: {
      type: Number,
      required: [true, "Total sessions count is required"],
      min: [0, "Total sessions cannot be negative"],
      default: 0,
    },
    total_api_calls: {
      type: Number,
      required: [true, "Total API calls count is required"],
      min: [0, "Total API calls cannot be negative"],
      default: 0,
    },
    app_version: {
      type: String,
      required: [true, "App version is required"],
      trim: true,
    },
    platform: {
      type: String,
      required: [true, "Platform is required"],
      enum: {
        values: ["ios", "android", "web"],
        message: "Platform must be ios, android, or web",
      },
    },
  },
  { _id: false }
);

// Device info sub-schema
const DeviceInfoSchema = new Schema(
  {
    push_token: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    device_id: {
      type: String,
      required: [true, "Device ID is required"],
      trim: true,
      index: true,
    },
    device_type: {
      type: String,
      required: [true, "Device type is required"],
      trim: true,
    },
    os_version: {
      type: String,
      required: [true, "OS version is required"],
      trim: true,
    },
    app_version: {
      type: String,
      required: [true, "App version is required"],
      trim: true,
    },
    notifications_enabled: {
      type: Boolean,
      required: [true, "Notifications enabled flag is required"],
      default: true,
    },
    last_push_token_update: {
      type: String,
      validate: [
        validator.isISO8601,
        "Last push token update must be a valid ISO 8601 date",
      ],
    },
  },
  { _id: false }
);

// Notification preferences sub-schema
const NotificationPreferencesSchema = new Schema(
  {
    new_music: {
      type: Boolean,
      required: [true, "New music notification preference is required"],
      default: true,
    },
    playlist_updates: {
      type: Boolean,
      required: [true, "Playlist updates notification preference is required"],
      default: true,
    },
    recommendations: {
      type: Boolean,
      required: [true, "Recommendations notification preference is required"],
      default: true,
    },
    system_updates: {
      type: Boolean,
      required: [true, "System updates notification preference is required"],
      default: true,
    },
    marketing: {
      type: Boolean,
      required: [true, "Marketing notification preference is required"],
      default: false,
    },
  },
  { _id: false }
);

// Preferences sub-schema
const PreferencesSchema = new Schema(
  {
    preferred_genres: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    listening_habits: {
      type: Schema.Types.Mixed,
      default: {},
    },
    interaction_patterns: {
      type: Schema.Types.Mixed,
      default: {},
    },
    privacy_settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    notification_preferences: {
      type: NotificationPreferencesSchema,
      required: [true, "Notification preferences are required"],
      default: () => ({}),
    },
  },
  { _id: false }
);

// Subscription sub-schema
const SubscriptionSchema = new Schema(
  {
    type: {
      type: String,
      required: [true, "Subscription type is required"],
      enum: {
        values: ["free", "premium"],
        message: "Subscription type must be free or premium",
      },
      default: "free",
    },
    expires_at: {
      type: String,
      validate: [
        validator.isISO8601,
        "Expires at must be a valid ISO 8601 date",
      ],
    },
    features_enabled: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

// Main User schema
const UserSchema = new Schema<IUser>(
  {
    id: {
      type: String,
      required: [true, "User ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    spotify_profile: {
      type: SpotifyProfileSchema,
      required: [true, "Spotify profile is required"],
    },
    app_metadata: {
      type: AppMetadataSchema,
      required: [true, "App metadata is required"],
    },
    device_info: {
      type: DeviceInfoSchema,
      required: [true, "Device info is required"],
    },
    preferences: {
      type: PreferencesSchema,
      required: [true, "Preferences are required"],
      default: () => ({}),
    },
    subscription: {
      type: SubscriptionSchema,
      required: [true, "Subscription info is required"],
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
    collection: "users",
  }
);

// Indexes for performance
UserSchema.index({ "spotify_profile.email": 1 });
UserSchema.index({ "device_info.device_id": 1 });
UserSchema.index({ "device_info.push_token": 1 }, { sparse: true });
UserSchema.index({ created_at: 1 });
UserSchema.index({ updated_at: 1 });
UserSchema.index({ "app_metadata.last_activity": 1 });

// Pre-save middleware to update timestamps
UserSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updated_at = new Date().toISOString();
  }
  next();
});

UserSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (next) {
    this.set({ updated_at: new Date().toISOString() });
    next();
  }
);

// Instance methods
UserSchema.methods.updateLastActivity = function () {
  this.app_metadata.last_activity = new Date().toISOString();
  this.updated_at = new Date().toISOString();
  return this.save();
};

UserSchema.methods.incrementSessionCount = function () {
  this.app_metadata.total_sessions += 1;
  this.app_metadata.last_activity = new Date().toISOString();
  this.updated_at = new Date().toISOString();
  return this.save();
};

UserSchema.methods.incrementApiCalls = function () {
  this.app_metadata.total_api_calls += 1;
  this.updated_at = new Date().toISOString();
  return this.save();
};

// Static methods
UserSchema.statics.findBySpotifyId = function (spotifyId: string) {
  return this.findOne({ "spotify_profile.id": spotifyId });
};

UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ "spotify_profile.email": email.toLowerCase() });
};

UserSchema.statics.findByDeviceId = function (deviceId: string) {
  return this.findOne({ "device_info.device_id": deviceId });
};

UserSchema.statics.findByPushToken = function (pushToken: string) {
  return this.findOne({ "device_info.push_token": pushToken });
};

// Create and export the model
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
