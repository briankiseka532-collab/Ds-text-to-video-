export default async function handler(req, res) {
  // Allow CORS (optional, but good)
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Real, working sample video URL
  const sampleVideoUrl = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';

  try {
    const videoRes = await fetch(sampleVideoUrl);
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const base64 = buffer.toString('base64');
    const videoDataUrl = `data:video/mp4;base64,${base64}`;

    return res.status(200).json({ videoUrl: videoDataUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
