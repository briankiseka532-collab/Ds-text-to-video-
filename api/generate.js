export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'Missing REPLICATE_API_TOKEN' });
  }

  const model = "lightricks/ltx-2-fast";
  const input = { prompt, num_frames: 24, fps: 8 };

  try {
    // Start prediction
    const start = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version: model, input }),
    });
    const { id } = await start.json();

    // Poll for completion (max 15 seconds)
    let prediction = { status: "starting" };
    let attempts = 0;
    while (prediction.status !== "succeeded" && attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` },
      });
      prediction = await poll.json();
      attempts++;
    }

    if (prediction.status !== "succeeded") {
      throw new Error(prediction.error || "Generation failed");
    }

    const videoUrl = prediction.output;
    const videoRes = await fetch(videoUrl);
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const base64 = buffer.toString('base64');
    res.json({ videoUrl: `data:video/mp4;base64,${base64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
