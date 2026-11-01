import React, { useState, useRef, useEffect } from "react";

const STARTER_QUERIES = [
  "Why do axolotls never undergo metamorphosis naturally?",
  "How do deep-sea anglerfish find mates in the pitch black?",
  "What is the venom mechanism of the blue-ringed octopus?",
  "How fast can a peregrine falcon dive and survive the G-force?"
];

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to **AnimalNet.ai**. Ask any question across ethology, marine biology, genetics, or wildlife habitats. I crawl live web research and synthesize direct answers.",
      sources: []
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusText]);

  const sendQuery = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const updatedHistory = [...messages, { role: "user", text: textToSend }];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);
    setStatusText("Scanning wildlife data & DuckDuckGo indexes...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          history: updatedHistory.slice(-4).map((m) => ({ role: m.role, text: m.text }))
        })
      });

      setStatusText("Synthesizing answer with Qwen 2.5...");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No response received.",
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Connection error: Unable to process the request right now.",
          sources: []
        }
      ]);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-emerald-400">AnimalNet<span className="text-white">.ai</span></h1>
            <p className="text-xs text-slate-400">Search-Augmented Wildlife Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Engine: Qwen 2.5 1.5B (HF Serverless)
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto space-y-5">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`rounded-2xl px-5 py-3.5 max-w-[85%] leading-relaxed text-sm ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-900/20"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Live Web Sources:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {msg.sources.map((s, idx) => (
                      <span key={idx} className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-emerald-400 italic bg-emerald-950/40 border border-emerald-800/40 px-3.5 py-2 rounded-xl w-fit">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            {statusText}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {messages.length === 1 && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => sendQuery(q)}
                className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-full transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <footer className="p-4 border-t border-slate-800 bg-slate-900/70">
        <form onSubmit={(e) => { e.preventDefault(); sendQuery(); }} className="max-w-3xl w-full mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any species, habitat, or wildlife behavior..."
            disabled={loading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium px-5 py-3 rounded-xl text-sm transition shadow-md shadow-emerald-900/30"
          >
            Ask
          </button>
        </form>
      </footer>
    </div>
  );
}