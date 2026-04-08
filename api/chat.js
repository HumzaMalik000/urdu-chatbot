export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // ✅ API key is read from Vercel environment variables — never exposed to browser
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    // Build conversation history for Gemini (multi-turn context)
    const contents = [];

    if (history && Array.isArray(history)) {
        history.forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        });
    }

    // Add the latest user message
    contents.push({
        role: 'user',
        parts: [{ text: message }]
    });

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: {
                        parts: [{
                            text: `آپ ایک ذہین اردو چیٹ بوٹ ہیں جس کا نام "اردو معاون" ہے۔ آپ کو حمزہ ملک نے بنایا ہے۔

قوانین:
- ہمیشہ اردو میں جواب دیں۔ اگر صارف انگریزی میں پوچھے تب بھی اردو میں جواب دیں۔
- دوستانہ، مددگار اور احترام کے ساتھ بات کریں۔
- جوابات مختصر اور واضح رکھیں۔
- اسلامی آداب کا خیال رکھیں۔
- اگر کوئی بات نامناسب ہو تو شائستگی سے انکار کریں۔
- موسم، لطیفے، شاعری، عمومی علم، مشورے — سب اردو میں دیں۔`
                        }]
                    },
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', data);
            return res.status(response.status).json({
                error: data.error?.message || 'Gemini API error'
            });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            return res.status(500).json({ error: 'No response received from Gemini' });
        }

        res.status(200).json({ reply });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
}
