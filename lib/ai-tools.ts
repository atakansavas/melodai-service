/**
 * AI Tools for Spotify Integration
 *
 * OpenAI function calling tools that enable the AI agent to interact
 * with Spotify Web API for music discovery and playback control.
 */

import { tool } from "ai";
import { z } from "zod";
import { createSpotifyService } from "./spotify";

// ===== TOOL DEFINITIONS =====

export const searchSongsTool = tool({
  description:
    "Search for songs on Spotify and get detailed track information including artist, album, duration, and Spotify URLs",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query for songs (e.g., 'Bohemian Rhapsody Queen', 'upbeat pop songs', 'acoustic guitar')"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of results to return (default: 5, max: 20)"),
  }),
  execute: async ({ query, limit }) => {
    // This will be handled externally
    return { query, limit };
  },
});

export const searchArtistsTool = tool({
  description:
    "Search for artists on Spotify and get detailed artist information including genres, popularity, and follower count",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query for artists (e.g., 'The Beatles', 'jazz pianists', 'Turkish pop singers')"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of results to return (default: 5, max: 20)"),
  }),
  execute: async ({ query, limit }) => {
    return { query, limit };
  },
});

export const searchAlbumsTool = tool({
  description:
    "Search for albums on Spotify and get detailed album information including release date, track count, and cover art",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query for albums (e.g., 'Abbey Road Beatles', 'latest pop albums 2024')"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of results to return (default: 5, max: 20)"),
  }),
  execute: async ({ query, limit }) => {
    return { query, limit };
  },
});

export const playSongTool = tool({
  description:
    "Play a specific song on the user's active Spotify device. Requires the track's Spotify URI.",
  parameters: z.object({
    track_uri: z
      .string()
      .describe(
        "Spotify URI of the track to play (e.g., 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh')"
      ),
    track_name: z
      .string()
      .optional()
      .describe("Name of the track for confirmation and user feedback"),
    device_id: z
      .string()
      .optional()
      .describe("Optional: Specific device ID to play on"),
  }),
  execute: async ({ track_uri, track_name, device_id }) => {
    return { track_uri, track_name, device_id };
  },
});

export const getCurrentPlaybackTool = tool({
  description:
    "Get information about what's currently playing on the user's Spotify account",
  parameters: z.object({
    device_id: z
      .string()
      .optional()
      .describe("Optional: Specific device ID to check"),
  }),
  execute: async ({ device_id }) => {
    return { device_id };
  },
});

export const controlPlaybackTool = tool({
  description: "Control Spotify playback (play, pause, next, previous, volume)",
  parameters: z.object({
    action: z
      .enum(["play", "pause", "next", "previous"])
      .describe("Playback action to perform"),
    volume: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Volume level (0-100) when action is 'volume'"),
    device_id: z
      .string()
      .optional()
      .describe("Optional: Specific device ID to control"),
  }),
  execute: async ({ action, volume, device_id }) => {
    return { action, volume, device_id };
  },
});

export const getRecommendationsTool = tool({
  description:
    "Get personalized music recommendations based on seed tracks, artists, or genres with optional audio feature targeting",
  parameters: z.object({
    seed_tracks: z
      .array(z.string())
      .max(5)
      .optional()
      .describe("Array of track IDs to base recommendations on"),
    seed_artists: z
      .array(z.string())
      .max(5)
      .optional()
      .describe("Array of artist IDs to base recommendations on"),
    seed_genres: z
      .array(z.string())
      .max(5)
      .optional()
      .describe(
        "Array of genre names (e.g., 'pop', 'rock', 'jazz', 'electronic')"
      ),
    target_energy: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Target energy level (0.0 = low energy, 1.0 = high energy)"),
    target_valence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Target mood (0.0 = sad/negative, 1.0 = happy/positive)"),
    target_danceability: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        "Target danceability (0.0 = not danceable, 1.0 = very danceable)"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe("Number of recommendations to return (default: 10, max: 20)"),
  }),
  execute: async ({
    seed_tracks,
    seed_artists,
    seed_genres,
    target_energy,
    target_valence,
    target_danceability,
    limit,
  }) => {
    return {
      seed_tracks,
      seed_artists,
      seed_genres,
      target_energy,
      target_valence,
      target_danceability,
      limit,
    };
  },
});

