import { ipcMain } from "electron";
import fetch from "node-fetch";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";

// Debug logging
const enableDebug = true;
const logLastFm = (message: string, data?: any) => {
  if (enableDebug) {
    console.log(`[LastFm Service] ${message}`, data || "");
  }
};

// Configuration for Last.fm API
const API_URL = "https://ws.audioscrobbler.com/2.0/";

// Load environment variables from .env.local for development mode
const loadEnvVariables = () => {
  try {
    const envPath = path.join(process.cwd(), ".env.local");

    if (fs.existsSync(envPath)) {
      logLastFm(`Loading environment variables from ${envPath}`);
      const envContent = fs.readFileSync(envPath, "utf-8");
      const envLines = envContent.split("\n");

      envLines.forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";

          // Remove quotes if present
          if (
            value.length > 0 &&
            value.charAt(0) === '"' &&
            value.charAt(value.length - 1) === '"'
          ) {
            value = value.replace(/^"|"$/g, "");
          }

          process.env[key] = value;
          logLastFm(`Loaded environment variable: ${key}`);
        }
      });

      return true;
    }
    return false;
  } catch (error) {
    logLastFm("Error loading environment variables:", error);
    return false;
  }
};

// Load environment variables in development mode
if (process.env.NODE_ENV !== "production") {
  loadEnvVariables();
}

// Get API keys from environment variables
const DEV_API_KEY = process.env.LASTFM_API_KEY || "";
const DEV_API_SECRET = process.env.LASTFM_API_SECRET || "";

// Log API key status
if (process.env.NODE_ENV !== "production") {
  if (!DEV_API_KEY || !DEV_API_SECRET) {
    logLastFm(
      "WARNING: Last.fm API credentials not found in environment variables.",
    );
    logLastFm(
      "Please add LASTFM_API_KEY and LASTFM_API_SECRET to your .env.local file.",
    );
  } else {
    logLastFm("Last.fm API credentials loaded from environment variables.");
  }
}

// Should we use embedded API keys or the backend?
// We'll use embedded API keys in development and backend in production
const useBackend = process.env.NODE_ENV === "production";

// Get the backend URL based on environment
const getBackendUrl = (): string => {
  // In production, use the Vercel deployment URL
  if (process.env.NODE_ENV === "production") {
    return "https://wora-ten.vercel.app/";
  }
  // In development, try to use localhost
  return "http://localhost:3000";
};

/**
 * Forward Last.fm requests to the Vercel backend
 * @param endpoint The API endpoint path
 * @param method HTTP method
 * @param body Request body (for POST requests)
 * @returns Response from the backend
 */
const forwardToBackend = async (
  endpoint: string,
  method: string = "GET",
  body?: any,
) => {
  try {
    // Get the backend URL
    const baseUrl = getBackendUrl();

    const url = `${baseUrl}/api/lastfm/${endpoint}`;
    logLastFm(`Forwarding request to: ${url}`, { method });

    const options: any = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    logLastFm(`Error forwarding request to backend:`, error);
    return {
      success: false,
      error: "Failed to communicate with the backend API",
    };
  }
};

/**
 * Generate a signature for Last.fm API
 * This is used when calling Last.fm API directly in development mode
 */
const generateSignature = (params: Record<string, string>): string => {
  // Remove format and callback parameters
  const filteredParams = { ...params };
  delete filteredParams.format;
  delete filteredParams.callback;

  // Sort parameters alphabetically by name
  const sortedKeys = Object.keys(filteredParams).sort();

  // Concatenate parameters
  let signatureStr = "";
  for (const key of sortedKeys) {
    signatureStr += key + filteredParams[key];
  }

  // Append secret
  signatureStr += DEV_API_SECRET;

  // Create MD5 hash
  return crypto.createHash("md5").update(signatureStr).digest("hex");
};

/**
 * Make a direct request to Last.fm API
 * This is used in development mode when not using the backend
 */
