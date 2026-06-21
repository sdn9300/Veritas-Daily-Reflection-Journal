import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

interface JournalEntry {
  date: string;
  content: string;
  mood: string;
  reflection: string;
  prompt: string;
}

router.post("/insights/weekly", async (req, res) => {
  const { entries } = req.body as { entries: JournalEntry[] };

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: "No entries provided" });
    return;
  }

  const entriesText = entries
    .map((e) => {
      const parts = [
        `Date: ${e.date}`,
        `Mood: ${e.mood}`,
        e.content ? `Thoughts: ${e.content}` : null,
        e.reflection ? `Reflection (prompt: "${e.prompt}"): ${e.reflection}` : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are a compassionate, insightful journal coach who helps people reflect on their week and grow. 
Analyze the journal entries provided and generate a warm, thoughtful weekly summary.
Respond with a JSON object (no markdown, no code blocks) with exactly this structure:
{
  "headline": "A short, personal 1-sentence summary of the week (under 15 words)",
  "moodPattern": "2-3 sentences describing the emotional arc of the week — how moods shifted and what drove them",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "highlight": "The most meaningful or growth-oriented moment you noticed across the entries",
  "recommendations": [
    { "title": "Short title", "body": "2-3 sentence actionable suggestion based specifically on what appeared in the entries" },
    { "title": "Short title", "body": "2-3 sentence actionable suggestion" },
    { "title": "Short title", "body": "2-3 sentence actionable suggestion" }
  ],
  "closingThought": "An encouraging, personal closing sentence to motivate continued journaling"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here are my journal entries from the past week:\n\n${entriesText}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json({ summary: parsed });
  } catch (err) {
    req.log.error({ err }, "OpenAI request failed");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
