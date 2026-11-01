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

HF_TOKEN = os.environ.get("HF_TOKEN")
HF_API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-1.5B-Instruct"

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = []

def search_wildlife(query: str) -> list:
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
    if not HF_TOKEN:
        raise HTTPException(status_code=500, detail="HF_TOKEN environment variable is not configured.")

    try:
        search_data = search_wildlife(req.query)
        context_text = "\n\n".join([f"[{i+1}] {item['body']}" for i, item in enumerate(search_data)])

        system_instruction = (
            "You are AnimalNet.ai, an expert zoologist and wildlife research AI. "
            "SCOPE RESTRICTION: You may ONLY answer questions related to animals, marine life, insects, birds, ecosystems, and wildlife biology.\n"
            "If the user asks about ANYTHING outside this domain (such as coding, human politics, math, business, crypto, or general trivia), "
            "do NOT answer their question. Instead, reply strictly with: "
            "'I am AnimalNet.ai, specialized exclusively in the animal kingdom. Please ask me about wildlife species, habitats, anatomy, or animal behaviors!'\n"
            "For valid animal questions, use the provided Web Context to provide an accurate, concise, and structured explanation."
        )

        prompt = f"<|im_start|>system\n{system_instruction}<|im_end|>\n"

        for msg in req.history[-3:]:
            role = "user" if msg.role == "user" else "assistant"
            prompt += f"<|im_start|>{role}\n{msg.text}<|im_end|>\n"

        prompt += (
            f"<|im_start|>user\n"
            f"Web Context:\n{context_text}\n\n"
            f"Question: {req.query}<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )

        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 350,
                "temperature": 0.2,
                "return_full_text": False
            }
        }

        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=25)
        hf_data = response.json()

        if isinstance(hf_data, dict) and "error" in hf_data:
            if "loading" in hf_data.get("error", "").lower():
                return {
                    "answer": "The model is currently waking up on Hugging Face's serverless nodes (~20s). Please submit your question once more!",
                    "sources": []
                }
            raise HTTPException(status_code=502, detail=hf_data["error"])

        raw_output = hf_data[0].get("generated_text", "").strip()
        answer = raw_output.replace("<|im_end|>", "").strip()

        return {
            "answer": answer,
            "sources": [item["title"] for item in search_data if item.get("title")]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))