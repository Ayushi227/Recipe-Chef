import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/embeddings";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { question, userId, cookbookName } = await request.json();

    // Get embedding for the question
    const questionEmbedding = await getEmbedding(question);

    // Search Supabase for most similar chunks
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
    );

    const { data: relevantChunks, error } = await supabase.rpc(
      "match_cookbook_chunks",
      {
        query_embedding: questionEmbedding,
        match_user_id: userId,
        match_cookbook_name: cookbookName,
        match_count: 5,
      }
    );

    if (error) throw error;

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk) => chunk.chunk_text)
      .join("\n\n");

    // Send to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a helpful chef assistant. Using ONLY the recipes in the cookbook below, answer the user's question. If the answer isn't in the cookbook, say so.

RELEVANT COOKBOOK SECTIONS:
${context}

USER QUESTION:
${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return Response.json({ answer });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}