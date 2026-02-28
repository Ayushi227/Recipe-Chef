"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "🥦 Vegetarian" },
  { id: "vegan", label: "🌱 Vegan" },
  { id: "gluten-free", label: "🌾 Gluten-Free" },
  { id: "dairy-free", label: "🥛 Dairy-Free" },
  { id: "nut-free", label: "🥜 Nut-Free" },
  { id: "halal", label: "☪️ Halal" },
  { id: "kosher", label: "✡️ Kosher" },
  { id: "low-carb", label: "🥩 Low-Carb" },
  { id: "keto", label: "🧈 Keto" },
  { id: "paleo", label: "🦴 Paleo" },
];

export default function PreferencesModal({ userId, onClose, onSave }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data } = await supabase
      .from("user_preferences")
      .select("dietary_restrictions")
      .eq("user_id", userId)
      .single();
    if (data) setSelected(data.dietary_restrictions || []);
  };

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("user_preferences").upsert({
      user_id: userId,
      dietary_restrictions: selected,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    onSave(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-800">
            🥗 Dietary Preferences
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Select your dietary restrictions — the chef will always respect these
          when answering questions and generating meal plans.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {DIETARY_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors border ${
                selected.includes(option.id)
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-700 border-gray-200 hover:border-amber-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <p className="text-xs text-amber-600 mb-4">
            ✅ {selected.length} restriction{selected.length > 1 ? "s" : ""} selected
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}