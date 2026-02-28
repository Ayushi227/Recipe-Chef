"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import PreferencesModal from "./components/PreferencesModal";
import MealPlanModal from "./components/MealPlanModal";
import FavouriteModal from "./components/FavouriteModal";

export default function Home() {
  const [user, setUser] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const [uploadedBooks, setUploadedBooks] = useState([]);
  const [question, setQuestion] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [showFavourites, setShowFavourites] = useState(false);
  const [selectedFavourite, setSelectedFavourite] = useState(null);
  const conversationEndRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        loadUploadedBooks(session.user.id);
        loadPreferences(session.user.id);
        loadFavourites(session.user.id);
      }
    });
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

  const loadUploadedBooks = async (userId) => {
    const { data } = await supabase
      .from("cookbooks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setUploadedBooks(data);
  };

  const loadPreferences = async (userId) => {
    const { data } = await supabase
      .from("user_preferences")
      .select("dietary_restrictions")
      .eq("user_id", userId)
      .single();
    if (data) setDietaryRestrictions(data.dietary_restrictions || []);
  };

  const loadFavourites = async (userId) => {
    const { data } = await supabase
      .from("favourites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setFavourites(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDownload = async (filePath, fileName) => {
    const { data } = await supabase.storage
      .from("cookbooks")
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
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
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          await loadUploadedBooks(user.id);
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
    const currentQuestion = question;
    setQuestion("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          userId: user.id,
          dietaryRestrictions,
        }),
      });
      const data = await res.json();
      setConversations((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: data.answer || data.error,
          booksUsed: data.booksUsed || [],
          saved: false,
        },
      ]);
      await supabase.from("conversations").insert({
        user_id: user.id,
        cookbook_id: null,
        question: currentQuestion,
        answer: data.answer || data.error,
      });
    } catch (err) {
      setConversations((prev) => [
        ...prev,
        { question: currentQuestion, answer: "Something went wrong.", booksUsed: [], saved: false },
      ]);
    } finally {
      setLoading(false);
    }
  };
const handleFavourite = async (conv, index) => {
  if (!user) return;
  const res = await fetch("/api/favourites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      question: conv.question,
      answer: conv.answer,
      booksUsed: conv.booksUsed,
    }),
  });

  const { data } = await res.json();
  if (data) {
    setFavourites((prev) => [data, ...prev]);
    setConversations((prev) =>
      prev.map((c, i) => (i === index ? { ...c, saved: true } : c))
    );
  }
};

