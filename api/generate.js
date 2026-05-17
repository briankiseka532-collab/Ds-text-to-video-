export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400). json({ error: 'Prompt is required' });
  }

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'Missing REPLICATE_API_TOKEN' });
  }

  // Model that generates short videos from text (fast, good quality)
  const model = "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438";

  try {
    // 1. Start the prediction
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: model,
        input: { prompt: prompt, frames_per_second: 8, num_frames: 24 },
      }),
    });

    const startData = await startResponse.json();
    if (startData.error) throw new Error(startData.error);

    const predictionId = startData.id;

    // 2. Poll until completed (Vercel max 10s, so we need to poll quickly)
    let prediction = startData;
    let attempts = 0;
    const maxAttempts = 30; // ~30 seconds
    while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
      });
      prediction = await pollResponse.json();
      attempts++;
    }

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "Prediction failed");
    }
    if (prediction.status !== "succeeded") {
      return res.status(504).json({ error: "Generation timed out. Try again." });
    }

    const videoUrl = prediction.output;
    // Convert to base64 for download on phone
    const videoResponse = await fetch(videoUrl);
    const arrayBuffer = await videoResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const finalVideoUrl = `data:video/mp4;base64,${base64}`;

    return res.status(200).json({ videoUrl: finalVideoUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
