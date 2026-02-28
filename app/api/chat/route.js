import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/embeddings";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
const { question, userId, dietaryRestrictions } = await request.json();
    // Get embedding for the question
    const questionEmbedding = await getEmbedding(question);
    // Searching through Supabase for most similar chunks
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { data: relevantChunks, error } = await supabase.rpc(
      "match_cookbook_chunks",
      {
        query_embedding: questionEmbedding,
        match_user_id: userId,
        match_count: 5,
      }
    );

    if (error) throw error;

    // Build context from relevant chunks
    //Added cookbook name to be able to tell user which pdf the recipe came from -future use case
    const context = relevantChunks
      .map((chunk) => `[From: ${chunk.cookbook_name}]\n${chunk.chunk_text}`)
      .join("\n\n");

    const booksUsed = [...new Set(relevantChunks.map((c) => c.cookbook_name))];

    // Send to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const dietaryNote = dietaryRestrictions?.length > 0
  ? `The user has these dietary restrictions: ${dietaryRestrictions.join(", ")}.`
  : "";

const prompt = `You are a friendly, knowledgeable chef assistant. Using ONLY the cookbook sections below, help the user find recipes.

${dietaryNote}

Follow these rules carefully:

**Rule 1 — Specific recipe request:**
If the user asks for a specific recipe by name (e.g. "chocolate chip cookies", "beef stew"), give them the FULL recipe directly — ingredients, steps, and serving suggestions. No need to show options.

**Rule 2 — General or ingredient-based request:**
If the user asks a general question (e.g. "what can I make with chicken?" or "show me a dessert"), find 2-3 relevant recipes and present them as options like this:

**Option 1: [Recipe Name]**
One sentence description of why it matches.

**Option 2: [Recipe Name]**
One sentence description of why it matches.

**Option 3: [Recipe Name]** (if available)
One sentence description of why it matches.

Then end with: "Which one would you like the full recipe for? Just say the option number or name! 👨‍🍳"

**Rule 3 — User picks an option:**
If the user's message is picking one of the previously offered options (e.g. "option 1", "the second one", "I'll go with the pasta"), give the FULL detailed recipe immediately.

**Rule 4 — Dietary restrictions:**
${dietaryRestrictions?.length > 0 ? `
- Always check every recipe against the user's restrictions: ${dietaryRestrictions.join(", ")}
- If a recipe is fully compatible, mention it with a ✅
- If a recipe contains a restricted ingredient BUT a common substitute exists, suggest it naturally within the recipe and mark it clearly like this:
  "Swap the butter for coconut oil 🍳 *Chef's Suggestion: This substitute has not been tested in this recipe — results may vary. Please use your own judgement.*"
- Always add the chef suggestion disclaimer in italics after EVERY substitute you suggest
- If a recipe conflicts with restrictions and no reasonable substitute exists, warn the user clearly: "⚠️ Disclaimer: This recipe contains [ingredient] which conflicts with your [restriction] preference. I couldn't find a safe substitute for this ingredient, so please use your own judgement."
- Never silently omit an ingredient — always be transparent
` : "The user has no dietary restrictions, serve all recipes as written."}

**Rule 5 — Nothing found:**
If no relevant recipes are found in the cookbook sections, say warmly: "I couldn't find that in your cookbooks — try uploading more recipe books or searching with different keywords! 📚"

RELEVANT COOKBOOK SECTIONS:
${context}

USER MESSAGE:
${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return Response.json({ answer,booksUsed});
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}