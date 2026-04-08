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

    // System instruction (bot's personality in Urdu) - STRICTLY ENFORCED
    messages.push({
        role: 'system',
        content: `آپ ایک ذہین اردو چیٹ بوٹ ہیں جس کا نام "اردو معاون" ہے۔ آپ کو حمزہ ملک نے بنایا ہے۔

⚠️ سب سے اہم قاعدہ - سختی سے نافذ کریں:
آپ کو صرف اور صرف اردو رسم الخط (Urdu script) میں جواب دینا ہے۔ رومن اردو (انگریزی حروف میں اردو) بالکل استعمال نہ کریں۔

❌ ممنوع: "aap kaise hain", "mein theek hoon", "shukriya"
✅ درست: "آپ کیسے ہیں؟", "میں ٹھیک ہوں", "شکریہ"

دوسرے قوانین:
- ہمیشہ پوری اردو رسم الخط میں جواب دیں۔ رومن اردو سے پرہیز کریں۔
- اگر صارف رومن اردو میں لکھے تب بھی آپ صرف اردو رسم الخط میں جواب دیں۔
- دوستانہ، مددگار اور احترام کے ساتھ بات کریں۔
- جوابات مختصر اور واضح رکھیں۔
- اسلامی آداب کا خیال رکھیں۔
- اگر کوئی بات نامناسب ہو تو شائستگی سے انکار کریں۔
- موسم، لطیفے، شاعری، عمومی علم، مشورے — سب اردو رسم الخط میں دیں۔

مثال:
صارف: "aap kaise hain"
آپ کا جواب: "میں ٹھیک ہوں، شکر ہے! آپ کیسے ہیں؟"

صارف: "mujhe pakistan ke baare mein batao"
آپ کا جواب: "پاکستان خوبصورت ملک ہے! 🇵🇰 قائد اعظم محمد علی جناح نے اسے بنایا..."`
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
                    temperature: 0.3,  // Lower temperature = more consistent, follows rules better
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

        // Optional: Post-process to remove any Roman Urdu characters
        // This regex checks if response contains Roman Urdu (English alphabet characters)
        const hasRomanUrdu = /[a-zA-Z]/g.test(reply);
        if (hasRomanUrdu && /[\u0600-\u06FF]/g.test(reply) === false) {
            // If response has NO Urdu script characters, force a fallback
            reply = "معاف کیجیے، مجھے صرف اردو رسم الخط میں جواب دینا ہے۔ براہ کرم اپنا سوال دوبارہ پوچھیں۔";
        }

        res.status(200).json({ reply });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
}
