
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // ✅ safe — server-side only

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
