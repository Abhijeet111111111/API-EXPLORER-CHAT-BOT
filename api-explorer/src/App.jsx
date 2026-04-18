import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  Send,
  Bookmark,
  BookmarkIcon,
  Copy,
  CheckCircle2,
  Zap,
  Filter,
  X,
} from "lucide-react";
import { data } from "autoprefixer";

const APIExplorer = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [savedAPIs, setSavedAPIs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("savedAPIs") || "[]");
    } catch {
      return [];
    }
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [filters, setFilters] = useState({
    category: "All",
    techStack: "All",
    freeOnly: false,
    indianOnly: false,
    openSourceOnly: false,
    protocol: "All",
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("savedAPIs", JSON.stringify(savedAPIs));
  }, [savedAPIs]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const quickSuggestions = [
    {
      text: "💳 Payment gateway for India",
      prompt:
        "I need a payment gateway API that works in India with support for UPI and local payment methods",
    },
    {
      text: "📨 Send WhatsApp messages",
      prompt: "Recommend APIs for sending WhatsApp messages programmatically",
    },
    {
      text: "🤖 AI image generation",
      prompt:
        "I need an API for generating, editing, or manipulating images with AI",
    },
    {
      text: "🗺️ Maps and geolocation",
      prompt:
        "Suggest APIs for maps, directions, geocoding, and location services",
    },
    {
      text: "🔐 Authentication service",
      prompt: "Recommend APIs for user authentication and authorization",
    },
    {
      text: "📊 Analytics platform",
      prompt: "I need an API for tracking events, user behavior, and analytics",
    },
  ];

  const buildPrompt = (userQuery) => {
    let prompt = `You are an expert API recommendation assistant. The user needs: "${userQuery}"\n\n`;

    if (filters.category !== "All")
      prompt += `Category preference: ${filters.category}\n`;
    if (filters.techStack !== "All")
      prompt += `Tech stack: ${filters.techStack}\n`;
    if (filters.freeOnly) prompt += `Only recommend FREE APIs\n`;
    if (filters.indianOnly)
      prompt += `Prioritize APIs popular or created in India\n`;
    if (filters.openSourceOnly) prompt += `Only recommend open-source APIs\n`;
    if (filters.protocol !== "All")
      prompt += `Protocol preference: ${filters.protocol}\n`;

    prompt += `\nProvide 3-5 API recommendations in the following JSON format. Return ONLY valid JSON, no other text:
{
  "recommendations": [
    {
      "api_name": "string",
      "short_description": "string (1-2 lines)",
      "key_features": ["feature 1", "feature 2", "feature 3"],
      "pricing": "Free/Paid/Freemium/Trial",
      "documentation_link": "https://...",
      "usage_snippet": "code snippet",
      "difficulty": {"level": "Easy/Medium/Hard", "color": "green/yellow/red"},
      "country_origin": "string (e.g., USA, India)",
      "is_open_source": boolean
    }
  ]
}`;
    return prompt;
  };

  const callGeminiAPI = async (userQuery) => {
    // const apiKey = prompt("Please enter your Google Gemini API key:", "");
    // if (!apiKey) return null;
    const apiKey = import.meta.env.GEMINI_API_KEY;

    console.log("API Key loaded:", apiKey ? "Yes ✓" : "No ✗");
    console.log("Environment variables:", import.meta.env);
    const ai = new GoogleGenAI({
      apiKey: import.meta.env.GEMINI_API_KEY,
    });
    console.log(import.meta);
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: buildPrompt(userQuery),
      });
      const responseText = result.text;

      if (!responseText) throw new Error("No response from API");
      const data = JSON.parse(responseText);
      console.log(data);

      return JSON.parse(responseText);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const result = await callGeminiAPI(inputValue);

      const botMessage = {
        type: "bot",
        content: result?.recommendations || [],
        feedback: null,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        type: "error",
        content: `Failed to fetch recommendations: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveAPI = (api) => {
    const isAlreadySaved = savedAPIs.some((a) => a.api_name === api.api_name);
    if (isAlreadySaved) {
      setSavedAPIs((prev) => prev.filter((a) => a.api_name !== api.api_name));
    } else {
      setSavedAPIs((prev) => [...prev, api]);
    }
  };

  const isAPISaved = (apiName) => savedAPIs.some((a) => a.api_name === apiName);

  const copyToClipboard = (text, snippetId) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(snippetId);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleFeedback = (messageIndex, feedback) => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[messageIndex]?.type === "bot") {
        updated[messageIndex].feedback = feedback;
      }
      return updated;
    });
  };

  const getDifficultyColor = (level) => {
    const colors = {
      Easy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      Hard: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    };
    return colors[level] || colors["Medium"];
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900"}`}
    >
      <style>{`
        [data-theme="dark"] {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --accent-cyan: #06b6d4;
          --accent-emerald: #10b981;
          --accent-amber: #f59e0b;
          --accent-rose: #f43f5e;
          --border-color: #334155;
        }
        [data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #e2e8f0;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --accent-cyan: #0891b2;
          --accent-emerald: #059669;
          --accent-amber: #d97706;
          --accent-rose: #e11d48;
          --border-color: #cbd5e1;
        }
        * {
          font-family: 'Segoe UI', 'Helvetica Neue', system-ui, sans-serif;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.2); }
          50% { box-shadow: 0 0 0 8px rgba(6, 182, 212, 0); }
        }
        .api-card {
          animation: fadeInUp 0.4s ease-out forwards;
        }
        .message-user {
          animation: slideInRight 0.3s ease-out;
        }
        .send-button:hover {
          animation: pulse-glow 1.5s infinite;
        }
        .smooth-scroll {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Header */}
      <header
        className={`sticky top-0 z-40 border-b ${theme === "dark" ? "bg-slate-950/80 border-slate-800" : "bg-white/80 border-slate-200"} backdrop-blur-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">API Explorer</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`px-3 py-2 rounded-lg transition-colors ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"}`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`px-3 py-2 rounded-lg transition-colors ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"}`}
            >
              ⭐ {savedAPIs.length}
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-6 max-w-7xl mx-auto h-[calc(100vh-64px)]">
        {/* Filters Sidebar */}
        <div
          className={`w-80 border-r ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"} p-6 overflow-y-auto transition-all ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 uppercase tracking-widest">
                Filters
              </h3>
              <div className="space-y-3">
                {/* Category */}
                <div>
                  <label className="text-xs font-semibold mb-2 block opacity-70">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${theme === "dark" ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-300"} border`}
                  >
                    {[
                      "All",
                      "Payments",
                      "Messaging",
                      "Authentication",
                      "AI/ML",
                      "Maps",
                      "Storage",
                      "Analytics",
                      "CMS",
                      "Hosting",
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tech Stack */}
                <div>
                  <label className="text-xs font-semibold mb-2 block opacity-70">
                    Tech Stack
                  </label>
                  <select
                    value={filters.techStack}
                    onChange={(e) =>
                      setFilters({ ...filters, techStack: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${theme === "dark" ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-300"} border`}
                  >
                    {[
                      "All",
                      "Node.js",
                      "Python",
                      "Java",
                      "Go",
                      "Rust",
                      "PHP",
                      "Ruby",
                      "React",
                    ].map((stack) => (
                      <option key={stack} value={stack}>
                        {stack}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Protocol */}
                <div>
                  <label className="text-xs font-semibold mb-2 block opacity-70">
                    Protocol
                  </label>
                  <select
                    value={filters.protocol}
                    onChange={(e) =>
                      setFilters({ ...filters, protocol: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${theme === "dark" ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-white border-slate-300"} border`}
                  >
                    {["All", "REST", "GraphQL", "gRPC", "WebSocket"].map(
                      (proto) => (
                        <option key={proto} value={proto}>
                          {proto}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2 pt-2">
                  {[
                    { key: "freeOnly", label: "💰 Free tier only" },
                    { key: "indianOnly", label: "🇮🇳 Indian APIs" },
                    { key: "openSourceOnly", label: "🔓 Open-source only" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer text-sm hover:opacity-80 transition-opacity"
                    >
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(e) =>
                          setFilters({ ...filters, [key]: e.target.checked })
                        }
                        className="w-4 h-4 rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved APIs Section */}
            {savedAPIs.length > 0 && (
              <div
                className={`border-t ${theme === "dark" ? "border-slate-800" : "border-slate-200"} pt-6`}
              >
                <h3 className="text-sm font-semibold mb-3 text-emerald-400 uppercase tracking-widest">
                  Saved APIs
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedAPIs.map((api) => (
                    <div
                      key={api.api_name}
                      className={`p-3 rounded-lg text-xs cursor-pointer transition-all hover:scale-105 ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-slate-100"} border ${theme === "dark" ? "border-slate-700" : "border-slate-300"}`}
                      onClick={() => {
                        setInputValue(`Tell me more about ${api.api_name}`);
                      }}
                    >
                      <p className="font-semibold text-emerald-400">
                        {api.api_name}
                      </p>
                      <p className="text-xs opacity-60 mt-1 line-clamp-2">
                        {api.short_description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div
            className={`flex-1 overflow-y-auto p-6 space-y-6 smooth-scroll ${theme === "dark" ? "bg-gradient-to-b from-slate-950 to-slate-900" : "bg-gradient-to-b from-slate-50 to-white"}`}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center mb-4 mx-auto">
                    <Zap className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Welcome to API Explorer
                  </h2>
                  <p
                    className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                  >
                    Discover the perfect API for your project
                  </p>
                </div>

                {/* Quick Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md mt-8">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(suggestion.prompt);
                        setTimeout(() => {
                          setInputValue(suggestion.prompt);
                          handleSendMessage();
                        }, 100);
                      }}
                      className={`p-3 rounded-lg text-left text-sm transition-all hover:scale-105 border ${theme === "dark" ? "bg-slate-800/50 border-slate-700 hover:bg-slate-700" : "bg-slate-100 border-slate-300 hover:bg-slate-200"}`}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} message-user`}
                  >
                    {message.type === "user" && (
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${theme === "dark" ? "bg-cyan-600 text-white" : "bg-cyan-500 text-white"}`}
                      >
                        {message.content}
                      </div>
                    )}

                    {message.type === "error" && (
                      <div
                        className={`max-w-md px-4 py-3 rounded-lg ${theme === "dark" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-rose-100 text-rose-700 border border-rose-300"}`}
                      >
                        {message.content}
                      </div>
                    )}

                    {message.type === "bot" && (
                      <div className="w-full max-w-3xl space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          {message.content.map((api, apiIdx) => (
                            <div
                              key={apiIdx}
                              className={`api-card p-5 rounded-xl border transition-all hover:shadow-lg ${theme === "dark" ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-slate-50 border-slate-300 hover:bg-slate-100"}`}
                              style={{ animationDelay: `${apiIdx * 50}ms` }}
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-cyan-400 mb-1">
                                    {api.api_name}
                                  </h3>
                                  <p
                                    className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                                  >
                                    {api.short_description}
                                  </p>
                                </div>
                                <button
                                  onClick={() => toggleSaveAPI(api)}
                                  className={`ml-3 p-2 rounded-lg transition-all ${
                                    isAPISaved(api.api_name)
                                      ? "text-amber-400 bg-amber-500/20"
                                      : theme === "dark"
                                        ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/20"
                                        : "text-slate-400 hover:text-amber-500"
                                  }`}
                                  title={
                                    isAPISaved(api.api_name)
                                      ? "Unsave API"
                                      : "Save API"
                                  }
                                >
                                  <BookmarkIcon
                                    className="w-5 h-5"
                                    fill={
                                      isAPISaved(api.api_name)
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />
                                </button>
                              </div>

                              {/* Features */}
                              <div className="mb-4">
                                <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-widest">
                                  Features
                                </p>
                                <ul className="space-y-1">
                                  {api.key_features.map((feature, fIdx) => (
                                    <li
                                      key={fIdx}
                                      className={`text-sm flex gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                                    >
                                      <span className="text-emerald-400">
                                        ✓
                                      </span>
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Metadata */}
                              <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-t border-b border-slate-700/50">
                                <div>
                                  <p className="text-xs opacity-50 font-semibold mb-1">
                                    Pricing
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {api.pricing}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs opacity-50 font-semibold mb-1">
                                    Difficulty
                                  </p>
                                  <span
                                    className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getDifficultyColor(api.difficulty.level)}`}
                                  >
                                    {api.difficulty.level}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs opacity-50 font-semibold mb-1">
                                    Origin
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {api.country_origin || "Global"}
                                  </p>
                                </div>
                              </div>

                              {/* Code Snippet */}
                              <div className="mb-4">
                                <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-widest">
                                  Example
                                </p>
                                <div
                                  className={`p-3 rounded-lg font-mono text-xs overflow-x-auto ${theme === "dark" ? "bg-slate-900" : "bg-slate-100"}`}
                                >
                                  {api.usage_snippet}
                                </div>
                                <button
                                  onClick={() =>
                                    copyToClipboard(api.usage_snippet, apiIdx)
                                  }
                                  className={`mt-2 text-xs py-1 px-2 rounded flex items-center gap-1 transition-all ${
                                    copiedSnippet === apiIdx
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : theme === "dark"
                                        ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                                        : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                                  }`}
                                >
                                  {copiedSnippet === apiIdx ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Documentation Link */}
                              <a
                                href={api.documentation_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                → Read Docs
                              </a>
                            </div>
                          ))}
                        </div>

                        {/* Feedback */}
                        <div
                          className={`flex items-center gap-2 text-sm p-3 rounded-lg ${theme === "dark" ? "bg-slate-800/30" : "bg-slate-100"}`}
                        >
                          <span className="opacity-60">Was this helpful?</span>
                          <button
                            onClick={() => handleFeedback(idx, "yes")}
                            className={`px-2 py-1 rounded transition-colors ${message.feedback === "yes" ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-slate-700"}`}
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleFeedback(idx, "no")}
                            className={`px-2 py-1 rounded transition-colors ${message.feedback === "no" ? "bg-rose-500/20 text-rose-400" : "hover:bg-slate-700"}`}
                          >
                            👎
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="p-4 rounded-lg">
                      <div className="flex gap-2">
                        <div
                          className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div
            className={`border-t ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"} p-6`}
          >
            <div
              className={`max-w-3xl mx-auto flex gap-3 p-4 rounded-xl border transition-colors ${theme === "dark" ? "bg-slate-800 border-slate-700 focus-within:border-cyan-500" : "bg-white border-slate-300 focus-within:border-cyan-500"}`}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Describe the API you need... (e.g., 'Payment gateway for India with UPI support')"
                className={`flex-1 outline-none text-sm ${theme === "dark" ? "bg-transparent text-slate-50 placeholder-slate-500" : "bg-transparent text-slate-900 placeholder-slate-500"}`}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || loading}
                className={`send-button p-3 rounded-lg transition-all ${
                  loading || !inputValue.trim()
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:shadow-lg hover:shadow-cyan-500/50 text-white"
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p
              className={`text-xs mt-3 text-center ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}
            >
              💡 Tip: Use filters to narrow down results by category, tech
              stack, pricing, or origin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIExplorer;
