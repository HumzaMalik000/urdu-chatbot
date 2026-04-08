export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // ============================================
    // 🔍 CHECK IF MESSAGE IS IN PURE URDU SCRIPT
    // ============================================
    
    // Urdu Unicode range: \u0600-\u06FF, \u0750-\u077F, \uFB50-\uFDFF, \uFE70-\uFEFF
    const urduRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    
    // Check if message contains Urdu script characters
    const hasUrduScript = urduRegex.test(message);
    
    // Check if message contains English/Roman characters (a-z, A-Z)
    const hasEnglishLetters = /[a-zA-Z]/.test(message);
    
    // If message has NO Urdu script OR has English letters, reject it
    if (!hasUrduScript || hasEnglishLetters) {
        return res.status(200).json({ 
            reply: "❌ معاف کیجیے! یہ چیٹ بوٹ صرف خالص اردو رسم الخط میں لکھے گئے سوالات کا جواب دیتا ہے۔\n\nبراہ کرم اپنا سوال صرف اردو حروف میں لکھیں۔\n\nمثال: 'آپ کیسے ہیں؟' (یہ درست ہے)\nغلط: 'aap kaise hain' (یہ رومن اردو ہے)\n\nشکریہ!"
        });
    }

    // Get Groq API key from Vercel environment variables
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    // Build conversation history for Groq
    const messages = [];

    // System instruction - Strictly enforce Urdu script only
    messages.push({
        role: 'system',
        content: `آپ ایک ذہین اردو چیٹ بوٹ ہیں جس کا نام "اردو معاون" ہے۔ آپ کو حمزہ ملک نے بنایا ہے۔

⚠️ انتہائی اہم قاعدہ:
آپ صرف اور صرف اُن صارفین کو جواب دیں گے جو خالص اردو رسم الخط میں سوال پوچھیں۔

❌ اگر صارف نے رومن اردو (جیسے "aap kaise hain") میں لکھا تو آپ جواب نہ دیں۔
❌ اگر صارف نے انگریزی میں لکھا تو آپ جواب نہ دیں۔
✅ صرف خالص اردو حروف میں لکھے گئے سوالات کا جواب دیں۔

جواب دینے کے قوانین:
- ہمیشہ خالص اردو رسم الخط میں جواب دیں۔
- دوستانہ، مددگار اور احترام کے ساتھ بات کریں۔
- جوابات مختصر اور واضح رکھیں۔
- اسلامی آداب کا خیال رکھیں۔`
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
                    model: 'llama-3.3-70b-versatile',
                    messages: messages,
                    temperature: 0.3,
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

        let reply = data.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({ error: 'No response received from Groq' });
        }

        res.status(200).json({ reply });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
}
