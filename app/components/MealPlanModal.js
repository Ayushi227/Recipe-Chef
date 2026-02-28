"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";

export default function MealPlanModal({ userId, dietaryRestrictions, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dietaryRestrictions }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        // Save to Supabase
        await supabase.from("meal_plans").insert({
          user_id: userId,
          plan: data.plan,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(22);
    doc.setTextColor(146, 64, 14);
    doc.text("👨‍🍳 My Weekly Meal Plan", margin, y);
    y += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);
    y += 8;

    // Dietary restrictions
    if (dietaryRestrictions.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(180, 100, 0);
      doc.text(`Dietary preferences: ${dietaryRestrictions.join(", ")}`, margin, y);
      y += 10;
    }

    // Divider
    doc.setDrawColor(251, 191, 36);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Plan content
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const cleanText = plan.replace(/[#*`]/g, "");
    const lines = doc.splitTextToSize(cleanText, maxWidth);

    lines.forEach((line) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });

    doc.save("weekly-meal-plan.pdf");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-amber-100">
          <div>
            <h2 className="text-xl font-bold text-amber-800">
              📅 Weekly Meal Planner
            </h2>
            {dietaryRestrictions.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Respecting: {dietaryRestrictions.join(", ")}
              </p>
            )}
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
          {!plan && !loading && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-gray-500 mb-6">
                Generate a personalised 7-day meal plan from your cookbooks
                {dietaryRestrictions.length > 0
                  ? ` tailored to your dietary preferences`
                  : ""}
                !
              </p>
              <button
                onClick={generatePlan}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
              >
                Generate My Meal Plan 🍽️
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <div className="text-5xl mb-4 animate-bounce">👨‍🍳</div>
              <p className="text-amber-600 font-medium">
                Chef is planning your week...
              </p>
              <p className="text-gray-400 text-sm mt-1">
                This may take a moment
              </p>
            </div>
          )}

          {plan && (
            <div className="prose prose-amber max-w-none text-black-400">
              <ReactMarkdown>{plan}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        {plan && (
          <div className="p-6 border-t border-amber-100 flex gap-3">
            <button
              onClick={generatePlan}
              disabled={loading}
              className="flex-1 border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-2 px-4 rounded-xl transition-colors"
            >
              Regenerate 🔄
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
            >
              Download PDF 📄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}