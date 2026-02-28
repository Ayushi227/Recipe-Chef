import { createClient } from "@supabase/supabase-js";

function extractRecipeName(answer) {
  const lines = answer.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Remove markdown formatting and find first meaningful title line
    const clean = line.replace(/[#*_]/g, "").trim();
    if (clean.length > 3 && clean.length < 60) {
      return clean;
    }
  }
  return "Saved Recipe";
}

export async function POST(request) {
  try {
    const { userId, question, answer, booksUsed } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { data, error } = await supabase
      .from("favourites")
      .insert({
        user_id: userId,
        question,
        answer,
        books_used: booksUsed,
        recipe_name: extractRecipeName(answer),
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { error } = await supabase.from("favourites").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}