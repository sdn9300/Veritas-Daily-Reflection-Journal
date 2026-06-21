export const REFLECTION_PROMPTS = [
  "What was the most meaningful moment of your day?",
  "What is one thing you're grateful for right now?",
  "What challenged you today, and what did you learn from it?",
  "Who made a positive impact on your day, and why?",
  "What would you do differently if you could replay today?",
  "What small win can you celebrate from today?",
  "What emotion showed up most today? What triggered it?",
  "What are you looking forward to tomorrow?",
  "What drained your energy today? What gave you energy?",
  "Describe today's highlight in one vivid sentence.",
  "What is something you've been avoiding that deserves your attention?",
  "What did you create, build, or contribute to today?",
  "What conversation stayed with you from today?",
  "What made you laugh or smile today?",
  "How did you take care of yourself today?",
  "What belief or assumption did today challenge?",
  "What are you letting go of before sleep?",
  "What did you notice in the world around you today?",
  "Where did you feel most alive today?",
  "What decision are you proud of making today?",
  "What surprised you today?",
  "How did you help someone else today?",
  "What would your best self say about how today went?",
  "What is one thing you wish you had said — or hadn't said?",
  "What pattern are you noticing in your days lately?",
  "What does your body need right now?",
  "What idea excited you most today?",
  "Where did your attention go most today? Was that intentional?",
  "What boundary did you set or wish you had set?",
  "What is one thing you want to remember from today?",
];

export function getDailyPrompt(date: string): string {
  const dayOfYear = getDayOfYear(new Date(date));
  return REFLECTION_PROMPTS[dayOfYear % REFLECTION_PROMPTS.length];
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
