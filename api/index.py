import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from duckduckgo_search import DDGS
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "qwen/qwen3.8-27b"

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = []

def search_wildlife(query: str) -> list:
    """Fetch factual snippets from DuckDuckGo."""
    results = []
    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(f"{query} animal wildlife facts", max_results=3))
            for item in raw:
                results.append({
                    "title": item.get("title", "Web Source"),
                    "body": item.get("body", "")
                })
    except Exception:
        pass
    return results

def search_animal_images(query: str) -> list:
    """Fetch high-res animal photography from DuckDuckGo."""
    images = []
    try:
        with DDGS() as ddgs:
            raw = list(ddgs.images(f"{query} animal wildlife photography", max_results=2))
            for item in raw:
                img_url = item.get("image") or item.get("thumbnail")
                if img_url:
                    images.append({
                        "url": img_url,
                        "title": item.get("title", "Wildlife photograph")
                    })
    except Exception:
        pass
    return images

@app.post("/api/chat")
def handle_chat(req: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY environment variable is not configured in Vercel."
        )

    try:
        # 1. Fetch text context & matching images
        search_data = search_wildlife(req.query)
        image_data = search_animal_images(req.query)

        context_text = "\n\n".join([f"[{i+1}] {item['body']}" for i, item in enumerate(search_data)])
        if not context_text:
            context_text = "No live web search snippet available. Rely on verified zoological facts."

        # 2. Balanced guardrail: Generous to animal queries, strict only on completely unrelated fields
        system_instruction = (
            "You are AnimalNet.ai, a warm, engaging, and knowledgeable wildlife and animal guide.\n"
            "DOMAIN GUIDELINE:\n"
            "- Always answer questions about animals, pets, mammals, birds, reptiles, amphibians, fish, insects, marine creatures, paleontology/dinosaurs, and ecosystems.\n"
            "- Even if the question is very short (e.g., 'What is lion', 'cat', 'elephant facts'), treat it as a valid animal question and give a clear, informative, and structured explanation.\n"
            "- ONLY if the question is entirely unrelated to the living world (such as computer programming, cryptocurrencies, human stock markets, or calculus), decline by saying:\n"
            "'I am AnimalNet.ai, specialized exclusively in the animal kingdom. Please ask me about wildlife species, habits, pets, or animal behaviors!'"
        )

        messages = [{"role": "system", "content": system_instruction}]

        # 3. Add ONLY past messages from history (ensuring proper alternation)
        for msg in req.history:
            if msg.text.strip():
                messages.append({"role": msg.role, "content": msg.text})

        # 4. Inject current query ONCE with web context
        user_content = f"Web Context:\n{context_text}\n\nQuestion: {req.query}"
        messages.append({"role": "user", "content": user_content})

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": 550,
            "temperature": 0.4
        }

        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=25)
        groq_data = response.json()

        if response.status_code != 200:
            error_detail = groq_data.get("error", {}).get("message", str(groq_data))
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Groq API Error: {error_detail}"
            )

        answer = groq_data["choices"][0]["message"]["content"].strip()

        # Suppress images if the query was genuinely off-topic
        if "I am AnimalNet.ai, specialized exclusively" in answer:
            image_data = []

        return {
            "answer": answer,
            "sources": [item["title"] for item in search_data if item.get("title")],
            "images": image_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))