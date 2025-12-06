"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import parseHtml from "html-react-parser";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/authConfig";

// LLM UI
import {
  loadHighlighter,
  useCodeBlockToHtml,
  allLangs,
  allLangsAlias,
} from "@llm-ui/code";
import { bundledLanguagesInfo } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import getWasm from "shiki/wasm";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot" | "loading";
  timestamp: Date;
}

interface ChatInterfaceProps {
  prompt: string;
  setPrompt: (val: string) => void;
}

export default function ChatInterface({ prompt, setPrompt }: ChatInterfaceProps) {
  const { instance, accounts } = useMsal();
  const activeAccount = instance.getActiveAccount();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [highlighter, setHighlighter] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Shiki code highlighting init
  useEffect(() => {
    (async () => {
      const hl = await loadHighlighter({
        langs: allLangs(bundledLanguagesInfo),
        langAlias: allLangsAlias(bundledLanguagesInfo),
        themes: Object.values(bundledThemes),
        loadWasm: getWasm,
        engine: "vscode",
      });
      setHighlighter(hl);
    })();
  }, []);

  // ------------------------------------------------------
  // LOGIN
  // ------------------------------------------------------
  const handleLogin = async () => {
    try {
      const res = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(res.account);
      console.log("Logged in:", res.account);
    } catch (e) {
      console.error("Login failed:", e);
    }
  };

  // ------------------------------------------------------
  // LOGOUT (clean MSAL cache)
  // ------------------------------------------------------
  const handleLogout = async () => {
    try {
      const account = instance.getActiveAccount();
      await instance.logoutPopup({
        account,
        mainWindowRedirectUri: "http://localhost:8080",
      });
    } catch (err) {
      console.warn("Logout popup failed:", err);
    } finally {
      instance.setActiveAccount(null);

      // Clear local chat state
      setMessages([]);
      setPrompt("");
      setConnectionError(false);

      // Remove MSAL cache items
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("msal."));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  };

  // ------------------------------------------------------
  // GET ACCESS TOKEN (backend API token)
  // ------------------------------------------------------
  const getAccessToken = async () => {
    if (!activeAccount) throw new Error("Please login first.");

    try {
      const response = await instance.acquireTokenSilent({
        scopes: ["api://9f25b3b5-9b43-47cf-b9e7-4df2cdeb6656/access_as_user"],
        account: activeAccount,
      });

      return response.accessToken;
    } catch (silentErr) {
      console.warn("Silent token failed, using popup…");

      // Force popup token renewal
      const popupResp = await instance.acquireTokenPopup({
        scopes: ["api://9f25b3b5-9b43-47cf-b9e7-4df2cdeb6656/access_as_user"],
      });

      return popupResp.accessToken;
    }
  };

  // ------------------------------------------------------
  // SEND MESSAGE TO BACKEND
  // ------------------------------------------------------
  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setIsLoading(true);

    // Add loading bubble
    const loadingMsg: Message = {
      id: `${Date.now()}-loading`,
      text: "",
      sender: "loading",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const token = await getAccessToken();

      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_input: userMsg.text }),
      });

      if (!res.ok) {
        throw new Error(`Backend error ${res.status}`);
      }

      const data = await res.json();

      // Remove loading bubble
      setMessages((prev) => prev.filter((m) => m.sender !== "loading"));

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          text: data.response,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } catch (error: any) {
      console.error("Send error:", error);

      setMessages((prev) => prev.filter((m) => m.sender !== "loading"));

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          text: `❌ Error: ${error.message}`,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }

    setIsLoading(false);
  };

  // ------------------------------------------------------
  // CLEAR CHAT (optional backend reset)
  // ------------------------------------------------------
  const handleClearChat = async () => {
    setMessages([]);
    setPrompt("");
    setIsLoading(false);
    setConnectionError(false);

    try {
      if (!activeAccount) return;

      const token = await getAccessToken();

      await fetch("http://localhost:8000/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn("Backend reset failed:", e);
    }
  };

  // ------------------------------------------------------
  // RENDER UI
  // ------------------------------------------------------

  const renderCodeBlock = (code: string) => {
    if (!highlighter) return <pre>{code}</pre>;
    const { html } = useCodeBlockToHtml({
      markdownCodeBlock: `\`\`\`\n${code}\n\`\`\``,
      highlighter,
      codeToHtmlOptions: { theme: "github-dark" },
    });
    return html ? parseHtml(html) : <pre>{code}</pre>;
  };

  const renderMessage = (msg: Message) => {
    if (msg.sender === "loading") {
      return (
        <div className="flex gap-3 justify-start" key={msg.id}>
          <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white h-8 w-8 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div className="max-w-[75%] p-4 bg-gray-100 rounded-lg rounded-bl-none flex items-center">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
        {msg.sender === "bot" && (
          <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white h-8 w-8 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        )}
        <div
          className={`max-w-[75%] p-4 rounded-lg ${
            msg.sender === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-100 text-gray-900 rounded-bl-none"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, children }) {
                if (inline) return <code>{children}</code>;
                return renderCodeBlock(String(children));
              },
            }}
          >
            {msg.text}
          </ReactMarkdown>
          <p className="text-xs opacity-60 mt-2">
            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        {msg.sender === "user" && (
          <div className="p-2 bg-blue-600 rounded-full text-white h-8 w-8 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg bg-white border border-gray-200 chat-interface">
      <div className="p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Azure CloudOps Agent</h3>
              {activeAccount ? (
                <p className="text-xs text-gray-600">👋 Hello, {activeAccount.name}</p>
              ) : (
                <p className="text-xs text-gray-500">Please sign in</p>
              )}
              {connectionError && (
                <p className="text-xs text-red-500">⚠️ Connection issues detected</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!activeAccount ? (
              <Button size="sm" onClick={handleLogin}>
                Login
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            )}

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                disabled={isLoading}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* CHAT MESSAGES */}
        <div className="space-y-4 mb-6 min-h-[400px] max-h-[500px] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <div className="flex flex-col h-64 justify-center items-center text-gray-500 space-y-4">
              <Bot className="w-12 h-12 text-blue-500" />
              <p className="font-medium">Start a conversation with Azure CloudOps Agent</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about Azure resources or perform VM actions..."
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Enter</kbd> to send,{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Shift+Enter</kbd> for newline
            </p>

            <Button
              disabled={!prompt.trim() || isLoading}
              onClick={handleSend}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