const handleRemoveFavourite = async (id) => {
  await fetch("/api/favourites", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  setFavourites((prev) => prev.filter((f) => f.id !== id));
};

  if (!user) return null;

  return (
    <div className="flex h-screen bg-amber-50 overflow-hidden">

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 flex-shrink-0 bg-white border-r border-amber-100 flex flex-col overflow-hidden`}>

        {/* Sidebar Header */}
        <div className="p-4 border-b border-amber-100">
          <h1 className="text-xl font-bold text-amber-800">👨‍🍳 Recipe Chef</h1>
          <p className="text-xs text-amber-500 mt-1 truncate">{user.email}</p>
        </div>

        {/* Nav Buttons */}
        <div className="p-3 border-b border-amber-100 flex flex-col gap-2">
          <button
            onClick={() => { setShowFavourites(false); }}
            className={`text-sm font-medium py-2 px-3 rounded-xl text-left transition-colors ${!showFavourites ? "bg-amber-50 text-amber-800" : "text-gray-500 hover:bg-gray-50"}`}
          >
            📚 My Cookbooks
          </button>
          <button
            onClick={() => setShowFavourites(true)}
            className={`text-sm font-medium py-2 px-3 rounded-xl text-left transition-colors ${showFavourites ? "bg-amber-50 text-amber-800" : "text-gray-500 hover:bg-gray-50"}`}
          >
            ⭐ Favourites {favourites.length > 0 && `(${favourites.length})`}
          </button>
          <button
            onClick={() => setShowMealPlan(true)}
            className="text-sm font-medium py-2 px-3 rounded-xl text-left text-gray-500 hover:bg-gray-50 transition-colors"
          >
            📅 Weekly Meal Planner
          </button>
          <button
            onClick={() => setShowPreferences(true)}
            className="text-sm font-medium py-2 px-3 rounded-xl text-left text-gray-500 hover:bg-gray-50 transition-colors"
          >
            🥗 Dietary Preferences
            {dietaryRestrictions.length > 0 && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {dietaryRestrictions.length}
              </span>
            )}
          </button>
        </div>

        {/* Cookbooks or Favourites */}
        <div className="flex-1 overflow-y-auto p-4">
          {!showFavourites ? (
            <>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Your Cookbooks
              </h2>
              {uploadedBooks.length === 0 ? (
                <p className="text-sm text-gray-400">No cookbooks yet!</p>
              ) : (
                <div className="space-y-2">
                  {uploadedBooks.map((book) => (
                    <div key={book.id} className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-sm font-medium text-amber-800 truncate">📖 {book.name}</p>
                      <div className="flex items-center justify-between mt-1">
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
            </>
          ) : (
            <>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Saved Recipes
              </h2>
              {favourites.length === 0 ? (
                <p className="text-sm text-gray-400">No favourites yet — star a response to save it!</p>
              ) : (
                <div className="space-y-2">
                  {favourites.map((fav) => (
  <div
    key={fav.id}
    className="bg-amber-50 rounded-xl p-3 border border-amber-100 cursor-pointer hover:border-amber-300 transition-colors"
    onClick={() => setSelectedFavourite(fav)}
  >
<p className="text-sm font-medium text-amber-800 truncate">⭐ {fav.recipe_name || "Recipe "}</p>    <button
      onClick={(e) => {
        e.stopPropagation();
        handleRemoveFavourite(fav.id);
      }}
      className="text-xs text-red-400 hover:text-red-600 mt-1"
    >
      Remove
    </button>
  </div>
))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Upload Section */}
        <div className="p-4 border-t border-amber-100">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFilesChange}
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-amber-100 file:text-amber-800 file:font-semibold hover:file:bg-amber-200 cursor-pointer mb-2"
          />
          {pdfs.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300 text-white text-sm font-bold py-2 px-4 rounded-xl transition-colors"
            >
              {uploading ? "Processing... 🔄" : `Add ${pdfs.length} book${pdfs.length > 1 ? "s" : ""} 📚`}
            </button>
          )}
        </div>

        {/* Sign Out */}
        <div className="p-4 border-t border-amber-100">
          <button
            onClick={handleSignOut}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors text-left"
          >
            Sign out →
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar */}
        <div className="bg-white border-b border-amber-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-amber-600 hover:text-amber-800 transition-colors p-1 rounded-lg hover:bg-amber-50"
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <span className="text-amber-800 font-semibold">
            {uploadedBooks.length > 0
              ? `Searching across ${uploadedBooks.length} cookbook${uploadedBooks.length > 1 ? "s" : ""}`
              : "Upload a cookbook to get started"}
          </span>
          {dietaryRestrictions.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              🥗 {dietaryRestrictions.join(", ")}
            </span>
          )}
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">👨‍🍳</div>
              <h2 className="text-2xl font-bold text-amber-800 mb-2">
                What would you like to cook?
              </h2>
              <p className="text-gray-400 max-w-md">
                {uploadedBooks.length === 0
                  ? "Upload a cookbook from the sidebar to get started"
                  : "Ask me anything about your cookbooks — ingredients, recipes, techniques!"}
              </p>
            </div>
          ) : (
            conversations.map((conv, i) => (
              <div key={i} className="space-y-3">
                {/* User question */}
                <div className="flex justify-end">
                  <div className="bg-amber-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-lg">
                    <p className="text-sm">{conv.question}</p>
                  </div>
                </div>
                {/* Chef answer */}
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    👨‍🍳
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg shadow-sm border border-amber-100">
                    <div className="prose prose-amber text-gray-700 text-sm">
                      <ReactMarkdown>{conv.answer}</ReactMarkdown>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      {conv.booksUsed.length > 0 && (
                        <p className="text-xs text-gray-400">
                          📖 {conv.booksUsed.join(", ")}
                        </p>
                      )}
                      <button
                        onClick={() => handleFavourite(conv, i)}
                        disabled={conv.saved}
                        className={`text-xs ml-auto transition-colors ${conv.saved ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
                      >
                        {conv.saved ? "⭐ Saved" : "☆ Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                👨‍🍳
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-amber-100">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-amber-100 p-4">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleAsk()}
              placeholder={
                uploadedBooks.length === 0
                  ? "Upload a cookbook first..."
                  : "Ask anything about your cookbooks..."
              }
              disabled={uploadedBooks.length === 0 || loading}
              className="flex-1 border border-amber-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || loading || uploadedBooks.length === 0}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPreferences && (
        <PreferencesModal
          userId={user.id}
          onClose={() => setShowPreferences(false)}
          onSave={(restrictions) => setDietaryRestrictions(restrictions)}
        />
      )}
      {showMealPlan && (
        <MealPlanModal
          userId={user.id}
          dietaryRestrictions={dietaryRestrictions}
          onClose={() => setShowMealPlan(false)}
        />
      )}
      {selectedFavourite && (
  <FavouriteModal
    favourite={selectedFavourite}
    onClose={() => setSelectedFavourite(null)}
  />
)}
    </div>
  );
}