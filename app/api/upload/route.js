import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";
import { chunkText, embedChunks } from "@/lib/embeddings";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export const maxDuration = 60; // 60 second timeout for large PDFs
function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text = pdfData.Pages.map((page) =>
        page.Texts.map((t) => {
          try {
            return decodeURIComponent(t.R[0].T);
          } catch {
            return t.R[0].T;
          }
        }).join(" ")
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

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    // Step 1 — Upload PDF to Supabase Storage
    const filePath = `${userId}/${Date.now()}_${cookbookName}`;
    const { error: storageError } = await supabase.storage
      .from("cookbooks")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (storageError) throw storageError;

    // Step 2 — Save cookbook metadata to cookbooks table
    const { data: cookbook, error: cookbookError } = await supabase
      .from("cookbooks")
      .insert({
        user_id: userId,
        name: cookbookName,
        file_path: filePath,
        file_size: pdfBuffer.length,
      })
      .select()
      .single();

    if (cookbookError) throw cookbookError;

    // Step 3 — Extract text, chunk and embed
    const pdfText = await extractTextFromPDF(pdfBuffer);
    const chunks = chunkText(pdfText);
    console.log(`Created ${chunks.length} chunks`);

    const embeddings = await embedChunks(chunks);
    console.log(`Created ${embeddings.length} embeddings`);

    // Step 4 — Store chunks with cookbook_id reference
    const rows = chunks.map((chunk, i) => ({
      user_id: userId,
      cookbook_id: cookbook.id,
      cookbook_name: cookbookName,
      chunk_text: chunk,
      embedding: embeddings[i],
      chunk_index: i,
    }));

    const { error: chunksError } = await supabase
      .from("cookbook_chunks")
      .insert(rows);

    if (chunksError) throw chunksError;

    return Response.json({
      success: true,
      chunks: chunks.length,
      cookbookId: cookbook.id,
      message: `Successfully processed ${chunks.length} chunks!`,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}