import { NextApiRequest, NextApiResponse } from "next";
import { LASTFM_CONFIG } from "../config";
import { createFormData, generateSignature } from "../utils/lastfm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // This endpoint requires a POST request
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionKey, artist, track, album, duration } = req.body;

    if (!sessionKey || !artist || !track) {
      return res.status(400).json({
        success: false,
        error: "Session key, artist, and track are required",
      });
    }

    // Create parameters for the Last.fm API
    const params: Record<string, string> = {
      method: "track.updateNowPlaying",
      artist,
      track,
      sk: sessionKey,
      api_key: LASTFM_CONFIG.API_KEY,
    };

    // Add optional parameters if available
    if (album) params.album = album;
    if (duration) params.duration = duration;

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
      nowplaying: data.nowplaying,
    });
  } catch (error) {
    console.error("Last.fm now playing update error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while updating now playing status",
    });
  }
}
