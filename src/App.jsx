import React, { useState, useEffect, useRef } from "react";

// Minimalist outline animal logo
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
      <path d="M4 8.5L7 3.5L10 6.5H14L17 3.5L20 8.5L18.5 15L12 21L5.5 15L4 8.5Z" />
      <path d="M9 10.5L12 13.5L15 10.5" />
      <path d="M12 13.5V17" />
      <circle cx="8.5" cy="10" r="0.75" fill="currentColor" />
      <circle cx="15.5" cy="10" r="0.75" fill="currentColor" />
    </svg>
  );
}

// Zero-dependency markdown parser for bolding, bullet lists, and paragraphs
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

// 4 Relatable, Clickable Starter Cards
const QUICK_PROMPTS = [
  {
    icon: "🐕",
    tag: "Pets",
    title: "Do dogs dream about us?",
    desc: "Why their paws twitch in sleep",
    theme: "border-amber-200/90 bg-gradient-to-br from-amber-50/80 to-white hover:border-amber-400",
    pill: "bg-amber-100/80 text-amber-800",
    query: "Do dogs dream about their owners when they sleep and twitch?"
  },
  {
    icon: "🦅",
    tag: "Flight",
    title: "Falcon 300+ km/h dive",
    desc: "How they survive 25G pullout forces",
    theme: "border-sky-200/90 bg-gradient-to-br from-sky-50/80 to-white hover:border-sky-400",
    pill: "bg-sky-100/80 text-sky-800",
    query: "How fast can a peregrine falcon dive and survive the extreme G-force?"
  },
  {
    icon: "🐙",
    tag: "Ocean",
    title: "Instant octopus camouflage",
    desc: "Shifting skin color & texture in seconds",
    theme: "border-teal-200/90 bg-gradient-to-br from-teal-50/80 to-white hover:border-teal-400",
    pill: "bg-teal-100/80 text-teal-800",
    query: "How do octopuses change color and texture so fast to match rocks?"
  },
  {
    icon: "⚡",
    tag: "Weird",
    title: "Electric eels don't self-shock",
    desc: "Producing 800V safely",
    theme: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-white hover:border-emerald-400",
    pill: "bg-emerald-100/80 text-emerald-800",
    query: "How do electric eels produce up to 860 volts without electrocuting themselves?"
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
      const saved = sessionStorage.getItem("animalnet_v3_sessions");
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
      sessionStorage.setItem("animalnet_v3_sessions", JSON.stringify(sessions));
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

    // Extract prior message history BEFORE updating state with the current query
    const currentHistory = activeSession.messages
      .slice(-4)
      .map((m) => ({ role: m.role, text: m.text }));

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const isFirstQuery = s.messages.length === 0;
          return {
            ...s,
            title: isFirstQuery ? textToSend.slice(0, 24) + (textToSend.length > 24 ? "..." : "") : s.title,
            messages: [...s.messages, userMessage]
          };
        }
        return s;
      })
    );

    setIsLoading(true);
    setStatusText("Fact-checking the web & finding photos...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          history: currentHistory
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
        images: data.images || [],
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
        images: [],
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
    <div className="flex h-[100dvh] w-screen bg-[#F8FAF9] text-slate-800 font-sans antialiased overflow-hidden relative">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm">
              <AnimalLogo className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-sm">
                  AnimalNet<span className="text-emerald-600">.ai</span>
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

        <div className="p-3">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
            </svg>
            Ask New Question
          </button>
        </div>

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

      {/* MAIN SCREEN */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#F8FAF9] relative">
        {/* HEADER BAR */}
        <header className="h-14 sm:h-16 px-3.5 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
              Qwen 3.8 27B
            </span>
          </div>
        </header>

        {/* MAIN BODY: 4 DISCOVERY CARDS OR ACTIVE CHAT */}
        <main className="flex-1 overflow-y-auto px-3.5 sm:px-6 md:px-8 py-3.5 sm:py-5 space-y-4 max-w-3xl w-full mx-auto">
          {activeSession.messages.length === 0 ? (
            /* BRAND NEW LANDING: COMPACT TOP HERO & 4 RELATABLE CARDS */
            <div className="py-2 sm:py-4 flex flex-col">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <AnimalLogo className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Ask Anything About Animals
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-normal">
                    Search-backed answers for pet habits, wild creatures, and nature facts.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tap to Explore
                </span>
                <span className="text-[11px] font-medium text-emerald-600">Quick inquiries</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {QUICK_PROMPTS.map((item, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSend(item.query)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all shadow-2xs active:scale-[0.98] ${item.theme}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base">{item.icon}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.pill}`}>
                          {item.tag}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-end text-[11px] font-semibold text-emerald-700">
                      Ask →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT FEED */
            activeSession.messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-2.5 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <AnimalLogo className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-3.5 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-sm font-medium"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {/* PHOTO GALLERY CARDS */}
                    {!isUser && msg.images && msg.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {msg.images.map((img, iIdx) => (
                          <div
                            key={iIdx}
                            className="relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200/90 aspect-video group"
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display = "none";
                              }}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-white font-medium line-clamp-1">
                                {img.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <FormattedMessage text={msg.text} />
                    )}

                    {/* SOURCE PILLS */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Verified Sources
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 text-[10px] sm:text-[11px] font-medium"
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
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      You
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AnimalLogo className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs text-emerald-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="truncate max-w-[210px] sm:max-w-none">
                  {statusText || "Fact-checking live research..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* INPUT PROMPT BAR & FOOTER */}
        <footer className="p-2.5 sm:p-4 bg-gradient-to-t from-white via-white to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-white border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 rounded-xl sm:rounded-2xl shadow-sm transition-all p-1 sm:p-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about dogs, cats, wild predators, or deep sea life..."
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

            <div className="mt-2 text-center text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <span>© {new Date().getFullYear()} Sanketh. All rights reserved.</span>
              <span>•</span>
              <span>AnimalNet.ai</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}