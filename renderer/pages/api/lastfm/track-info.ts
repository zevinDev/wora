import { NextApiRequest, NextApiResponse } from "next";
import { LASTFM_CONFIG } from "../config";
import { createFormData, generateSignature } from "../utils/lastfm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      // Handle GET request for track info
      const { artist, track, username } = req.query;

      if (!artist || !track) {
        return res.status(400).json({
          success: false,
          error: "Artist and track parameters are required",
        });
      }

      // Create parameters for the Last.fm API
      const params: Record<string, string> = {
        method: "track.getInfo",
        artist: artist as string,
        track: track as string,
        api_key: LASTFM_CONFIG.API_KEY,
        format: "json",
      };

      // Add username if available to get user-specific data (like loved status)
      if (username) {
        params.username = username as string;
      }

      // Make the request
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${LASTFM_CONFIG.API_URL}?${queryString}`);
      const data = await response.json();

      if (data.error) {
        return res.status(400).json({
          success: false,
          error: `Last.fm error ${data.error}: ${data.message}`,
        });
      }

      // Return success response
      return res.status(200).json({
        success: true,
        track: data.track,
      });
    } else if (req.method === "POST") {
      // Handle POST request for track love/unlove
      const { sessionKey, artist, track, action } = req.body;

      if (!sessionKey || !artist || !track || !action) {
        return res.status(400).json({
          success: false,
          error: "Session key, artist, track, and action are required",
        });
      }

      if (action !== "love" && action !== "unlove") {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be "love" or "unlove"',
        });
      }

      // Create parameters for the Last.fm API
      const params: Record<string, string> = {
        method: `track.${action}`,
        artist,
        track,
        sk: sessionKey,
        api_key: LASTFM_CONFIG.API_KEY,
      };

      // Add API signature for authenticated requests
      params.api_sig = generateSignature(params);
      params.format = "json";

      // Create form data
      const formData = createFormData(params);

      // Make the request
      const response = await fetch(LASTFM_CONFIG.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.error) {
        return res.status(400).json({
          success: false,
          error: `Last.fm error ${data.error}: ${data.message}`,
        });
      }

      // Return success response
      return res.status(200).json({
        success: true,
        action: action,
      });
    } else {
      return res
        .status(405)
        .json({ success: false, error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Last.fm track info error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred processing the track request",
    });
  }
}
