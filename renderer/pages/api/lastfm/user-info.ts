import type { NextApiRequest, NextApiResponse } from "next";
import { LASTFM_CONFIG } from "../config";
import { generateSignature } from "../utils/lastfm";

type UserInfoResponse = {
  success: boolean;
  user?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserInfoResponse>,
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { username, sessionKey } = req.query;

    if (!username) {
      return res
        .status(400)
        .json({ success: false, error: "Username is required" });
    }

    // Set up parameters for Last.fm user info request
    const params: Record<string, string> = {
      method: "user.getInfo",
      user: username as string,
      api_key: LASTFM_CONFIG.API_KEY,
    };

    // Add session key if provided for additional user data
    if (sessionKey) {
      params.sk = sessionKey as string;
      params.api_sig = generateSignature(params);
    }

    params.format = "json";

    // Construct query string
    const queryString = new URLSearchParams(params).toString();

    // Make the request to Last.fm
    const response = await fetch(`${LASTFM_CONFIG.API_URL}?${queryString}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        success: false,
        error: `Last.fm error ${data.error}: ${data.message}`,
      });
    }

    // Return user info
    return res.status(200).json({
      success: true,
      user: data.user,
    });
  } catch (error) {
    console.error("Last.fm user info error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while fetching user information",
    });
  }
}
