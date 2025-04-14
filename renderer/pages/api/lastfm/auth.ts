import { NextApiRequest, NextApiResponse } from "next";
import { LASTFM_CONFIG } from "../config";
import { createFormData, getMD5Auth, generateSignature } from "../utils/lastfm";

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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    // Step 1: Get authentication token
    const authToken = getMD5Auth(username, password);

    // Step 2: Get mobile session (Password flow is used for desktop apps)
    const params = {
      method: "auth.getMobileSession",
      username: username,
      password: password,
      api_key: LASTFM_CONFIG.API_KEY,
    };

    // Add API signature for authenticated requests
    params["api_sig"] = generateSignature(params);
    params["format"] = "json";

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

    // Return the session key
    return res.status(200).json({
      success: true,
      session: data.session,
    });
  } catch (error) {
    console.error("Last.fm authentication error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred during authentication",
    });
  }
}
