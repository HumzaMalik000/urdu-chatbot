export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Get Groq API key from Vercel environment variables
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    // Build conversation history for Groq
    const messages = [];

    // System instruction (bot's personality in Urdu)
    messages.push({
        role: 'system',
        content: `آپ ایک ذہین اردو چیٹ بوٹ ہیں جس کا نام "اردو معاون" ہے۔ آپ کو حمزہ ملک نے بنایا ہے۔

قوانین:
- ہمیشہ اردو میں جواب دیں۔ اگر صارف انگریزی میں پوچھے تب بھی اردو میں جواب دیں۔
- دوستانہ، مددگار اور احترام کے ساتھ بات کریں۔
- جوابات مختصر اور واضح رکھیں۔
- اسلامی آداب کا خیال رکھیں۔
- اگر کوئی بات نامناسب ہو تو شائستگی سے انکار کریں۔
- موسم، لطیفے، شاعری، عمومی علم، مشورے — سب اردو میں دیں۔`
    });

    // Add conversation history
    if (history && Array.isArray(history)) {
        history.forEach(msg => {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        });
    }

    // Add the latest user message
    messages.push({
        role: 'user',
        content: message
    });

    try {
        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',  // Best for Urdu
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1024,
                    top_p: 0.95
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Groq API error:', data);
            return res.status(response.status).json({
                error: data.error?.message || 'Groq API error'
            });
        }

        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({ error: 'No response received from Groq' });
        }

        res.status(200).json({ reply });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
}
