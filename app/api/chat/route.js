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
  ? `IMPORTANT: The user has these dietary restrictions: ${dietaryRestrictions.join(", ")}. Always respect these and flag any conflicts.`
  : "";

const prompt = `You are a helpful chef assistant. Using ONLY the cookbook sections below, answer the user's question. If the answer isn't in the provided sections, say so.

${dietaryNote}

RELEVANT COOKBOOK SECTIONS:
${context}

USER QUESTION:
${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return Response.json({ answer,booksUsed});
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}