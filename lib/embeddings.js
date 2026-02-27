import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export function chunkText(text, chunkSize = 200) {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export async function getEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768, // truncate to 768 dimensions
  });
  return result.embedding.values;
}

export async function embedChunks(chunks) {
  const embeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i]);
    embeddings.push(embedding);

    if (i % 5 === 0 && i !== 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return embeddings;
}