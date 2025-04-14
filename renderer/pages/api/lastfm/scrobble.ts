import type { NextApiRequest, NextApiResponse } from "next";
import { LASTFM_CONFIG } from "../config";
import { generateSignature, createFormData } from "../utils/lastfm";

type ScrobbleResponse = {
  success: boolean;
  message?: string;
  error?: string;
  scrobbles?: any; // Adjust the type of scrobbles based on the expected structure
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScrobbleResponse>,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionKey, artist, track, album, timestamp, duration } = req.body;

    if (!sessionKey || !artist || !track || !timestamp) {
      return res.status(400).json({
        success: false,
        error: "Session key, artist, track, and timestamp are required",
      });
    }

    // Set up parameters for Last.fm scrobble request
    const params: Record<string, string> = {
      method: "track.scrobble",
      artist,
      track,
      timestamp,
      sk: sessionKey,
      api_key: LASTFM_CONFIG.API_KEY,
    };

    // Add optional album parameter if provided
    if (album) {
      params.album = album;
    }

    if (duration) {
      params.duration = duration;
    }

    // Add API signature for authenticated requests
    params.api_sig = generateSignature(params);
    params.format = "json";

    // Make the request to Last.fm
    const response = await fetch(LASTFM_CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: createFormData(params).toString(),
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
      scrobbles: data.scrobbles,
    });
  } catch (error) {
    console.error("Last.fm scrobble error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while scrobbling the track",
    });
  }
}
