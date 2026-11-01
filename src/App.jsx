import React, { useState, useEffect, useRef } from "react";

// Zero-dependency markdown formatter: converts **bold**, bullet points, and line breaks into clean JSX
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const formattedElements = [];
  let currentList = [];

  const parseInline = (line, lineKey) => {
    // Regex splits on **bold text**
    const parts = line.split(/(\*\*[^*]+?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={`${lineKey}-${pIdx}`} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Handle bullet points (* or -)
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const content = trimmed.slice(2);
      currentList.push(
        <li key={`li-${idx}`} className="ml-4 list-disc text-slate-700 leading-relaxed my-0.5">
          {parseInline(content, idx)}
        </li>
      );
      return;
    }

    // Flush active list if we encounter regular text
    if (currentList.length > 0) {
      formattedElements.push(
        <ul key={`ul-${idx}`} className="my-2 space-y-1">
          {currentList}
        </ul>
      );
      currentList = [];
    }

    // Empty line / paragraph break
    if (!trimmed) {
      formattedElements.push(<div key={`br-${idx}`} className="h-2" />);
      return;
    }

    // Standard paragraph
    formattedElements.push(
      <p key={`p-${idx}`} className="leading-relaxed text-slate-700 my-1">
        {parseInline(line, idx)}
      </p>
    );
  });

  if (currentList.length > 0) {
    formattedElements.push(
      <ul key="ul-end" className="my-2 space-y-1">
        {currentList}
      </ul>
    );
  }

  return <div className="space-y-0.5">{formattedElements}</div>;
}

const STARTER_PROMPTS = [
  {
    category: "Biomechanics",
    title: "Peregrine Falcon Dive",
    desc: "How does it survive 25G pullout forces at 300+ km/h?",
    query: "How fast can a peregrine falcon dive and survive extreme G-force?"
  },
  {
    category: "Cephalopoda",
    title: "Octopus Camouflage",
    desc: "How do chromatophores change skin color and texture in milliseconds?",
    query: "How do octopuses alter skin texture and color dynamically?"
  },
  {
    category: "Extremophiles",
    title: "Tardigrade Survival",
    desc: "What cryptobiotic mechanics protect them in deep space?",
    query: "What biological mechanisms allow tardigrades to survive the vacuum of space?"
  },
  {
    category: "Bio-Acoustics",
    title: "Elephant Infrasound",
    desc: "How do herds communicate seismic signals through foot pads?",
    query: "How do African elephants communicate through seismic waves in the ground?"
  }
];

const TAXONOMY_SHORTCUTS = [
  { name: "Mammalia", icon: "🐾", sample: "Unique adaptations of monotremes like the platypus" },
  { name: "Aves", icon: "🪶", sample: "Aerodynamic wing morphology of wandering albatrosses" },
  { name: "Marine Life", icon: "🐋", sample: "Echolocation anatomy in sperm whales" },
  { name: "Invertebrata", icon: "🦂", sample: "Immune mechanics of horseshoe crab hemolymph" }
];

