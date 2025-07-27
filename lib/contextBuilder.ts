/**
 * Context Builder for Dynamic Chat Context
 *
 * Converts dynamic context objects into structured prompt strings
 * for enhanced AI conversation context.
 */

export interface ContextData {
  [key: string]: any;
}

/**
 * Build a context prompt string from dynamic context data
 */
export function buildContextPrompt(context?: ContextData): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  const contextParts: string[] = [];

  // Handle well-known context types with special formatting
  if (context.userProfile) {
    contextParts.push(
      `Kullanıcı Profili: ${JSON.stringify(context.userProfile)}`
    );
  }

  if (context.currentTrack) {
    contextParts.push(`Şu Anda Çalan: ${context.currentTrack}`);
  }

  if (context.mood) {
    contextParts.push(`Kullanıcının Ruh Hali: ${context.mood}`);
  }

  if (context.musicPreferences) {
    contextParts.push(
      `Müzik Tercihleri: ${JSON.stringify(context.musicPreferences)}`
    );
  }

  if (context.timeOfDay) {
    contextParts.push(`Günün Saati: ${context.timeOfDay}`);
  }

  if (context.activity) {
    contextParts.push(`Mevcut Aktivite: ${context.activity}`);
  }

  if (context.workoutType) {
    contextParts.push(`Egzersiz Türü: ${context.workoutType}`);
  }

  if (context.duration) {
    contextParts.push(`Süre: ${context.duration}`);
  }

  if (context.intensity) {
    contextParts.push(`Yoğunluk: ${context.intensity}`);
  }

  if (context.topArtists) {
    contextParts.push(
      `En Sevilen Sanatçılar: ${
        Array.isArray(context.topArtists)
          ? context.topArtists.join(", ")
          : context.topArtists
      }`
    );
  }

  if (context.recentPlaylists) {
    contextParts.push(
      `Son Çalma Listeleri: ${
        Array.isArray(context.recentPlaylists)
          ? context.recentPlaylists.join(", ")
          : context.recentPlaylists
      }`
    );
  }

  if (context.userIntent) {
    contextParts.push(`Kullanıcı Amacı: ${context.userIntent}`);
  }

  if (context.conversationMood) {
    contextParts.push(`Konuşma Havası: ${context.conversationMood}`);
  }

  if (context.selectedArtistName) {
    contextParts.push(`Seçilen Sanatçı: ${context.selectedArtistName}`);
  }

  if (context.timestamp) {
    contextParts.push(`Zaman Damgası: ${context.timestamp}`);
  }

  if (context.trackId) {
    contextParts.push(`Şarkı ID: ${context.trackId}`);
  }

  if (context.selectedTrackName) {
    contextParts.push(`Seçilen Şarkı: ${context.selectedTrackName}`);
  }

  // Handle any other dynamic context that wasn't specifically handled above
  const handledKeys = [
    "userProfile",
    "currentTrack",
    "mood",
    "musicPreferences",
    "timeOfDay",
    "activity",
    "workoutType",
    "duration",
    "intensity",
    "topArtists",
    "recentPlaylists",
    "userIntent",
    "conversationMood",
    "selectedArtistName",
    "timestamp",
    "trackId",
    "selectedTrackName",
  ];

  Object.entries(context).forEach(([key, value]) => {
    if (!handledKeys.includes(key)) {
      const formattedValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      contextParts.push(`${key}: ${formattedValue}`);
    }
  });

  return contextParts.join("\n");
}

/**
 * Get list of context keys that were used in building the prompt
 */
export function getUsedContextKeys(context?: ContextData): string[] {
  if (!context || Object.keys(context).length === 0) {
    return [];
  }

  return Object.keys(context).filter((key) => {
    const value = context[key];
    return value !== undefined && value !== null && value !== "";
  });
}

/**
 * Sanitize context data to prevent prompt injection
 */
export function sanitizeContext(
  context?: ContextData
): ContextData | undefined {
  if (!context) return undefined;

  const sanitized: ContextData = {};

  Object.entries(context).forEach(([key, value]) => {
    // Remove potentially dangerous characters and limit string length
    if (typeof value === "string") {
      sanitized[key] = value
        .replace(/[<>{}]/g, "") // Remove potentially dangerous characters
        .slice(0, 1000); // Limit string length
    } else if (typeof value === "object" && value !== null) {
      // Stringify and limit object size
      const stringified = JSON.stringify(value);
      if (stringified.length <= 2000) {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Validate context size to prevent excessively large contexts
 */
export function validateContextSize(context?: ContextData): {
  isValid: boolean;
  error?: string;
} {
  if (!context) return { isValid: true };

  const contextString = JSON.stringify(context);
  const sizeInBytes = new Blob([contextString]).size;

  // Limit context to 50KB
  if (sizeInBytes > 50 * 1024) {
    return {
      isValid: false,
      error: `Context too large: ${sizeInBytes} bytes (max: 51200 bytes)`,
    };
  }

  // Limit number of context keys
  if (Object.keys(context).length > 50) {
    return {
      isValid: false,
      error: `Too many context keys: ${Object.keys(context).length} (max: 50)`,
    };
  }

  return { isValid: true };
}