const makeLastFmRequest = async (
  params: Record<string, string>,
  isAuthRequest: boolean = false,
): Promise<any> => {
  try {
    // Always add these parameters
    const requestParams: Record<string, string> = {
      ...params,
      api_key: DEV_API_KEY,
      format: "json",
    };

    // If this is an authenticated request, add signature
    if (isAuthRequest) {
      requestParams.api_sig = generateSignature(requestParams);
    }

    // Build query string
    const queryString = Object.entries(requestParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    // Make the request
    const url = `${API_URL}?${queryString}`;
    logLastFm(`Making direct API request: ${url}`);

    const response = await fetch(url, {
      method: "POST",
    });

    const data = await response.json();

    // Check for errors
    if (data.error) {
      logLastFm(`API Error ${data.error}: ${data.message}`);
      return {
        success: false,
        error: data.message,
        code: data.error,
      };
    }

    return data;
  } catch (error) {
    logLastFm("Error making Last.fm API request:", error);
    return {
      success: false,
      error: "Error making Last.fm API request",
    };
  }
};

/**
 * Generate MD5 hash for password authentication
 */
const getMD5Auth = (username: string, password: string): string => {
  const authString = username.toLowerCase() + password;
  return crypto.createHash("md5").update(authString).digest("hex");
};

/**
 * Initialize Last.fm IPC handlers
 */
export const initializeLastFmHandlers = () => {
  // Handle authentication requests
  ipcMain.handle(
    "lastfm:authenticate",
    async (_, username: string, password: string) => {
      try {
        logLastFm(`Authenticating user: ${username}`);

        // In production, use the backend API
        if (useBackend) {
          // Forward authentication to backend
          const response = await forwardToBackend("auth", "POST", {
            username,
            password,
          });

          if (!response.success) {
            logLastFm("Authentication error:", response.error);
          }

          return response;
        }
        // In development, call Last.fm API directly
        else {
          // Use the mobile session API for desktop auth
          const params = {
            method: "auth.getMobileSession",
            username: username,
            password: password,
          };

          const response = await makeLastFmRequest(params, true);

          if (response.error) {
            return {
              success: false,
              error: response.error,
            };
          }

          // Return success with session
          return {
            success: true,
            session: response.session,
          };
        }
      } catch (error) {
        logLastFm("Error in authentication:", error);
        return {
          success: false,
          error: "Internal error during authentication",
        };
      }
    },
  );

  // Handle "now playing" updates
  ipcMain.handle("lastfm:updateNowPlaying", async (_, data) => {
    try {
      const { sessionKey, artist, track, album, duration } = data;

      if (!sessionKey || !artist || !track) {
        return { success: false, error: "Missing required parameters" };
      }

      logLastFm(`Updating now playing: "${artist} - ${track}"`);

      // Use backend or direct API based on environment
      if (useBackend) {
        // Forward now playing update to backend
        const response = await forwardToBackend("now-playing", "POST", data);

        if (!response.success) {
          logLastFm("Error updating now playing:", response.error);
        }

        return response;
      } else {
        // Call Last.fm API directly
        const params: Record<string, string> = {
          method: "track.updateNowPlaying",
          artist,
          track,
          sk: sessionKey,
        };

        // Add optional parameters if available
        if (album) params.album = album;
        if (duration) params.duration = duration;

        const response = await makeLastFmRequest(params, true);

        if (response.error) {
          return {
            success: false,
            error: response.message || "Failed to update now playing",
          };
        }

        return {
          success: true,
        };
      }
    } catch (error) {
      logLastFm("Error in updateNowPlaying:", error);
      return {
        success: false,
        error: "Internal error updating now playing status",
      };
    }
  });

  // Handle track scrobbling
  ipcMain.handle("lastfm:scrobbleTrack", async (_, data) => {
    try {
      const { sessionKey, artist, track, album, timestamp, duration } = data;

      if (!sessionKey || !artist || !track) {
        return { success: false, error: "Missing required parameters" };
      }

      logLastFm(`Scrobbling track: "${artist} - ${track}"`);

      // Use backend or direct API based on environment
      if (useBackend) {
        // Forward scrobble to backend
        const response = await forwardToBackend("scrobble", "POST", data);

        if (!response.success) {
          logLastFm("Error scrobbling track:", response.error);
        }

        return response;
      } else {
        // Call Last.fm API directly
        const params: Record<string, string> = {
          method: "track.scrobble",
          artist,
          track,
          timestamp: timestamp || Math.floor(Date.now() / 1000).toString(),
          sk: sessionKey,
        };

        // Add optional parameters if available
        if (album) params.album = album;
        if (duration) params.duration = duration;

        const response = await makeLastFmRequest(params, true);

        if (response.error) {
          return {
            success: false,
            error: response.message || "Failed to scrobble track",
          };
        }

        return {
          success: true,
        };
      }
    } catch (error) {
      logLastFm("Error in scrobbleTrack:", error);
      return { success: false, error: "Internal error scrobbling track" };
    }
  });

  // Handle get user info
  ipcMain.handle("lastfm:getUserInfo", async (_, username, sessionKey) => {
    try {
      if (!username) {
        return { success: false, error: "Username is required" };
      }

      logLastFm(`Getting user info for: ${username}`);

      // Use backend or direct API based on environment
      if (useBackend) {
        // Forward user info request to backend
        const response = await forwardToBackend(
          `user-info?username=${encodeURIComponent(username)}&sessionKey=${encodeURIComponent(sessionKey || "")}`,
        );

        if (!response.success) {
          logLastFm("Error getting user info:", response.error);
        }

        return response;
      } else {
        // Call Last.fm API directly
        const params: Record<string, string> = {
          method: "user.getInfo",
          user: username,
        };

        // Add session key if available for private data
        if (sessionKey) params.sk = sessionKey;

        const response = await makeLastFmRequest(params, !!sessionKey);

        if (response.error) {
          return {
            success: false,
            error: response.message || "Failed to get user info",
          };
        }

        return {
          success: true,
          user: response.user,
        };
      }
    } catch (error) {
      logLastFm("Error in getUserInfo:", error);
      return { success: false, error: "Internal error getting user info" };
    }
  });

  // Handle get track info
  ipcMain.handle("lastfm:getTrackInfo", async (_, artist, track, username) => {
    try {
      if (!artist || !track) {
        return { success: false, error: "Artist and track are required" };
      }

      // Use backend or direct API based on environment
      if (useBackend) {
        // Create query string
        let query = `artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`;
        if (username) {
          query += `&username=${encodeURIComponent(username)}`;
        }

        // Forward track info request to backend
        const response = await forwardToBackend(`track-info?${query}`);

        if (!response.success) {
          logLastFm("Error getting track info:", response.error);
        }

        return response;
      } else {
        // Call Last.fm API directly
        const params: Record<string, string> = {
          method: "track.getInfo",
          artist,
          track,
        };

        // Add username if available for loved status
        if (username) params.username = username;

        const response = await makeLastFmRequest(params, false);

        if (response.error) {
          return {
            success: false,
            error: response.message || "Failed to get track info",
          };
        }

        return {
          success: true,
          track: response.track,
        };
      }
    } catch (error) {
      logLastFm("Error in getTrackInfo:", error);
      return { success: false, error: "Internal error getting track info" };
    }
  });

  // Handle love/unlove track
  ipcMain.handle("lastfm:loveTrack", async (_, data) => {
    try {
      const { sessionKey, artist, track, love } = data;

      if (!sessionKey || !artist || !track || love === undefined) {
        return { success: false, error: "Missing required parameters" };
      }

      const action = love ? "love" : "unlove";

      // Use backend or direct API based on environment
      if (useBackend) {
        // Forward love/unlove request to backend
        const response = await forwardToBackend("track-action", "POST", {
          sessionKey,
          artist,
          track,
          action,
        });

        if (!response.success) {
          logLastFm(`Error ${action} track:`, response.error);
        }

        return response;
      } else {
        // Call Last.fm API directly
        const params: Record<string, string> = {
          method: `track.${action}`,
          artist,
          track,
          sk: sessionKey,
        };

        const response = await makeLastFmRequest(params, true);

        if (response.error) {
          return {
            success: false,
            error: response.message || `Failed to ${action} track`,
          };
        }

        return {
          success: true,
        };
      }
    } catch (error) {
      logLastFm("Error in loveTrack:", error);
      return {
        success: false,
        error: `Internal error processing track love/unlove`,
      };
    }
  });

  logLastFm("Last.fm IPC handlers initialized");
  logLastFm(
    `Using ${useBackend ? "backend API" : "direct API calls"} for Last.fm`,
  );
};
