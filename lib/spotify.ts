/**
 * Spotify Web API Service
 *
 * Comprehensive integration with Spotify Web API for music discovery,
 * playback control, and user data management.
 */

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  artists: Array<{ id: string; name: string }>;
  album: string;
  duration_ms: number;
  preview_url: string | null;
  spotify_url: string;
  uri: string;
  popularity: number;
  explicit: boolean;
  release_date?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  spotify_url: string;
  uri: string;
  images: Array<{ url: string; height: number; width: number }>;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artist: string;
  artists: Array<{ id: string; name: string }>;
  release_date: string;
  total_tracks: number;
  spotify_url: string;
  uri: string;
  images: Array<{ url: string; height: number; width: number }>;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: string;
  tracks_count: number;
  spotify_url: string;
  uri: string;
  public: boolean;
  images: Array<{ url: string; height: number; width: number }>;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  country: string;
  product: "free" | "premium";
  followers: number;
  images: Array<{ url: string; height: number; width: number }>;
  spotify_url: string;
}

export interface CurrentPlayback {
  is_playing: boolean;
  track?: SpotifyTrack;
  device?: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
    is_active: boolean;
  };
  progress_ms: number;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
  context?: {
    type: "album" | "artist" | "playlist";
    uri: string;
  };
}

export interface RecommendationSeeds {
  seedTracks?: string[];
  seedArtists?: string[];
  seedGenres?: string[];
  targetAcousticness?: number;
  targetDanceability?: number;
  targetEnergy?: number;
  targetValence?: number;
  targetTempo?: number;
  limit?: number;
}

export interface SpotifyError {
  status: number;
  message: string;
  reason?: string;
}

