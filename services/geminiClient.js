const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function decideInterest(transcript) {
  const prompt = `
    You are given a customer call transcript in Hinglish.
    Determine if the customer said YES (interested) or NO (not interested) 
    to receiving a pamphlet. 
    Respond ONLY with: "true" if interested, or "false" if not interested.
    Transcript: "${transcript}"
  `;

  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().toLowerCase();
      return text.includes("true");
    } catch (err) {
      console.warn(`⚠️ Gemini ${modelName} failed:`, err.message);
      await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
    }
  }

  throw new Error("All Gemini models failed");
}

module.exports = { decideInterest };
