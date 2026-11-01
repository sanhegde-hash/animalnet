import React, { useState, useEffect, useRef } from "react";

// Minimalist outline animal logo (Lion & Wolf geometric fusion)
function AnimalLogo({ className = "w-5 h-5 text-white" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Sleek geometric animal face & ears outline */}
      <path d="M4 8.5L7 3.5L10 6.5H14L17 3.5L20 8.5L18.5 15L12 21L5.5 15L4 8.5Z" />
      <path d="M9 10.5L12 13.5L15 10.5" />
      <path d="M12 13.5V17" />
      <circle cx="8.5" cy="10" r="0.75" fill="currentColor" />
      <circle cx="15.5" cy="10" r="0.75" fill="currentColor" />
    </svg>
  );
}

// Markdown Formatter: renders **bold** text, bullet points, and paragraphs cleanly
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const formattedElements = [];
  let currentList = [];

  const parseInline = (line, lineKey) => {
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

    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const content = trimmed.slice(2);
      currentList.push(
        <li key={`li-${idx}`} className="ml-4 list-disc text-slate-700 leading-relaxed my-0.5">
          {parseInline(content, idx)}
        </li>
      );
      return;
    }

    if (currentList.length > 0) {
      formattedElements.push(
        <ul key={`ul-${idx}`} className="my-2 space-y-1">
          {currentList}
        </ul>
      );
      currentList = [];
    }

    if (!trimmed) {
      formattedElements.push(<div key={`br-${idx}`} className="h-2" />);
      return;
    }

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
    category: "Pet Psychology",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    title: "Do dogs dream about us?",
    desc: "What goes on in their brains when their paws twitch while sleeping?",
    query: "Do dogs dream about their human owners when they sleep and twitch?"
  },
  {
    category: "Wild Intelligence",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    title: "Crows remembering human faces",
    desc: "Can crows really hold grudges against specific people for years?",
    query: "How do crows recognize and remember specific human faces, and do they hold grudges?"
  },
  {
    category: "Ocean Mysteries",
    badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    title: "Electric eels & self-shocking",
    desc: "How do they produce up to 860 volts without electrocuting themselves?",
    query: "How do electric eels produce high voltage electricity without shocking themselves?"
  },
  {
    category: "Apex Predators",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    title: "Orcas hunting Great Whites",
    desc: "How do killer whales hunt great white sharks with surgical precision?",
    query: "How do killer whales hunt great white sharks and why do they target the liver?"
  }
];

const QUICK_CATEGORIES = [
  { name: "Pets & Companions", icon: "🐕", sample: "Why do cats purr, and is it always because they're happy?" },
  { name: "Wild Predators", icon: "🦁", sample: "How do lions coordinate ambushes when hunting in complete darkness?" },
  { name: "Ocean Mysteries", icon: "🐬", sample: "Do dolphins call each other by distinct signature whistle names?" },
  { name: "Weird & Wonders", icon: "🦎", sample: "Why can chameleons move their eyes in two different directions at once?" }
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
        title: "New Curiosity",
        messages: [],
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

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return false;
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem("animalnet_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, [sessions]);

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
      title: "New Curiosity",
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
    setStatusText("Fact-checking the web for animal evidence...");

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

      setStatusText("Synthesizing answer with Qwen 3.8 27B...");
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
    <div className="flex h-[100dvh] w-screen bg-[#F4F7F6] text-slate-800 font-sans antialiased overflow-hidden relative">
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
        {/* LOGO & APP TITLE */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm shadow-emerald-700/20">
              <AnimalLogo className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-sm">
                  AnimalNet<span className="text-emerald-600">.ai</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800">
                  AI
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Animal Knowledge Hub</span>
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

        {/* NEW QUESTION BUTTON */}
        <div className="p-3">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
            </svg>
            Ask New Question
          </button>
        </div>

        {/* PAST QUESTIONS LIST */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 py-1">
            Recent Conversations
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
                  <span className={isActive ? "text-emerald-600" : "text-slate-400"}>🐾</span>
                  <span className="truncate">{sess.title}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(e, sess.id)}
                  title="Delete chat"
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

        {/* RELATABLE ANIMAL CATEGORIES */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Explore By World
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_CATEGORIES.map((cat, cIdx) => (
              <button
                key={cIdx}
                onClick={() => handleSend(cat.sample)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-900 text-[11px] font-medium transition-all truncate text-left shadow-2xs"
              >
                <span>{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FOOTER BADGE */}
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

      {/* MAIN CHAT CANVAS */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#FAFAFA] relative">
        {/* HEADER */}
        <header className="h-14 sm:h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle sidebar"
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
                Instant Wildlife Answers
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
              Qwen 3.8 27B
            </span>
          </div>
        </header>

        {/* CHAT MESSAGES OR FRIENDLY HERO LANDING */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 space-y-5 max-w-4xl w-full mx-auto">
          {activeSession.messages.length === 0 ? (
            /* WARM, FRIENDLY HERO STATE */
            <div className="py-6 sm:py-12 flex flex-col items-center text-center">
              {/* BRAND LOGO */}
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/25 mb-4">
                <AnimalLogo className="w-9 h-9 text-white" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Curious About the Animal Kingdom?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
                From pet behaviors to strange ocean creatures and wild predators—ask anything and get fact-checked, easy-to-understand answers.
              </p>

              {/* CURATED STARTER CARDS */}
              <div className="w-full mt-8 text-left">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Popular Animal Curiosities
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium">Tap to ask</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_PROMPTS.map((item, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSend(item.query)}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-[0.99]"
                    >
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-md ${item.badgeColor}`}>
                          {item.category}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-2.5 mb-1 group-hover:text-emerald-700 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      <div className="mt-3.5 flex items-center justify-end text-xs text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT FEED */
            activeSession.messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <AnimalLogo className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-sm font-medium"
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

          {/* TELEMETRY LOADING STATE */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AnimalLogo className="w-4 h-4 text-white" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 shadow-xs text-xs text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="truncate max-w-[220px] sm:max-w-none">
                  {statusText || "Fact-checking animal research..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* INPUT PROMPT BAR & FOOTER */}
        <footer className="p-3 sm:p-4 md:p-6 bg-gradient-to-t from-white via-white to-transparent shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 rounded-xl sm:rounded-2xl shadow-sm transition-all p-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pet habits, wild predators, sea life, or strange creatures..."
                rows={1}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-transparent outline-none resize-none placeholder:text-slate-400 text-slate-800 max-h-24 sm:max-h-32"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shrink-0 transition-all font-semibold active:scale-95 shadow-xs"
                title="Send question"
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