export class SpotifyService {
  private readonly baseUrl = "https://api.spotify.com/v1";
  private readonly accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken || accessToken.trim().length === 0) {
      throw new Error("Spotify access token is required");
    }
    this.accessToken = accessToken.trim();
  }

  /**
   * Make authenticated request to Spotify API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      await this.handleSpotifyError(response);
    }

    return response.json();
  }

  /**
   * Handle Spotify API errors
   */
  private async handleSpotifyError(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: "Unknown error" } };
    }

    const error: SpotifyError = {
      status: response.status,
      message: errorData.error?.message || `HTTP ${response.status}`,
      reason: errorData.error?.reason,
    };

    switch (response.status) {
      case 401:
        throw new Error(`Spotify authentication failed: ${error.message}`);
      case 403:
        throw new Error(`Spotify access forbidden: ${error.message}`);
      case 404:
        throw new Error(`Spotify resource not found: ${error.message}`);
      case 429:
        throw new Error(`Spotify rate limit exceeded: ${error.message}`);
      case 500:
        throw new Error(`Spotify server error: ${error.message}`);
      default:
        throw new Error(
          `Spotify API error (${error.status}): ${error.message}`
        );
    }
  }

  // ===== SEARCH & DISCOVERY =====

  /**
   * Search for tracks on Spotify
   */
  async searchTracks(
    query: string,
    limit: number = 20
  ): Promise<{ tracks: SpotifyTrack[] }> {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query is required");
    }

    const response = await this.makeRequest<any>(
      `/search?q=${encodeURIComponent(
        query.trim()
      )}&type=track&limit=${Math.min(limit, 50)}`
    );

    const tracks: SpotifyTrack[] = response.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      artists: track.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      spotify_url: track.external_urls.spotify,
      uri: track.uri,
      popularity: track.popularity,
      explicit: track.explicit,
      release_date: track.album.release_date,
    }));

    return { tracks };
  }

  /**
   * Search for artists on Spotify
   */
  async searchArtists(
    query: string,
    limit: number = 20
  ): Promise<{ artists: SpotifyArtist[] }> {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query is required");
    }

    const response = await this.makeRequest<any>(
      `/search?q=${encodeURIComponent(
        query.trim()
      )}&type=artist&limit=${Math.min(limit, 50)}`
    );

    const artists: SpotifyArtist[] = response.artists.items.map(
      (artist: any) => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres || [],
        popularity: artist.popularity,
        followers: artist.followers.total,
        spotify_url: artist.external_urls.spotify,
        uri: artist.uri,
        images: artist.images || [],
      })
    );

    return { artists };
  }

  /**
   * Search for albums on Spotify
   */
  async searchAlbums(
    query: string,
    limit: number = 20
  ): Promise<{ albums: SpotifyAlbum[] }> {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query is required");
    }

    const response = await this.makeRequest<any>(
      `/search?q=${encodeURIComponent(
        query.trim()
      )}&type=album&limit=${Math.min(limit, 50)}`
    );

    const albums: SpotifyAlbum[] = response.albums.items.map((album: any) => ({
      id: album.id,
      name: album.name,
      artist: album.artists[0]?.name || "Unknown Artist",
      artists: album.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      spotify_url: album.external_urls.spotify,
      uri: album.uri,
      images: album.images || [],
    }));

    return { albums };
  }

  /**
   * Get music recommendations based on seeds
   */
  async getRecommendations(
    seeds: RecommendationSeeds
  ): Promise<{ tracks: SpotifyTrack[] }> {
    const params = new URLSearchParams();

    if (seeds.seedTracks?.length) {
      params.append("seed_tracks", seeds.seedTracks.slice(0, 5).join(","));
    }
    if (seeds.seedArtists?.length) {
      params.append("seed_artists", seeds.seedArtists.slice(0, 5).join(","));
    }
    if (seeds.seedGenres?.length) {
      params.append("seed_genres", seeds.seedGenres.slice(0, 5).join(","));
    }

    // Add audio features as targets
    if (seeds.targetAcousticness !== undefined) {
      params.append("target_acousticness", seeds.targetAcousticness.toString());
    }
    if (seeds.targetDanceability !== undefined) {
      params.append("target_danceability", seeds.targetDanceability.toString());
    }
    if (seeds.targetEnergy !== undefined) {
      params.append("target_energy", seeds.targetEnergy.toString());
    }
    if (seeds.targetValence !== undefined) {
      params.append("target_valence", seeds.targetValence.toString());
    }
    if (seeds.targetTempo !== undefined) {
      params.append("target_tempo", seeds.targetTempo.toString());
    }

    params.append("limit", Math.min(seeds.limit || 20, 100).toString());

    const response = await this.makeRequest<any>(
      `/recommendations?${params.toString()}`
    );

    const tracks: SpotifyTrack[] = response.tracks.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      artists: track.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      spotify_url: track.external_urls.spotify,
      uri: track.uri,
      popularity: track.popularity,
      explicit: track.explicit,
      release_date: track.album.release_date,
    }));

    return { tracks };
  }

  // ===== USER PROFILE & LIBRARY =====

  /**
   * Get current user's profile
   */
  async getCurrentUser(): Promise<SpotifyUser> {
    const response = await this.makeRequest<any>("/me");

    return {
      id: response.id,
      display_name: response.display_name || response.id,
      email: response.email,
      country: response.country,
      product: response.product,
      followers: response.followers.total,
      images: response.images || [],
      spotify_url: response.external_urls.spotify,
    };
  }

  /**
   * Get user's top tracks
   */
  async getUserTopTracks(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit: number = 20
  ): Promise<{ tracks: SpotifyTrack[] }> {
    const response = await this.makeRequest<any>(
      `/me/top/tracks?time_range=${timeRange}&limit=${Math.min(limit, 50)}`
    );

    const tracks: SpotifyTrack[] = response.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      artists: track.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      spotify_url: track.external_urls.spotify,
      uri: track.uri,
      popularity: track.popularity,
      explicit: track.explicit,
      release_date: track.album.release_date,
    }));

    return { tracks };
  }

  /**
   * Get user's top artists
   */
  async getUserTopArtists(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit: number = 20
  ): Promise<{ artists: SpotifyArtist[] }> {
    const response = await this.makeRequest<any>(
      `/me/top/artists?time_range=${timeRange}&limit=${Math.min(limit, 50)}`
    );

    const artists: SpotifyArtist[] = response.items.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres || [],
      popularity: artist.popularity,
      followers: artist.followers.total,
      spotify_url: artist.external_urls.spotify,
      uri: artist.uri,
      images: artist.images || [],
    }));

    return { artists };
  }

  /**
   * Get user's playlists
   */
  async getUserPlaylists(
    limit: number = 20
  ): Promise<{ playlists: SpotifyPlaylist[] }> {
    const response = await this.makeRequest<any>(
      `/me/playlists?limit=${Math.min(limit, 50)}`
    );

    const playlists: SpotifyPlaylist[] = response.items.map(
      (playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || "",
        owner: playlist.owner.display_name || playlist.owner.id,
        tracks_count: playlist.tracks.total,
        spotify_url: playlist.external_urls.spotify,
        uri: playlist.uri,
        public: playlist.public,
        images: playlist.images || [],
      })
    );

    return { playlists };
  }

  /**
   * Get user's saved tracks
   */
  async getUserSavedTracks(
    limit: number = 20
  ): Promise<{ tracks: SpotifyTrack[] }> {
    const response = await this.makeRequest<any>(
      `/me/tracks?limit=${Math.min(limit, 50)}`
    );

    const tracks: SpotifyTrack[] = response.items.map((item: any) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists[0]?.name || "Unknown Artist",
      artists: item.track.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      album: item.track.album.name,
      duration_ms: item.track.duration_ms,
      preview_url: item.track.preview_url,
      spotify_url: item.track.external_urls.spotify,
      uri: item.track.uri,
      popularity: item.track.popularity,
      explicit: item.track.explicit,
      release_date: item.track.album.release_date,
    }));

    return { tracks };
  }

  // ===== PLAYBACK CONTROL =====

  /**
   * Get current playback state
   */
  async getCurrentPlayback(): Promise<CurrentPlayback | null> {
    try {
      const response = await this.makeRequest<any>("/me/player");

      if (!response || !response.item) {
        return null;
      }

      const track: SpotifyTrack = {
        id: response.item.id,
        name: response.item.name,
        artist: response.item.artists[0]?.name || "Unknown Artist",
        artists: response.item.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
        })),
        album: response.item.album.name,
        duration_ms: response.item.duration_ms,
        preview_url: response.item.preview_url,
        spotify_url: response.item.external_urls.spotify,
        uri: response.item.uri,
        popularity: response.item.popularity,
        explicit: response.item.explicit,
        release_date: response.item.album.release_date,
      };

      return {
        is_playing: response.is_playing,
        track,
        device: response.device
          ? {
              id: response.device.id,
              name: response.device.name,
              type: response.device.type,
              volume_percent: response.device.volume_percent,
              is_active: response.device.is_active,
            }
          : undefined,
        progress_ms: response.progress_ms,
        shuffle_state: response.shuffle_state,
        repeat_state: response.repeat_state,
        context: response.context
          ? {
              type: response.context.type,
              uri: response.context.uri,
            }
          : undefined,
      };
    } catch (error) {
      // No active playback or device
      return null;
    }
  }

  /**
   * Start/resume playback
   */
  async play(options?: {
    uris?: string[];
    context_uri?: string;
    offset?: number;
    device_id?: string;
  }): Promise<void> {
    const body: any = {};

    if (options?.uris) {
      body.uris = options.uris;
    }
    if (options?.context_uri) {
      body.context_uri = options.context_uri;
    }
    if (options?.offset !== undefined) {
      body.offset = { position: options.offset };
    }

    const endpoint = options?.device_id
      ? `/me/player/play?device_id=${options.device_id}`
      : "/me/player/play";

    await this.makeRequest(endpoint, {
      method: "PUT",
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Pause playback
   */
  async pause(device_id?: string): Promise<void> {
    const endpoint = device_id
      ? `/me/player/pause?device_id=${device_id}`
      : "/me/player/pause";

    await this.makeRequest(endpoint, {
      method: "PUT",
    });
  }

  /**
   * Skip to next track
   */
  async skipToNext(device_id?: string): Promise<void> {
    const endpoint = device_id
      ? `/me/player/next?device_id=${device_id}`
      : "/me/player/next";

    await this.makeRequest(endpoint, {
      method: "POST",
    });
  }

  /**
   * Skip to previous track
   */
  async skipToPrevious(device_id?: string): Promise<void> {
    const endpoint = device_id
      ? `/me/player/previous?device_id=${device_id}`
      : "/me/player/previous";

    await this.makeRequest(endpoint, {
      method: "POST",
    });
  }

  /**
   * Set playback volume
   */
  async setVolume(volume: number, device_id?: string): Promise<void> {
    if (volume < 0 || volume > 100) {
      throw new Error("Volume must be between 0 and 100");
    }

    const endpoint = device_id
      ? `/me/player/volume?volume_percent=${volume}&device_id=${device_id}`
      : `/me/player/volume?volume_percent=${volume}`;

    await this.makeRequest(endpoint, {
      method: "PUT",
    });
  }

  /**
   * Add track to playback queue
   */
  async addToQueue(uri: string, device_id?: string): Promise<void> {
    if (!uri || !uri.startsWith("spotify:track:")) {
      throw new Error("Invalid Spotify track URI");
    }

    const endpoint = device_id
      ? `/me/player/queue?uri=${encodeURIComponent(uri)}&device_id=${device_id}`
      : `/me/player/queue?uri=${encodeURIComponent(uri)}`;

    await this.makeRequest(endpoint, {
      method: "POST",
    });
  }

  // ===== PLAYLIST MANAGEMENT =====

  /**
   * Create a new playlist
   */
  async createPlaylist(
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<SpotifyPlaylist> {
    if (!name || name.trim().length === 0) {
      throw new Error("Playlist name is required");
    }

    // Get current user to create playlist under their account
    const user = await this.getCurrentUser();

    const response = await this.makeRequest<any>(
      `/users/${user.id}/playlists`,
      {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description || "",
          public: isPublic,
        }),
      }
    );

    return {
      id: response.id,
      name: response.name,
      description: response.description || "",
      owner: response.owner.display_name || response.owner.id,
      tracks_count: 0,
      spotify_url: response.external_urls.spotify,
      uri: response.uri,
      public: response.public,
      images: response.images || [],
    };
  }

  /**
   * Add tracks to a playlist
   */
  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    if (!playlistId || playlistId.trim().length === 0) {
      throw new Error("Playlist ID is required");
    }

    if (!trackUris || trackUris.length === 0) {
      throw new Error("At least one track URI is required");
    }

    // Validate URIs
    const validUris = trackUris.filter((uri) =>
      uri.startsWith("spotify:track:")
    );
    if (validUris.length === 0) {
      throw new Error("No valid Spotify track URIs provided");
    }

    // Spotify allows max 100 tracks per request
    const chunks = [];
    for (let i = 0; i < validUris.length; i += 100) {
      chunks.push(validUris.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await this.makeRequest(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({
          uris: chunk,
        }),
      });
    }
  }
}

/**
 * Create SpotifyService instance with token validation
 */
export function createSpotifyService(accessToken: string): SpotifyService {
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Valid Spotify access token is required");
  }

  return new SpotifyService(accessToken);
}
