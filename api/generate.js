export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Get the Replicate API token from environment variables
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN');
    return res.status(500).json({ error: 'Server configuration error: missing API token' });
  }

  // Use a fast, free-credit model (lightricks/ltx-2-fast)
  const model = "lightricks/ltx-2-fast";
  const input = { prompt, num_frames: 24, fps: 8 };

  try {
    // 1. Start the prediction on Replicate
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version: model, input }),
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error(`Replicate start error: ${startResponse.status} - ${errorText}`);
      return res.status(500).json({ error: `Replicate API error: ${startResponse.status}` });
    }

    const { id } = await startResponse.json();

    // 2. Poll until completion (max 8 seconds to stay within Vercel free tier limit)
    let prediction = { status: "starting" };
    let attempts = 0;
    const maxAttempts = 8;
    while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
      });
      if (pollResponse.ok) {
        prediction = await pollResponse.json();
      }
      attempts++;
    }

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "Prediction failed");
    }
    if (prediction.status !== "succeeded") {
      throw new Error("Generation timed out. Try a shorter prompt.");
    }

    // 3. Get the generated video URL and convert to base64 for frontend download
    const videoUrl = prediction.output;
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    const base64 = buffer.toString('base64');

    return res.status(200).json({ videoUrl: `data:video/mp4;base64,${base64}` });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
