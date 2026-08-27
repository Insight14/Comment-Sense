import { GEMINI_API_KEY } from './config.js';

async function classifyCommentsWithAI(comments, videoTitle) {
  const commentText = comments
    .slice(0, 50) // cap to keep prompt size reasonable
    .map((c, i) => `${i + 1}. "${c.textOriginal}" (${c.likeCount} likes)`)
    .join("\n");

  const prompt = `You are analyzing YouTube comments for a video titled "${videoTitle}".
Classify the comments below into these categories, weighting by like count:
confirmed_legit, flagged_fake, praised_clarity, confusion, accuracy_complaint, exam_success, neutral

Comments:
${commentText}

Respond ONLY with JSON in this exact format, no other text, no markdown formatting:
{"confirmed_legit": 0, "flagged_fake": 0, "praised_clarity": 0, "confusion": 0, "accuracy_complaint": 0, "exam_success": 0, "neutral": 0}

Each number should be the SUM of (likeCount + 1) for every comment matching that category.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();
  let text = data.candidates[0].content.parts[0].text.trim();

  // Gemini sometimes wraps JSON in ```json fences — strip if present
  text = text.replace(/```json|```/g, "").trim();

  return JSON.parse(text);
}

export { classifyCommentsWithAI };