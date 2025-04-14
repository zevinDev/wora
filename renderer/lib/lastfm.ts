// Last.fm Client for Electron - uses IPC to securely communicate with the backend API

// Types
interface Song {
  id?: number;
  name: string;
  artist: string;
  album?: {
    id?: number;
    name: string;
    artist?: string;
    cover?: string;
  };
  duration?: number;
}

// Internal state
let sessionKey: string | null = null;
let username: string | null = null;

/**
 * Initialize Last.fm with username and password
 * This sends the credentials through the IPC channel to the backend API
 */
export const initializeLastFM = async (
  lastfmUsername: string,
  password: string,
): Promise<boolean> => {
  try {
    console.log(`[Last.fm] Initializing Last.fm for ${lastfmUsername}`);

    const response = await window.ipc.invoke(
      "lastfm:authenticate",
      lastfmUsername,
      password,
    );

    if (response.success && response.session) {
      sessionKey = response.session.key;
      username = response.session.name;
      console.log(`[Last.fm] Initialized successfully for ${username}`);
      return true;
    } else {
      console.error("[Last.fm] Authentication failed:", response.error);
      return false;
    }
  } catch (error) {
    console.error("[Last.fm] Error initializing:", error);
    return false;
  }
};

/**
 * Initialize Last.fm with existing session key
 */
export const initializeLastFMWithSession = (
  key: string,
  user: string,
): void => {
  sessionKey = key;
  username = user;
  console.log(`[Last.fm] Initialized with session for ${username}`);
};

/**
 * Check if Last.fm is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!sessionKey;
};

/**
 * Get the current session key
 */
export const getSessionKey = (): string | null => {
  return sessionKey;
};

/**
 * Clear the Last.fm session
 */
export const logout = (): void => {
  sessionKey = null;
  username = null;
  console.log("[Last.fm] Logged out");
};

/**
 * Update Now Playing status on Last.fm
 */
export const updateNowPlaying = async (song: Song): Promise<boolean> => {
  if (!sessionKey) {
    console.warn("[Last.fm] Not authenticated, cannot update now playing");
    return false;
  }

  try {
    console.log(
      `[Last.fm] Updating now playing: ${song.artist} - ${song.name}`,
    );
    const response = await window.ipc.invoke("lastfm:updateNowPlaying", {
      sessionKey,
      artist: song.artist,
      track: song.name,
      album: song.album?.name,
      duration: song.duration
        ? Math.floor(song.duration).toString()
        : undefined,
    });

    if (response.success) {
      console.log("[Last.fm] Now playing updated successfully");
      return true;
    } else {
      console.error("[Last.fm] Failed to update now playing:", response.error);
      return false;
    }
  } catch (error) {
    console.error("[Last.fm] Error updating now playing:", error);
    return false;
  }
};

/**
 * Scrobble a track to Last.fm
 */
export const scrobbleTrack = async (song: Song): Promise<boolean> => {
  if (!sessionKey) {
    console.warn("[Last.fm] Not authenticated, cannot scrobble");
    return false;
  }

  try {
    console.log(`[Last.fm] Scrobbling track: ${song.artist} - ${song.name}`);
    const response = await window.ipc.invoke("lastfm:scrobbleTrack", {
      sessionKey,
      artist: song.artist,
      track: song.name,
      album: song.album?.name,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      duration: song.duration
        ? Math.floor(song.duration).toString()
        : undefined,
    });

    if (response.success) {
      console.log("[Last.fm] Track scrobbled successfully");
      return true;
    } else {
      console.error("[Last.fm] Failed to scrobble track:", response.error);
      return false;
    }
  } catch (error) {
    console.error("[Last.fm] Error scrobbling track:", error);
    return false;
  }
};

/**
 * Get user information from Last.fm
 */
export const getUserInfo = async (): Promise<any> => {
  if (!username || !sessionKey) {
    console.warn("[Last.fm] Not authenticated, cannot get user info");
    return null;
  }

  try {
    console.log(`[Last.fm] Getting user info for ${username}`);
    const response = await window.ipc.invoke(
      "lastfm:getUserInfo",
      username,
      sessionKey,
    );

    if (response.success) {
      return response.user;
    } else {
      console.error("[Last.fm] Failed to get user info:", response.error);
      return null;
    }
  } catch (error) {
    console.error("[Last.fm] Error getting user info:", error);
    return null;
  }
};

/**
 * Get track information from Last.fm
 */
export const getTrackInfo = async (
  artist: string,
  track: string,
): Promise<any> => {
  try {
    const response = await window.ipc.invoke(
      "lastfm:getTrackInfo",
      artist,
      track,
      username,
    );

    if (response.success) {
      return response.track;
    } else {
      console.error("[Last.fm] Failed to get track info:", response.error);
      return null;
    }
  } catch (error) {
    console.error("[Last.fm] Error getting track info:", error);
    return null;
  }
};

/**
 * Love a track on Last.fm
 */
export const loveTrack = async (
  artist: string,
  track: string,
): Promise<boolean> => {
  if (!sessionKey) {
    console.warn("[Last.fm] Not authenticated, cannot love track");
    return false;
  }

  try {
    const response = await window.ipc.invoke("lastfm:loveTrack", {
      sessionKey,
      artist,
      track,
      love: true,
    });

    return response.success;
  } catch (error) {
    console.error("[Last.fm] Error loving track:", error);
    return false;
  }
};

/**
 * Unlove a track on Last.fm
 */
export const unloveTrack = async (
  artist: string,
  track: string,
): Promise<boolean> => {
  if (!sessionKey) {
    console.warn("[Last.fm] Not authenticated, cannot unlove track");
    return false;
  }

  try {
    const response = await window.ipc.invoke("lastfm:loveTrack", {
      sessionKey,
      artist,
      track,
      love: false,
    });

    return response.success;
  } catch (error) {
    console.error("[Last.fm] Error unloving track:", error);
    return false;
  }
};

/**
 * Check if a track is loved by the user
 */
export const isTrackLoved = async (
  artist: string,
  track: string,
): Promise<boolean> => {
  try {
    const trackInfo = await getTrackInfo(artist, track);
    return trackInfo && trackInfo.userloved === "1";
  } catch (error) {
    console.error("[Last.fm] Error checking if track is loved:", error);
    return false;
  }
};
