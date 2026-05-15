// This is a Serverless Function for Vercel
export default async function handler(req, res) {
    // 1. Allow only POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
        return res.status(500).json({ error: 'Server not configured: missing HF_TOKEN' });
    }

    // 2. Call Hugging Face API to generate video
    try {
        const response = await fetch(
            'https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${hfToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: prompt }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Hugging Face error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ error: `Hugging Face API error: ${response.status}` });
        }

        // 3. Get the video buffer and convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const videoUrl = `data:video/mp4;base64,${base64}`;

        // 4. Send the video URL back to the frontend
        return res.status(200).json({ videoUrl });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
