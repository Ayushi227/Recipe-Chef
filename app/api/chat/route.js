import { GoogleGenerativeAI } from "@google/generative-ai";
import PDFParser from "pdf2json";

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
    const question = formData.get("question");
    const pdfFile = formData.get("pdf");

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const recipeText = await extractTextFromPDF(pdfBuffer);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a helpful chef assistant. Using ONLY the recipes in the cookbook below, answer the user's question. If the answer isn't in the cookbook, say so.

COOKBOOK CONTENT:
${recipeText}

USER QUESTION:
${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}