export const getUserTopTracksTool = tool({
  description:
    "Get the user's top tracks from Spotify based on their listening history",
  parameters: z.object({
    time_range: z
      .enum(["short_term", "medium_term", "long_term"])
      .default("medium_term")
      .describe(
        "Time range for top tracks (short_term: 4 weeks, medium_term: 6 months, long_term: all time)"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe("Number of tracks to return (default: 10, max: 20)"),
  }),
  execute: async ({ time_range, limit }) => {
    return { time_range, limit };
  },
});

export const getUserTopArtistsTool = tool({
  description:
    "Get the user's top artists from Spotify based on their listening history",
  parameters: z.object({
    time_range: z
      .enum(["short_term", "medium_term", "long_term"])
      .default("medium_term")
      .describe(
        "Time range for top artists (short_term: 4 weeks, medium_term: 6 months, long_term: all time)"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe("Number of artists to return (default: 10, max: 20)"),
  }),
  execute: async ({ time_range, limit }) => {
    return { time_range, limit };
  },
});

export const createPlaylistTool = tool({
  description: "Create a new playlist on the user's Spotify account",
  parameters: z.object({
    name: z.string().describe("Name for the new playlist"),
    description: z
      .string()
      .optional()
      .describe("Optional description for the playlist"),
    public: z
      .boolean()
      .default(false)
      .describe("Whether the playlist should be public (default: false)"),
  }),
  execute: async ({ name, description, public: isPublic }) => {
    return { name, description, public: isPublic };
  },
});

export const addToQueueTool = tool({
  description: "Add a track to the user's Spotify playback queue",
  parameters: z.object({
    track_uri: z.string().describe("Spotify URI of the track to add to queue"),
    track_name: z
      .string()
      .optional()
      .describe("Name of the track for confirmation"),
    device_id: z
      .string()
      .optional()
      .describe("Optional: Specific device ID to add to queue"),
  }),
  execute: async ({ track_uri, track_name, device_id }) => {
    return { track_uri, track_name, device_id };
  },
});

// Export tools object for use with generateText
export const SPOTIFY_TOOLS = {
  search_songs: searchSongsTool,
  search_artists: searchArtistsTool,
  search_albums: searchAlbumsTool,
  play_song: playSongTool,
  get_current_playback: getCurrentPlaybackTool,
  control_playback: controlPlaybackTool,
  get_recommendations: getRecommendationsTool,
  get_user_top_tracks: getUserTopTracksTool,
  get_user_top_artists: getUserTopArtistsTool,
  create_playlist: createPlaylistTool,
  add_to_queue: addToQueueTool,
};

// ===== TOOL HANDLERS =====

export interface ToolResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

/**
 * Search for songs on Spotify
 */
export async function handleSongSearch(
  args: { query: string; limit?: number },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const result = await spotify.searchTracks(args.query, args.limit || 5);

    const tracks = result.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      artists: track.artists,
      album: track.album,
      duration_ms: track.duration_ms,
      duration_formatted: formatDuration(track.duration_ms),
      preview_url: track.preview_url,
      spotify_url: track.spotify_url,
      uri: track.uri,
      popularity: track.popularity,
      explicit: track.explicit,
      release_date: track.release_date,
    }));

    return {
      success: true,
      data: { tracks, total: tracks.length },
      message: `Found ${tracks.length} tracks for "${args.query}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search songs",
    };
  }
}

/**
 * Search for artists on Spotify
 */
export async function handleArtistSearch(
  args: { query: string; limit?: number },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const result = await spotify.searchArtists(args.query, args.limit || 5);

    const artists = result.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers,
      followers_formatted: formatNumber(artist.followers),
      spotify_url: artist.spotify_url,
      uri: artist.uri,
      images: artist.images,
    }));

    return {
      success: true,
      data: { artists, total: artists.length },
      message: `Found ${artists.length} artists for "${args.query}"`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to search artists",
    };
  }
}

/**
 * Search for albums on Spotify
 */
export async function handleAlbumSearch(
  args: { query: string; limit?: number },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const result = await spotify.searchAlbums(args.query, args.limit || 5);

    const albums = result.albums.map((album) => ({
      id: album.id,
      name: album.name,
      artist: album.artist,
      artists: album.artists,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      spotify_url: album.spotify_url,
      uri: album.uri,
      images: album.images,
    }));

    return {
      success: true,
      data: { albums, total: albums.length },
      message: `Found ${albums.length} albums for "${args.query}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search albums",
    };
  }
}

