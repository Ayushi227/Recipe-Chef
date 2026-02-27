import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";
import { chunkText, embedChunks } from "@/lib/embeddings";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text = pdfData.Pages.map((page) =>
        page.Texts.map((t) => decodeURIComponent(t.R[0].T)).join(" ")
      ).join("\n");
      resolve(text);
    });
    pdfParser.on("pdfParser_dataError", reject);
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const userId = formData.get("userId");
    const cookbookName = formData.get("cookbookName");

    // Extract text from PDF
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const pdfText = await extractTextFromPDF(pdfBuffer);

    // Chunk the text
    const chunks = chunkText(pdfText);
    console.log(`Created ${chunks.length} chunks`);

    // Get embeddings for all chunks
    const embeddings = await embedChunks(chunks);
    console.log(`Created ${embeddings.length} embeddings`);

    // Store in Supabase
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
    );
    const rows = chunks.map((chunk, i) => ({
      user_id: userId,
      chunk_text: chunk,
      embedding: embeddings[i],
      chunk_index: i,
    }));

    const { error } = await supabase
      .from("cookbook_chunks")
      .insert(rows);

    if (error) throw error;

    return Response.json({
      success: true,
      chunks: chunks.length,
      message: `Successfully processed ${chunks.length} chunks!`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}