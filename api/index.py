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
        # 1. Fetch text context & matching images simultaneously
        search_data = search_wildlife(req.query)
        image_data = search_animal_images(req.query)

        context_text = "\n\n".join([f"[{i+1}] {item['body']}" for i, item in enumerate(search_data)])

        # 2. Scope guardrail
        system_instruction = (
            "You are AnimalNet.ai, an accessible wildlife research AI designed for the curious general public. "
            "SCOPE RESTRICTION: You may ONLY answer questions related to animals, marine life, insects, birds, pets, ecosystems, and wildlife biology.\n"
            "If the user asks about anything outside this domain (such as coding, math, human politics, crypto, or general trivia), "
            "do NOT answer their question. Instead, reply strictly with: "
            "'I am AnimalNet.ai, specialized exclusively in the animal kingdom. Please ask me about wildlife species, habits, pets, or animal behaviors!'\n"
            "For valid animal questions, provide an engaging, clear, structured explanation using the provided Web Context."
        )

        messages = [{"role": "system", "content": system_instruction}]

        # Append recent history
        for msg in req.history[-3:]:
            messages.append({"role": msg.role, "content": msg.text})

        # Inject user query with context
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
            "temperature": 0.3
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

        # Suppress images if the guardrail rejected an off-topic query
        if "I am AnimalNet.ai, specialized exclusively" in answer:
            image_data = []

        return {
            "answer": answer,
            "sources": [item["title"] for item in search_data if item.get("title")],
            "images": image_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))