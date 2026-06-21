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

  const systemPrompt = `You are a compassionate, psychologically-informed journal coach helping people grow through reflection.
Analyse the journal entries below and produce a personalised weekly report.

IMPORTANT RULES:
- Be specific — reference actual words, moods, and situations from the entries. Never be generic.
- Recommendations must address concrete patterns you observed (e.g. "You mentioned feeling drained after meetings three times — consider…").
- Each recommendation should have a clear, named technique or habit with a reason grounded in the entries.
- Tone: warm, direct, and encouraging — like a trusted mentor, not a chatbot.

Respond with a JSON object ONLY (no markdown, no code fences) with exactly this structure:
{
  "headline": "A vivid, personal 1-sentence summary of the week's emotional story (under 15 words)",
  "moodPattern": "3 sentences: (1) how mood shifted across the week, (2) the main driver behind the shifts, (3) one nuanced observation about the pattern",
  "keyThemes": ["theme 1", "theme 2", "theme 3"],
  "highlight": "The single most meaningful moment of growth, insight, or connection you spotted — be specific about what was said",
  "recommendations": [
    {
      "title": "Concise action title (3-5 words)",
      "body": "2-3 sentences: name the specific pattern from the entries, suggest a concrete technique or habit, explain why it will help this person specifically."
    },
    {
      "title": "Concise action title",
      "body": "2-3 sentences with specific grounding in the entries."
    },
    {
      "title": "Concise action title",
      "body": "2-3 sentences with specific grounding in the entries."
    }
  ],
  "closingThought": "One warm, personal sentence that acknowledges this specific week and motivates them to keep going."
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
