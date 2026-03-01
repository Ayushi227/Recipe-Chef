# 👨‍🍳 Recipe Chef

An AI-powered cookbook assistant that lets you chat with your recipe books. Upload your cookbooks as PDFs, ask questions in natural language, and get intelligent answers pulled from across your entire collection.

**Live demo:** [cookbook-ochre.vercel.app](https://cookbook-ochre.vercel.app)

---

## What it does

- Upload multiple cookbook PDFs to your personal library
- Ask questions like *"What can I make with chicken and spinach?"* or *"Show me a chocolate dessert"*
- The AI searches across all your cookbooks simultaneously and suggests 2-3 matching recipes
- Pick one and get the full recipe with ingredients and steps
- Set dietary restrictions (vegetarian, gluten-free, dairy-free etc.) and the chef automatically filters recipes and suggests substitutes where possible
- Generate a personalised 7-day meal plan from your cookbooks and download it as a PDF
- Save favourite recipes and revisit them anytime
- Download your original PDFs from the library

---

## How it works

This app is built on a **RAG (Retrieval Augmented Generation)** pipeline:

```
PDF Upload
    ↓
Extract text → Split into 200-word chunks
    ↓
Generate vector embeddings (768 dimensions) via Gemini Embedding API
    ↓
Store vectors in Supabase pgvector database
    ↓
User asks a question
    ↓
Embed the question → Search for similar chunks
    ↓
Send top 5 relevant chunks + question to Gemini
    ↓
AI generates a contextual answer from your cookbooks
```

Instead of sending entire PDFs to the AI on every question, only the most semantically relevant sections are retrieved — making responses faster, cheaper, and more accurate.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, Tailwind CSS |
| AI — Chat | Google Gemini 2.5 Flash |
| AI — Embeddings | Google Gemini Embedding 001 (768 dimensions) |
| Vector Database | Supabase pgvector (hnsw index) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (Google OAuth + Guest) |
| File Storage | Supabase Storage |
| Deployment | Vercel |
| PDF Generation | jsPDF |
| PDF Parsing | pdf2json |

---

## Features

### 🔍 Semantic Search Across All Cookbooks
Uses vector embeddings to find recipes by meaning, not just keywords. Asking "something warm and comforting" finds relevant recipes even if those exact words don't appear.

### 🥗 Dietary Preferences
Set restrictions once (vegetarian, vegan, gluten-free, dairy-free, nut-free, halal, kosher, keto, paleo, low-carb). Every answer automatically:
- Flags compatible recipes with ✅
- Suggests ingredient substitutes with a chef disclaimer
- Warns when no safe substitute exists

### 📅 Weekly Meal Planner
Generates a personalised 7-day meal plan (breakfast, lunch, dinner) from your uploaded cookbooks, respecting your dietary preferences. Downloadable as a formatted PDF.

### ⭐ Favourites
Save any chef response as a favourite recipe. View, browse, and manage saved recipes from the sidebar.

### 👤 Guest Access
Try the app without signing up — anonymous sessions powered by Supabase Auth.

---

## Database Schema

```sql
cookbooks          -- PDF metadata (name, file path, size)
cookbook_chunks    -- Text chunks with vector(768) embeddings
conversations      -- Chat history per user
favourites         -- Saved recipes per user
user_preferences   -- Dietary restrictions per user
meal_plans         -- Generated weekly plans per user
```

Row Level Security (RLS) is enabled on all tables — users can only ever access their own data.

---

## Running Locally

```bash
# Clone the repo
git clone https://github.com/Ayushi227/Recipe-Chef.git
cd Recipe-Chef

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your keys (see below)

# Run the dev server
npm run dev
```

### Environment Variables

```
GEMINI_API_KEY=                    # Google AI Studio
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase publishable key
SUPABASE_SECRET_KEY=               # Supabase secret key (server only)
```

---

## What I learned building this

- **RAG architecture** — chunking strategies, embedding models, vector similarity search
- **pgvector** — setting up hnsw indexes, cosine distance queries, Matryoshka embedding truncation
- **Prompt engineering** — structuring prompts for consistent multi-step behaviour (show options → pick one → full recipe)
- **Next.js App Router** — server components, API routes, form data handling
- **Supabase** — RLS policies, storage buckets, signed URLs, anonymous auth
- **Debugging AI APIs** — rate limits, model availability by region, dimension constraints

---

## Built by

**Ayushi Khare** — Master of AI student at UTS Sydney

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Ayushi%20Khare-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ayushi-khare-083b5b205/)
[![GitHub](https://img.shields.io/badge/GitHub-Ayushi227-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Ayushi227)