/**
 * Play a song on Spotify
 */
export async function handleSongPlay(
  args: { track_uri: string; track_name?: string; device_id?: string },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    await spotify.play({
      uris: [args.track_uri],
      device_id: args.device_id,
    });

    return {
      success: true,
      data: { track_uri: args.track_uri },
      message: `Now playing: ${args.track_name || "Selected track"}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to play song",
    };
  }
}

/**
 * Get current playback information
 */
export async function handleGetCurrentPlayback(
  args: {
    device_id?: string;
  },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const playback = await spotify.getCurrentPlayback();

    if (!playback) {
      return {
        success: true,
        data: null,
        message: "No active playback found",
      };
    }

    const formattedPlayback = {
      is_playing: playback.is_playing,
      track: playback.track
        ? {
            ...playback.track,
            duration_formatted: formatDuration(playback.track.duration_ms),
            progress_formatted: formatDuration(playback.progress_ms),
          }
        : null,
      device: playback.device,
      progress_ms: playback.progress_ms,
      shuffle_state: playback.shuffle_state,
      repeat_state: playback.repeat_state,
      context: playback.context,
    };

    return {
      success: true,
      data: formattedPlayback,
      message: playback.is_playing
        ? `Currently playing: ${playback.track?.name} by ${playback.track?.artist}`
        : "Playback is paused",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get current playback",
    };
  }
}

/**
 * Control Spotify playback
 */
export async function handlePlaybackControl(
  args: {
    action: "play" | "pause" | "next" | "previous";
    volume?: number;
    device_id?: string;
  },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);

    switch (args.action) {
      case "play":
        await spotify.play({ device_id: args.device_id });
        return {
          success: true,
          message: "Playback resumed",
        };

      case "pause":
        await spotify.pause(args.device_id);
        return {
          success: true,
          message: "Playback paused",
        };

      case "next":
        await spotify.skipToNext(args.device_id);
        return {
          success: true,
          message: "Skipped to next track",
        };

      case "previous":
        await spotify.skipToPrevious(args.device_id);
        return {
          success: true,
          message: "Skipped to previous track",
        };

      default:
        return {
          success: false,
          error: "Invalid playback action",
        };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to control playback",
    };
  }
}

/**
 * Get music recommendations
 */
export async function handleGetRecommendations(
  args: {
    seed_tracks?: string[];
    seed_artists?: string[];
    seed_genres?: string[];
    target_energy?: number;
    target_valence?: number;
    target_danceability?: number;
    limit?: number;
  },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const result = await spotify.getRecommendations({
      seedTracks: args.seed_tracks,
      seedArtists: args.seed_artists,
      seedGenres: args.seed_genres,
      targetEnergy: args.target_energy,
      targetValence: args.target_valence,
      targetDanceability: args.target_danceability,
      limit: args.limit || 10,
    });

    const tracks = result.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      artists: track.artists,
      album: track.album,
      duration_ms: track.duration_ms,
      duration_formatted: formatDuration(track.duration_ms),
      preview_url: track.preview_url,
      spotify_url: track.spotify_url,
      uri: track.uri,
      popularity: track.popularity,
      explicit: track.explicit,
    }));

    return {
      success: true,
      data: { tracks, total: tracks.length },
      message: `Generated ${tracks.length} recommendations`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get recommendations",
    };
  }
}

/**
 * Get user's top tracks
 */
export async function handleGetUserTopTracks(
  args: {
    time_range?: "short_term" | "medium_term" | "long_term";
    limit?: number;
  },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const result = await spotify.getUserTopTracks(
      args.time_range || "medium_term",
      args.limit || 10
    );

    const tracks = result.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      artists: track.artists,
      album: track.album,
      duration_ms: track.duration_ms,
      duration_formatted: formatDuration(track.duration_ms),
      preview_url: track.preview_url,
      spotify_url: track.spotify_url,
      uri: track.uri,
      popularity: track.popularity,
      explicit: track.explicit,
    }));

    const timeRangeText = {
      short_term: "last 4 weeks",
      medium_term: "last 6 months",
      long_term: "all time",
    }[args.time_range || "medium_term"];

    return {
      success: true,
      data: {
        tracks,
        total: tracks.length,
        time_range: args.time_range || "medium_term",
      },
      message: `Found ${tracks.length} top tracks from ${timeRangeText}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get top tracks",
    };
  }
}

