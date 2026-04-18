export function noteExtractionPrompt(conversationContext: string): string {
  return `You are analyzing a conversation between a student and an AI scheduling assistant.

Extract personal facts, preferences, or constraints the student revealed that would be useful for future schedule planning.

Categories:
- preference: time/lifestyle preferences ("I want Saturday free", "I like studying at night")
- constraint: hard limits ("I can't study before 9am", "I have a job on Wednesdays")
- strength: academic strengths ("I'm good at algorithms", "Math comes easy to me")
- weakness: academic weaknesses ("I struggle with analysis", "I need extra time for proofs")
- goal: explicit goals ("I want to finish all exercises before Friday")

Rules:
- Only extract facts that are explicitly stated by the student (role: "user")
- Set shouldSave: false for vague or generic statements
- Set shouldSave: false for facts already implied by standard student life
- Keep content concise, factual, and in third-person ("User prefers...", "User struggles with...")
- Set hasNewInformation: false if nothing worth saving was found

Conversation:
${conversationContext}

Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble.`;
}
