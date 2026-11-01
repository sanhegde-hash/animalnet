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
            raw = list(ddgs.text(f"{query} animal biology wildlife facts", max_results=3))
            for item in raw:
                results.append({
                    "title": item.get("title", "Web Source"),
                    "body": item.get("body", "")
                })
    except Exception:
        pass
    return results

@app.post("/api/chat")
def handle_chat(req: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY environment variable is not configured in Vercel."
        )

    try:
        # 1. Retrieve web context
        search_data = search_wildlife(req.query)
        context_text = "\n\n".join([f"[{i+1}] {item['body']}" for i, item in enumerate(search_data)])

        # 2. Scope guardrail
        system_instruction = (
            "You are AnimalNet.ai, an expert zoologist and wildlife research AI. "
            "SCOPE RESTRICTION: You may ONLY answer questions related to animals, marine life, insects, birds, ecosystems, and wildlife biology.\n"
            "If the user asks about anything outside this domain (such as coding, human politics, math, business, cryptocurrencies, or general trivia), "
            "do NOT answer their question. Instead, reply strictly with: "
            "'I am AnimalNet.ai, specialized exclusively in the animal kingdom. Please ask me about wildlife species, habitats, anatomy, or animal behaviors!'\n"
            "For valid animal questions, use the provided Web Context to deliver an accurate, concise, and structured explanation."
        )

        messages = [
            {"role": "system", "content": system_instruction}
        ]

        # Add recent conversation turns
        for msg in req.history[-3:]:
            messages.append({"role": msg.role, "content": msg.text})

        # Inject current query along with web context
        user_content = f"Web Context:\n{context_text}\n\nQuestion: {req.query}"
        messages.append({"role": "user", "content": user_content})

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.2
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

        return {
            "answer": answer,
            "sources": [item["title"] for item in search_data if item.get("title")]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))