/**
 * Get user's top artists
 */
export async function handleGetUserTopArtists(
  args: {
    time_range?: "short_term" | "medium_term" | "long_term";
    limit?: number;
  },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const result = await spotify.getUserTopArtists(
      args.time_range || "medium_term",
      args.limit || 10
    );

    const artists = result.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers,
      followers_formatted: formatNumber(artist.followers),
      spotify_url: artist.spotify_url,
      uri: artist.uri,
      images: artist.images,
    }));

    const timeRangeText = {
      short_term: "last 4 weeks",
      medium_term: "last 6 months",
      long_term: "all time",
    }[args.time_range || "medium_term"];

    return {
      success: true,
      data: {
        artists,
        total: artists.length,
        time_range: args.time_range || "medium_term",
      },
      message: `Found ${artists.length} top artists from ${timeRangeText}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get top artists",
    };
  }
}

/**
 * Create a new playlist
 */
export async function handleCreatePlaylist(
  args: { name: string; description?: string; public?: boolean },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    const playlist = await spotify.createPlaylist(
      args.name,
      args.description,
      args.public || false
    );

    return {
      success: true,
      data: { playlist },
      message: `Created playlist "${playlist.name}"`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create playlist",
    };
  }
}

/**
 * Add track to queue
 */
export async function handleAddToQueue(
  args: { track_uri: string; track_name?: string; device_id?: string },
  spotifyToken: string
): Promise<ToolResult> {
  try {
    const spotify = createSpotifyService(spotifyToken);
    await spotify.addToQueue(args.track_uri, args.device_id);

    return {
      success: true,
      data: { track_uri: args.track_uri },
      message: `Added to queue: ${args.track_name || "Selected track"}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add to queue",
    };
  }
}

// ===== TOOL EXECUTION HANDLER =====

export async function executeSpotifyTool(
  toolName: string,
  args: any,
  spotifyToken: string
): Promise<ToolResult> {
  switch (toolName) {
    case "search_songs":
      return handleSongSearch(args, spotifyToken);

    case "search_artists":
      return handleArtistSearch(args, spotifyToken);

    case "search_albums":
      return handleAlbumSearch(args, spotifyToken);

    case "play_song":
      return handleSongPlay(args, spotifyToken);

    case "get_current_playback":
      return handleGetCurrentPlayback(args, spotifyToken);

    case "control_playback":
      return handlePlaybackControl(args, spotifyToken);

    case "get_recommendations":
      return handleGetRecommendations(args, spotifyToken);

    case "get_user_top_tracks":
      return handleGetUserTopTracks(args, spotifyToken);

    case "get_user_top_artists":
      return handleGetUserTopArtists(args, spotifyToken);

    case "create_playlist":
      return handleCreatePlaylist(args, spotifyToken);

    case "add_to_queue":
      return handleAddToQueue(args, spotifyToken);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format duration from milliseconds to MM:SS format
 */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Extract track ID from Spotify URI
 */
export function extractTrackId(uri: string): string | null {
  const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Extract artist ID from Spotify URI
 */
export function extractArtistId(uri: string): string | null {
  const match = uri.match(/spotify:artist:([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
