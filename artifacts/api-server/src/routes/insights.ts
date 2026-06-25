import { Router } from "express";
import OpenAI, { toFile } from "openai";

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

router.post("/insights/transcribe", async (req, res) => {
  const { audio, mimeType } = req.body as { audio: string; mimeType: string };

  if (!audio) {
    res.status(400).json({ error: "No audio provided" });
    return;
  }

  try {
    const buffer = Buffer.from(audio, "base64");
    const ext = mimeType?.includes("mp4") || mimeType?.includes("m4a") ? "m4a" : "wav";
    const file = await toFile(buffer, `recording.${ext}`, { type: mimeType ?? "audio/m4a" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      response_format: "json",
    });

    res.json({ text: transcription.text ?? "" });
  } catch (err) {
    req.log.error({ err }, "Transcription failed");
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.post("/insights/recommendations", async (req, res) => {
  const { mood, content, reflection, prompt: entryPrompt } = req.body as {
    mood: string;
    content: string;
    reflection: string;
    prompt: string;
  };

  if (!mood && !content && !reflection) {
    res.status(400).json({ error: "No entry data provided" });
    return;
  }

  const systemPrompt = `You are a warm, practical life coach. A user has just finished their daily journal entry.
Based on their mood and what they wrote, give them 3 specific, actionable recommendations to make tomorrow better.

RULES:
- Be concrete and personal — reference what they actually wrote.
- Each recommendation must include a specific action, not vague advice.
- Tone: encouraging, direct, warm. Like a trusted friend who gives real advice.
- If mood is "great" or "good", focus on sustaining momentum and building on what's working.
- If mood is "okay", "bad", or "awful", focus on relief, small wins, and self-compassion.

Respond with JSON ONLY (no markdown, no code fences):
{
  "recommendations": [
    { "emoji": "🎯", "title": "Short action title (4-6 words)", "description": "2 sentences: what to do and why it will help based on what they wrote." },
    { "emoji": "💤", "title": "Short action title", "description": "2 sentences." },
    { "emoji": "🌱", "title": "Short action title", "description": "2 sentences." }
  ]
}`;

  const userMessage = [
    `Mood today: ${mood}`,
    content ? `Their thoughts: ${content}` : null,
    reflection ? `Their reflection (prompt was "${entryPrompt}"): ${reflection}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse recommendations JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Recommendations request failed");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

router.post("/insights/year-review", async (req, res) => {
  const { year, entries } = req.body as {
    year: number;
    entries: Array<{ date: string; mood: string; snippet: string }>;
  };

  if (!entries || entries.length === 0) {
    res.status(400).json({ error: "No entries provided" });
    return;
  }

  const entriesText = entries
    .map((e) => `[${e.date}] Mood: ${e.mood}. ${e.snippet}`)
    .join("\n");

  const systemPrompt = `You are a warm, empathetic journaling companion writing a year-end review for someone who has been journaling all year.
Your tone is personal, reflective, and encouraging — like a wise friend who has been listening all year.
Write as if speaking directly to them (use "you", "your").

Based on the journal entries provided, write their ${year} Year in Review.

Respond with JSON ONLY (no markdown, no code fences):
{
  "narrative": "2-3 heartfelt paragraphs narrating their year. Reference actual moods and themes you see in the entries. Be specific, not generic.",
  "themes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
  "highlights": [
    { "period": "Month or season", "note": "A specific standout observation from that period." },
    { "period": "Month or season", "note": "..." },
    { "period": "Month or season", "note": "..." }
  ],
  "growth": "1-2 sentences about how you can see them growing over the year based on their entries.",
  "encouragement": "A warm closing paragraph for the year ahead — hopeful, grounded, specific to what they've been through."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Year: ${year}\n\nJournal entries:\n${entriesText}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse year-review JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }
    res.json({ review: parsed });
  } catch (err) {
    req.log.error({ err }, "Year review request failed");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

router.post("/insights/playlist", async (req, res) => {
  const { mood, content, reflection } = req.body as {
    mood: string;
    content: string;
    reflection: string;
  };

  const systemPrompt = `You are a music curator who deeply understands emotions and human experiences.
Based on the user's mood and journal entry, suggest 5 songs that resonate with their emotional state today.

RULES:
- Pick real, well-known songs (not obscure tracks) that genuinely match the mood and themes in the entry.
- Mix genres — don't pick 5 similar songs.
- The "reason" should be personal and specific to what they wrote — not a generic description of the song.
- If mood is negative, choose songs that offer comfort, understanding, or gentle uplift — not wallowing.
- If mood is positive, choose songs that celebrate or energize.

Respond with JSON ONLY (no markdown, no code fences):
{
  "songs": [
    { "emoji": "🎵", "title": "Song Title", "artist": "Artist Name", "reason": "One sentence connecting this song to what they wrote." },
    { "emoji": "🎸", "title": "Song Title", "artist": "Artist Name", "reason": "One sentence." },
    { "emoji": "🎹", "title": "Song Title", "artist": "Artist Name", "reason": "One sentence." },
    { "emoji": "🥁", "title": "Song Title", "artist": "Artist Name", "reason": "One sentence." },
    { "emoji": "🎷", "title": "Song Title", "artist": "Artist Name", "reason": "One sentence." }
  ]
}`;

  const userMessage = [
    `Mood: ${mood}`,
    content ? `Journal thoughts: ${content}` : null,
    reflection ? `Reflection: ${reflection}` : null,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse playlist JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Playlist request failed");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
