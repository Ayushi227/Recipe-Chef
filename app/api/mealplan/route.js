import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/embeddings";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { userId, dietaryRestrictions } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    // Get a broad embedding to find varied recipes
    const embedding = await getEmbedding("breakfast lunch dinner recipes meals");

    const { data: chunks, error } = await supabase.rpc(
      "match_cookbook_chunks",
      {
        query_embedding: embedding,
        match_user_id: userId,
        match_count: 15,
      }
    );

    if (error) throw error;

    const context = chunks.map((c) => c.chunk_text).join("\n\n");

    const dietaryNote =
      dietaryRestrictions.length > 0
        ? `The user has the following dietary restrictions: ${dietaryRestrictions.join(", ")}. ALL meals must strictly respect these restrictions.`
        : "The user has no dietary restrictions.";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a professional chef and meal planner. Using ONLY recipes from the cookbook sections below, create a varied and balanced 7-day meal plan.

${dietaryNote}

Format the plan clearly with each day having Breakfast, Lunch, and Dinner. Give the User appropiate bullet points for the meals - breakfast, lunch, dinner. Include the recipe name and a one-line description for each meal. Make it feel personalised and exciting.

COOKBOOK SECTIONS:
${context}̉

Generate the 7-day meal plan now:`;

    const result = await model.generateContent(prompt);
    const plan = result.response.text();

    return Response.json({ plan });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}