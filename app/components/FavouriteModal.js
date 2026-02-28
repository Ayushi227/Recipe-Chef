"use client";
import ReactMarkdown from "react-markdown";

export default function FavouriteModal({ favourite, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-amber-100">
          <div>
            <h2 className="text-xl font-bold text-amber-800">⭐ Saved Recipe</h2>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(favourite.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Question */}
          <div className="bg-amber-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 mb-4 inline-block max-w-full">
            <p className="text-sm">🤔 {favourite.question}</p>
          </div>

          {/* Answer */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              👨‍🍳
            </div>
            <div className="bg-amber-50 rounded-2xl rounded-tl-sm px-4 py-3 flex-1 border border-amber-100">
              <div className="prose prose-amber text-gray-700 text-sm">
                <ReactMarkdown>{favourite.answer}</ReactMarkdown>
              </div>
              {favourite.books_used?.length > 0 && (
                <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-amber-100">
                  📖 {favourite.books_used.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-amber-100">
          <button
            onClick={onClose}
            className="w-full border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-2 px-4 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}