export default function App() {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = sessionStorage.getItem("animalnet_sessions");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "sess-" + Date.now(),
        title: "New Investigation",
        messages: [], // Starts empty so the clean Hero state shows immediately
        createdAt: Date.now()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessions[0]?.id || "sess-default";
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  // Default sidebar closed on mobile screens (< 768px)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return false;
  });

  const messagesEndRef = useRef(null);

  // Sync session state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("animalnet_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, [sessions]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId, isLoading]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const createNewSession = () => {
    const newSession = {
      id: "sess-" + Date.now(),
      title: "New Investigation",
      messages: [],
      createdAt: Date.now()
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    closeMobileSidebar();
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      createNewSession();
      setSessions((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleSend = async (queryOverride) => {
    const textToSend = (queryOverride || input).trim();
    if (!textToSend || isLoading) return;

    setInput("");
    closeMobileSidebar();

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage = { role: "user", text: textToSend, timestamp: nowStr };

    // Update messages and set title
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const isFirstQuery = s.messages.length === 0;
          return {
            ...s,
            title: isFirstQuery ? textToSend.slice(0, 26) + (textToSend.length > 26 ? "..." : "") : s.title,
            messages: [...s.messages, userMessage]
          };
        }
        return s;
      })
    );

    setIsLoading(true);
    setStatusText("Searching DuckDuckGo for live zoological facts...");

    try {
      const currentHistory = activeSession.messages
        .slice(-4)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          history: [...currentHistory, { role: "user", text: textToSend }]
        })
      });

      setStatusText("Synthesizing research dossier with Qwen 3.8 27B...");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Server status ${res.status}`);
      }

      const botMessage = {
        role: "assistant",
        text: data.answer || "No response received.",
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, botMessage] }
            : s
        )
      );
    } catch (err) {
      const errorMessage = {
        role: "assistant",
        text: `⚠️ **Notice:** ${err.message}`,
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
      setStatusText("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased overflow-hidden relative">
      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 sm:w-80 bg-white border-r border-slate-200 shadow-xl md:shadow-none flex flex-col transition-transform duration-300 ease-in-out shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm text-base">
              🌿
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-sm">
                  AnimalNet<span className="text-emerald-600">.ai</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Wildlife Intelligence</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg md:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
            </svg>
            New Investigation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 py-1">
            Investigations
          </p>
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  closeMobileSidebar();
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? "bg-emerald-50 text-emerald-950 font-semibold border border-emerald-200"
                    : "text-slate-600 hover:bg-slate-50 font-normal border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? "text-emerald-600" : "text-slate-400"}>💬</span>
                  <span className="truncate">{sess.title}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(e, sess.id)}
                  title="Delete investigation"
                  className="opacity-70 md:opacity-0 group-hover:opacity-100 hover:text-rose-600 text-slate-400 p-1 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Taxonomy Shortcuts
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {TAXONOMY_SHORTCUTS.map((tax, tIdx) => (
              <button
                key={tIdx}
                onClick={() => handleSend(tax.sample)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-900 text-[11px] font-medium transition-all truncate text-left shadow-2xs"
              >
                <span>{tax.icon}</span>
                <span className="truncate">{tax.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Groq LPU Active
            </span>
            <span className="text-slate-400 font-mono text-[10px]">Qwen 3.8 27B</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#FAFAFA] relative">
        {/* HEADER BAR */}
        <header className="h-14 sm:h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle history sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold text-slate-900 leading-none truncate max-w-[170px] sm:max-w-md">
                {activeSession.title}
              </h1>
              <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">
                Live Zoological RAG
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold text-[11px]">
              Qwen 3.8 27B
            </span>
          </div>
        </header>

        {/* CHAT MESSAGES OR CLEAN HERO EMPTY STATE */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 space-y-5 max-w-4xl w-full mx-auto">
          {/* EMPTY STATE: Hero section with clear call-to-action */}
          {activeSession.messages.length === 0 ? (
            <div className="py-6 sm:py-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 text-2xl sm:text-3xl mb-4">
                🌿
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Explore the Animal Kingdom
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                Autonomous zoological intelligence. Ask any question about wildlife behavior, biomechanics, genetics, or habitats.
              </p>

              {/* STARTER PROMPT CARDS */}
              <div className="w-full mt-8 text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                  Explore Common Topics
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_PROMPTS.map((item, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSend(item.query)}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-[0.99]"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1 group-hover:text-emerald-700 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-end text-xs text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // ACTIVE CHAT STREAM
            activeSession.messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm text-sm mt-0.5">
                      🦅
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-xs shadow-sm font-medium"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <FormattedMessage text={msg.text} />
                    )}

                    {/* SOURCE CITATIONS */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mb-1.5">
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Verified Sources
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-[10px] sm:text-[11px] font-medium"
                            >
                              📄 {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`text-[10px] mt-1.5 ${isUser ? "text-emerald-100 text-right" : "text-slate-400"}`}>
                      {msg.timestamp || ""}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      You
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* TELEMETRY SPINNER */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse text-sm">
                🦅
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 shadow-xs text-xs text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="truncate max-w-[220px] sm:max-w-none">
                  {statusText || "Synthesizing answer..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* INPUT BAR & FOOTER */}
        <footer className="p-3 sm:p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 rounded-xl sm:rounded-2xl shadow-sm transition-all p-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about animal behavior, genetics, or habitats..."
                rows={1}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-transparent outline-none resize-none placeholder:text-slate-400 text-slate-800 max-h-24 sm:max-h-32"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shrink-0 transition-all font-semibold active:scale-95 shadow-xs"
                title="Send query"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

            {/* COPYRIGHT FOOTER */}
            <div className="mt-2 text-center text-[10px] sm:text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2">
              <span>© {new Date().getFullYear()} Sanketh. All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span>AnimalNet.ai</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}