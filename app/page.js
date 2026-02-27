"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

const handleDownload = async (filePath, fileName) => {
  const { data } = await supabase.storage
    .from("cookbooks")
    .createSignedUrl(filePath, 3600);

  if (data?.signedUrl) {
    window.open(data.signedUrl, "_blank");
  }
};


export default function Home() {
  const [user, setUser] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [uploadedBooks, setUploadedBooks] = useState([]);
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        loadUploadedBooks(session.user.id);
      }
    });
  }, []);

const loadUploadedBooks = async (userId) => {
  const { data } = await supabase
    .from("cookbooks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (data) setUploadedBooks(data);
};
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFilesChange = (e) => {
    setPdfs(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!pdfs.length || !user) return;
    setUploading(true);

    try {
      for (const pdf of pdfs) {
        const formData = new FormData();
        formData.append("pdf", pdf);
        formData.append("userId", user.id);
        formData.append("cookbookName", pdf.name);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setUploadedBooks((prev) => [...new Set([...prev, pdf.name])]);
        } else {
          alert(`Error processing ${pdf.name}: ${data.error}`);
        }
      }
      setPdfs([]);
    } catch (err) {
      alert("Something went wrong: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !user) return;
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userId: user.id,
        }),
      });

      const data = await res.json();
      const newConversation = {
        question,
        answer: data.answer || data.error,
        booksUsed: data.booksUsed || [],
      };
      setConversations((prev) => [...prev, newConversation]);
      setQuestion("");

      await supabase.from("conversations").insert({
        user_id: user.id,
        cookbook_id: null,
        question: newConversation.question,
        answer: newConversation.answer,
      });
    } catch (err) {
      setConversations((prev) => [
        ...prev,
        { question, answer: "Something went wrong.", booksUsed: [] },
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

        {/* Cookbook Library */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-amber-800 font-semibold mb-3">
            📚 Your Cookbook Library
          </h2>
          {uploadedBooks.length === 0 ? (
  <p className="text-gray-400 text-sm">
    No cookbooks yet — upload one below!
  </p>
) : (
  <div className="space-y-2 mb-4">
    {uploadedBooks.map((book) => (
      <div
        key={book.id}
        className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2"
      >
        <span className="text-amber-800 text-sm font-medium">
          📖 {book.name}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {(book.file_size / 1024 / 1024).toFixed(1)} MB
          </span>
          <button
            onClick={() => handleDownload(book.file_path, book.name)}
            className="text-xs text-amber-600 hover:text-amber-800 underline"
          >
            Download
          </button>
        </div>
      </div>
    ))}
  </div>
)}

          {/* Upload */}
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFilesChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-800 file:font-semibold hover:file:bg-amber-200 cursor-pointer"
          />
          {pdfs.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-gray-500 mb-2">
                Ready to upload: {pdfs.map((f) => f.name).join(", ")}
              </p>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-amber-800 hover:bg-amber-900 disabled:bg-amber-300 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                {uploading
                  ? "Processing cookbooks... 🔄"
                  : `Add ${pdfs.length} cookbook${pdfs.length > 1 ? "s" : ""} to library 📚`}
              </button>
            </div>
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
                {conv.booksUsed.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    📖 Sources: {conv.booksUsed.join(", ")}
                  </p>
                )}
                {i < conversations.length - 1 && (
                  <hr className="mt-4 border-amber-100" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Question Input */}
        {uploadedBooks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <label className="block text-amber-800 font-semibold mb-3">
              🤔 Ask your cookbooks anything!
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="e.g. What desserts can I make with chocolate?"
              className="w-full border border-amber-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || loading}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {loading ? "Searching your cookbooks... 🍳" : "Ask the Chef!"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}