import { InferenceClient } from "@huggingface/inference";

// Use the HF_TOKEN you already set in your Vercel Environment Variables
const client = new InferenceClient(process.env.HF_TOKEN);

export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Extract the prompt from the request body
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // 3. Call the Hugging Face Inference API
  //    Using a well-known, free text-to-video model.
  try {
    // This is the key part. We tell the API to generate the video,
    // but we don't wait for it to finish.
    const blob = await client.textToVideo({
      model: 'damo-vilab/text-to-video-ms-1.7b',
      inputs: prompt,
    });

    // Convert the returned video data into a format the frontend can use
    const buffer = Buffer.from(await blob.arrayBuffer());
    const base64 = buffer.toString('base64');
    const videoUrl = `data:video/mp4;base64,${base64}`;

    // Return the video URL to the frontend immediately.
    return res.status(200).json({ videoUrl });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: 'Failed to generate video' });
  }
}
