"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [user, setUser] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cookbookReady, setCookbookReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdf(file);
      setPdfName(file.name);
      setCookbookReady(false);
      setConversations([]);
    }
  };

  const handleProcessPdf = async () => {
    if (!pdf || !user) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", pdf);
      formData.append("userId", user.id);
      formData.append("cookbookName", pdfName);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCookbookReady(true);
      } else {
        alert("Error processing PDF: " + data.error);
      }
    } catch (err) {
      alert("Something went wrong: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !cookbookReady || !user) return;
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userId: user.id,
          cookbookName: pdfName,
        }),
      });

      const data = await res.json();
      const newConversation = { question, answer: data.answer || data.error };
      setConversations((prev) => [...prev, newConversation]);
      setQuestion("");

      // Save to Supabase
      await supabase.from("conversations").insert({
        user_id: user.id,
        cookbook_id: null,
        question: newConversation.question,
        answer: newConversation.answer,
      });
    } catch (err) {
      setConversations((prev) => [
        ...prev,
        { question, answer: "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-amber-800">👨‍🍳 Recipe Chef</h1>
            <p className="text-amber-600 text-sm mt-1">Welcome, {user.email}!</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-amber-600 hover:text-amber-800 border border-amber-300 px-4 py-2 rounded-xl transition-colors"
          >
            Sign out
          </button>
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
          {pdf && !cookbookReady && (
            <button
              onClick={handleProcessPdf}
              disabled={uploading}
              className="mt-4 w-full bg-amber-800 hover:bg-amber-900 disabled:bg-amber-300 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {uploading ? "Processing cookbook... this may take a minute 🔄" : "Process Cookbook 📚"}
            </button>
          )}
          {cookbookReady && (
            <p className="mt-3 text-green-600 font-semibold">
              ✅ {pdfName} is ready — start asking questions!
            </p>
          )}
        </div>

        {/* Conversation History */}
        {conversations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 space-y-6">
            {conversations.map((conv, i) => (
              <div key={i}>
                <p className="text-amber-800 font-semibold mb-1">
                  🤔 {conv.question}
                </p>
                <ReactMarkdown >
                  {conv.answer}
                </ReactMarkdown>
                {i < conversations.length - 1 && (
                  <hr className="mt-4 border-amber-100" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Question Input */}
        {cookbookReady && (
          <div className="bg-white rounded-2xl shadow-md p-6">
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
              disabled={!question.trim() || loading}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {loading ? "Cooking up an answer... 🍳" : "Ask the Chef!"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}