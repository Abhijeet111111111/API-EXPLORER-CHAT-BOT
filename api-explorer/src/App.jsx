import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk/client.js";
import CloudFlare from "cloudflare";
import {
  Send,
  Bookmark,
  BookmarkIcon,
  Copy,
  CheckCircle2,
  Zap,
  Filter,
  X,
  Plus,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { data } from "autoprefixer";

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://api-explorer-chat-bot.onrender.com";
console.log(API);

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
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [selectedLLM, setSelectedLLM] = useState("gemini");
  const [llmStatus, setLlmStatus] = useState(null);
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chatHistory") || "[]");
    } catch {
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    try {
      const savedId = localStorage.getItem("currentChatId");
      return savedId || null;
    } catch {
      return null;
    }
  });
  const [filters, setFilters] = useState({
    category: "All",
    techStack: "All",
    freeOnly: false,
    indianOnly: false,
    openSourceOnly: false,
    protocol: "All",
  });
  const messagesEndRef = useRef(null);
  console.log(messages);

  const llmOptions = [
    { id: "gemini", name: "Google Gemini", icon: "🤖" },
    { id: "groq", name: "Groq", icon: "⚡" },
    { id: "cloudflare", name: "Cloudflare", icon: "☁️" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat when current chat ID changes
  useEffect(() => {
    if (currentChatId) {
      const chat = chatHistory.find((c) => c.id === currentChatId);
      if (chat) {
        setMessages(chat.messages);
      }
    } else {
      setMessages([]);
    }
  }, [currentChatId, chatHistory]);

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

  // Save chat history whenever messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      const updatedHistory = chatHistory.map((chat) => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: messages,
            updatedAt: new Date().toISOString(),
          };
        }
        return chat;
      });
      setChatHistory(updatedHistory);
      localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
    }
  }, [messages]);

  // Save current chat ID
  useEffect(() => {
    localStorage.setItem("currentChatId", currentChatId || "");
  }, [currentChatId]);

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChatHistory((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
  };

  const deleteChat = (chatId) => {
    const updatedHistory = chatHistory.filter((chat) => chat.id !== chatId);
    setChatHistory(updatedHistory);
    localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));

    if (currentChatId === chatId) {
      if (updatedHistory.length > 0) {
        setCurrentChatId(updatedHistory[0].id);
      } else {
        setCurrentChatId(null);
        setMessages([]);
      }
    }
  };

  const loadChat = (chatId) => {
    setCurrentChatId(chatId);
    setShowChatSidebar(false);
  };

  const updateChatTitle = (chatId, newTitle) => {
    const updatedHistory = chatHistory.map((chat) => {
      if (chat.id === chatId) {
        return { ...chat, title: newTitle };
      }
      return chat;
    });
    setChatHistory(updatedHistory);
    localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
  };

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

  const callCloudFlareApi = async (userQuery) => {
    const res = await fetch(`${API}/api/ai/cloudFlare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: buildPrompt(userQuery) }],
      }),
    });

    const data = await res.json();
    let recommendations = [];
    try {
      const parsed = JSON.parse(data.result.response);
      recommendations = parsed.recommendations;
    } catch (err) {
      console.error("Parsing failed:", err);
      throw new Error("Failed to parse CloudFlare response");
    }

    return { recommendations };
  };

  const callGroqApi = async (userQuery) => {
    const res = await fetch(`${API}/api/ai/groq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: buildPrompt(userQuery) }],
      }),
    });
    const chatCompletion = await res.json();
    const recommendation = JSON.parse(
      chatCompletion.choices[0].message.content,
    );
    return recommendation;
  };

  const callGeminiAPI = async (userQuery) => {
    try {
      const res = await fetch(`${API}/api/ai/googleGemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildPrompt(userQuery),
        }),
      });

      const data = await res.json();
      const result = JSON.parse(data);
      return result;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  };

  const buildValidationPrompt = (userQuery) => {
    return `Classify the following query:

"${userQuery}"

Is this query related to finding or using APIs?

Respond ONLY in JSON:
{
  "is_api_related": true/false
}`;
  };

  const validateWithGemini = async (userQuery) => {
    try {
      const res = await fetch(`${API}/api/ai/googleGemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: buildValidationPrompt(userQuery),
        }),
      });
      const data = await res.json();
      const parsed =
        typeof data === "string"
          ? JSON.parse(data)
          : typeof data.result === "string"
            ? JSON.parse(data.result)
            : data;

      return parsed;
    } catch (err) {
      console.error("Gemini validation failed:", err);
      throw err;
    }
  };

  const validateWithGroq = async (userQuery) => {
    try {
      const res = await fetch(`${API}/api/ai/groq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: buildValidationPrompt(userQuery) },
          ],
        }),
      });

      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (err) {
      console.error("Groq validation failed:", err);
      throw err;
    }
  };

  const validateWithCloudflare = async (userQuery) => {
    try {
      const res = await fetch(`${API}/api/ai/cloudFlare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: buildValidationPrompt(userQuery) },
          ],
        }),
      });

      const data = await res.json();
      return JSON.parse(data.result.response);
    } catch (err) {
      console.error("Cloudflare validation failed:", err);
      throw err;
    }
  };

  const validateQueryWithFallback = async (userQuery) => {
    const validators = [
      validateWithGroq,
      validateWithCloudflare,
      validateWithGemini,
    ];

    for (const validator of validators) {
      try {
        setLlmStatus("Validating query...");
        const result = await validator(userQuery);

        if (typeof result.is_api_related === "boolean") {
          return result.is_api_related;
        }
      } catch (err) {
        continue;
      }
    }

    return true; // fallback if all fail
  };

  const callLLMWithFallback = async (userQuery) => {
    const llmPriority = {
      gemini: callGeminiAPI,
      groq: callGroqApi,
      cloudflare: callCloudFlareApi,
    };

    // Create priority order with selected LLM first
    const priorityOrder = [selectedLLM];
    Object.keys(llmPriority).forEach((key) => {
      if (key !== selectedLLM) {
        priorityOrder.push(key);
      }
    });

    let lastError = null;
    for (const llmId of priorityOrder) {
      try {
        setLlmStatus(
          `Calling ${llmOptions.find((l) => l.id === llmId)?.name}...`,
        );
        const result = await llmPriority[llmId](userQuery);
        setLlmStatus(`✓ ${llmOptions.find((l) => l.id === llmId)?.name}`);
        return result;
      } catch (error) {
        console.error(`${llmId} API failed:`, error);
        lastError = error;
        setLlmStatus(
          `✗ ${llmOptions.find((l) => l.id === llmId)?.name} failed, trying next...`,
        );
        continue;
      }
    }

    throw new Error(
      `All LLM APIs failed. Last error: ${lastError?.message || "Unknown error"}`,
    );
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Create new chat if no current chat exists
    if (!currentChatId) {
      createNewChat();
    }

    const userMessage = { type: "user", content: inputValue };
    const userInput = inputValue;
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);
    setLlmStatus(null);

    try {
      // const result = await callLLMWithFallback(userInput);

      // ✅ STEP 1: Validate query
      const isValid = await validateQueryWithFallback(userInput);

      if (!isValid) {
        const botMessage = {
          type: "error",
          content:
            "⚠️ I only suggest APIs.\nTry:\n• Payment API\n• WhatsApp API\n• AI APIs",
        };

        setMessages((prev) => [...prev, botMessage]);
        setLoading(false);
        return;
      }

      // ✅ STEP 2: Continue normally
      const result = await callLLMWithFallback(userInput);

      const botMessage = {
        type: "bot",
        content: result?.recommendations || [],
        feedback: null,
      };
      setMessages((prev) => [...prev, botMessage]);

      // Update chat title based on first user query
      if (messages.length === 0) {
        const preview =
          userInput.substring(0, 30) + (userInput.length > 30 ? "..." : "");
        updateChatTitle(currentChatId, preview);
      }
    } catch (error) {
      const errorMessage = {
        type: "error",
        content: `Failed to fetch recommendations: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => setLlmStatus(null), 2000);
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

  const downloadChatAsJSON = () => {
    if (!currentChatId) return;

    const chat = chatHistory.find((c) => c.id === currentChatId);
    if (!chat) return;

    const dataToDownload = {
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: chat.messages,
    };

    const jsonString = JSON.stringify(dataToDownload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chat.title || "chat"}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadChatAsCSV = () => {
    if (!currentChatId) return;

    const chat = chatHistory.find((c) => c.id === currentChatId);
    if (!chat) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Content,Timestamp\n";

    chat.messages.forEach((msg) => {
      const type = msg.type;
      let content = "";

      if (type === "user") {
        content = `"${msg.content.replace(/"/g, '""')}"`;
      } else if (type === "bot" && Array.isArray(msg.content)) {
        const apis = msg.content
          .map((api) => `${api.api_name}: ${api.short_description}`)
          .join(" | ");
        content = `"${apis.replace(/"/g, '""')}"`;
      } else if (type === "error") {
        content = `"${msg.content.replace(/"/g, '""')}"`;
      }

      csvContent += `${type},${content},${new Date().toISOString()}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${chat.title || "chat"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadChatAsHTML = () => {
    if (!currentChatId) return;

    const chat = chatHistory.find((c) => c.id === currentChatId);
    if (!chat) return;

    let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chat.title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #0f172a;
            color: #f1f5f9;
        }
        .header {
            border-bottom: 2px solid #334155;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #06b6d4;
        }
        .header p {
            margin: 5px 0 0 0;
            color: #cbd5e1;
            font-size: 0.9em;
        }
        .message {
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #06b6d4;
        }
        .message.user {
            background-color: #1e3a5f;
            border-left-color: #06b6d4;
            margin-left: 20%;
        }
        .message.bot {
            background-color: #1e293b;
            border-left-color: #10b981;
        }
        .api-card {
            margin: 10px 0;
            padding: 12px;
            background-color: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
        }
        .api-name {
            color: #06b6d4;
            font-weight: bold;
            font-size: 1.1em;
        }
        .api-description {
            color: #cbd5e1;
            font-size: 0.9em;
            margin: 5px 0;
        }
        .api-feature {
            color: #10b981;
            font-size: 0.85em;
            margin: 3px 0;
        }
        .message.error {
            background-color: #5f1f1f;
            border-left-color: #f43f5e;
            color: #fca5a5;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${chat.title}</h1>
        <p>Created: ${new Date(chat.createdAt).toLocaleString()}</p>
        <p>Last Updated: ${new Date(chat.updatedAt).toLocaleString()}</p>
    </div>
`;

    chat.messages.forEach((msg) => {
      if (msg.type === "user") {
        htmlContent += `<div class="message user"><strong>You:</strong> ${msg.content}</div>`;
      } else if (msg.type === "bot" && Array.isArray(msg.content)) {
        htmlContent += `<div class="message bot"><strong>Recommendations:</strong>`;
        msg.content.forEach((api) => {
          htmlContent += `
            <div class="api-card">
                <div class="api-name">${api.api_name}</div>
                <div class="api-description">${api.short_description}</div>
                ${api.key_features.map((f) => `<div class="api-feature">✓ ${f}</div>`).join("")}
                <div class="api-description"><strong>Pricing:</strong> ${api.pricing}</div>
                <div class="api-description"><strong>Difficulty:</strong> ${api.difficulty.level}</div>
            </div>`;
        });
        htmlContent += `</div>`;
      } else if (msg.type === "error") {
        htmlContent += `<div class="message error"><strong>Error:</strong> ${msg.content}</div>`;
      }
    });

    htmlContent += `
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chat.title || "chat"}_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            <button
              onClick={() => setShowChatSidebar(!showChatSidebar)}
              className={`p-2 rounded-lg transition-colors md:hidden ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"}`}
            >
              ☰
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">API Explorer</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* LLM Selector */}
            <select
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-200 border-slate-300"
              } border cursor-pointer disabled:opacity-50`}
              title="Select LLM - will fallback to others if primary fails"
            >
              {llmOptions.map((llm) => (
                <option key={llm.id} value={llm.id}>
                  {llm.icon} {llm.name}
                </option>
              ))}
            </select>

            {/* LLM Status */}
            {llmStatus && (
              <div
                className={`text-xs px-2 py-1 rounded ${
                  llmStatus.includes("✗")
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {llmStatus}
              </div>
            )}

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

            {/* Download Button */}
            {currentChatId && messages.length > 0 && (
              <div className="relative group">
                <button
                  className={`px-3 py-2 rounded-lg transition-colors ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-200 hover:bg-slate-300"}`}
                  title="Download chat"
                >
                  <Download className="w-5 h-5" />
                </button>
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg hidden group-hover:block z-50 ${theme === "dark" ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-300"}`}
                >
                  <button
                    onClick={downloadChatAsJSON}
                    className={`w-full text-left px-4 py-2 hover:bg-cyan-600 transition-colors rounded-t-lg text-sm`}
                  >
                    📄 Download as JSON
                  </button>
                  <button
                    onClick={downloadChatAsCSV}
                    className={`w-full text-left px-4 py-2 hover:bg-cyan-600 transition-colors text-sm`}
                  >
                    📊 Download as CSV
                  </button>
                  <button
                    onClick={downloadChatAsHTML}
                    className={`w-full text-left px-4 py-2 hover:bg-cyan-600 transition-colors rounded-b-lg text-sm`}
                  >
                    🌐 Download as HTML
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex gap-0 max-w-7xl mx-auto h-[calc(100vh-64px)]">
        {/* Chat History Sidebar - Collapsible */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showChatSidebar ? "w-64" : "w-0"
          } border-r ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="w-64 h-full p-4 overflow-y-auto">
            <button
              onClick={createNewChat}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg font-semibold mb-4 transition-all ${theme === "dark" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-cyan-500 hover:bg-cyan-600 text-white"}`}
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold mb-3 text-cyan-400 uppercase tracking-widest">
                Chat History
              </h3>
              {chatHistory.length === 0 ? (
                <p
                  className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                >
                  No chats yet. Start a new conversation!
                </p>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-all ${
                      currentChatId === chat.id
                        ? theme === "dark"
                          ? "bg-slate-700 border border-cyan-500/50"
                          : "bg-slate-200 border border-cyan-400"
                        : theme === "dark"
                          ? "hover:bg-slate-800 border border-transparent"
                          : "hover:bg-slate-100 border border-transparent"
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {chat.title}
                        </p>
                        <p
                          className={`text-xs mt-1 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                        >
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${theme === "dark" ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-300 text-slate-500"}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar Toggle Button */}
        <button
          onClick={() => setShowChatSidebar(!showChatSidebar)}
          className={`hidden md:flex items-center justify-center w-12 border-r ${theme === "dark" ? "bg-slate-900/50 border-slate-800 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100"} transition-colors`}
          title={showChatSidebar ? "Hide chat history" : "Show chat history"}
        >
          {showChatSidebar ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

        {/* Filters Sidebar - Collapsible */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showFiltersPanel ? "w-80" : "w-0"
          } border-r ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="w-80 h-full p-6 overflow-y-auto">
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
        </div>

        {/* Filters Panel Toggle Button */}
        <button
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`hidden lg:flex items-center justify-center w-12 border-r ${theme === "dark" ? "bg-slate-900/50 border-slate-800 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100"} transition-colors`}
          title={showFiltersPanel ? "Hide filters" : "Show filters"}
        >
          {showFiltersPanel ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>

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
