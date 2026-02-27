"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
export default function Home() {
  const [pdf, setPdf] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfName, setPdfName] = useState("");

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdf(file);
      setPdfName(file.name);
      setAnswer("");
    }
  };

  const handleAsk = async () => {
    if (!pdf || !question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const formData = new FormData();
      formData.append("pdf", pdf);
      formData.append("question", question);

      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setAnswer(data.answer || data.error);
    } catch (err) {
      setAnswer("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-amber-800 mb-2">👨‍🍳 Recipe Chef</h1>
          <p className="text-amber-600 text-lg">Upload your cookbook and ask me anything!</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <label className="block text-amber-800 font-semibold mb-3">
            📖 Upload your Recipe Book (PDF)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-800 file:font-semibold hover:file:bg-amber-200 cursor-pointer"
          />
          {pdfName && (
            <p className="mt-2 text-sm text-green-600">✅ {pdfName} uploaded!</p>
          )}
        </div>

        {/* Question Input */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <label className="block text-amber-800 font-semibold mb-3">
            🤔 What would you like to know?
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="e.g. What can I make with chicken and spinach?"
            className="w-full border border-amber-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleAsk}
            disabled={!pdf || !question.trim() || loading}
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            {loading ? "Cooking up an answer... 🍳" : "Ask the Chef!"}
          </button>
        </div>

        {/* Answer */}
        {answer && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-amber-800 font-semibold mb-3">👨‍🍳 Chef says:</h2>
            {/* <ReactMarkdown className="prose prose-amber text-gray-700">{answer}</ReactMarkdown> */}

            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </div>
    </main>
  );
}