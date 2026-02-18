"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, RefreshCw, AlertTriangle, FileText, Activity, Sparkles, Calendar, Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import parseHtml from "html-react-parser";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/authConfig";
import DashboardModal from "./DashboardModal";
import BriefingContent from "./BriefingContent";
import { BarChart3 } from "lucide-react";

// New Components
import NotificationTicker from "./NotificationTicker";
import TicketDetailModal, { Ticket } from "./TicketDetailModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, FileChartLine } from "lucide-react";
import { jsPDF } from "jspdf";

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

interface CommentaryItem {
  id: string;
  title: string;
  time: string;
  type: "jira" | "azure";
  priority?: string;
}

interface DailyReportData {
  date: string;
  assignedToday: {
    count: number;
    tickets: Array<{ key: string; summary: string }>;
  };
  resolvedToday: {
    count: number;
    tickets: Array<{ key: string; summary: string }>;
  };
  chatbotActions: number;
  userName: string;
}

// ---------------------------------------------------------------------------
// MOCK DATA FOR TICKETS
// ---------------------------------------------------------------------------


const NOTIFICATIONS = [
  "⚠️ System maintenance scheduled for tonight at 02:00 UTC.",
  "🚀 New AKS version 1.28 is now available for upgrade.",
  "📢 Policy update: All VMs must have tags by Friday.",
  "⚡ High CPU usage detected in cluster-alpha-2.",
];


export default function ChatInterface({ prompt, setPrompt }: ChatInterfaceProps) {
  const { instance, accounts } = useMsal();
  const activeAccount = instance.getActiveAccount();

  // Ensure account is set if available
  useEffect(() => {
    if (!activeAccount && accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, activeAccount, instance]);


  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [highlighter, setHighlighter] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  // Updates / Commentary
  const [commentary, setCommentary] = useState<CommentaryItem[]>([]);

  // Ticket Modal State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [recommendationCache, setRecommendationCache] = useState<Record<string, string>>({});

  // Daily Report State
  const [dailyReport, setDailyReport] = useState<DailyReportData | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);

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

  // Poll for commentary / updates
  useEffect(() => {
    const fetchCommentary = async () => {
      try {
        const res = await fetch("http://localhost:3978/updates", {
          headers: {
            // "ngrok-skip-browser-warning": "true",
            "User-Agent": "MyApp"
          }
        });
        const lines = await res.json();

        console.log("📢 Updates received:", lines);

        const sorted = lines
          .sort((a: any, b: any) => {
            // Jira first, then Azure
            if (a.type === "jira" && b.type === "azure") return -1;
            if (a.type === "azure" && b.type === "jira") return 1;
            return 0;
          })
          .map((item: any, i: number) => ({
            id: `${Date.now()}-${i}`,
            title: item.text,
            type: item.type,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));

        setCommentary(sorted);
      } catch (e) {
        // console.error("❌ Commentary fetch failed:", e);
        // Fallback or silence is okay for now
      }
    };

    fetchCommentary();
    const id = setInterval(fetchCommentary, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const getTicketAgeColor = (createdDate?: string) => {
    if (!createdDate) return "bg-slate-50 border-slate-200"; // Default

    const created = new Date(createdDate);
    if (isNaN(created.getTime())) return "bg-slate-50 border-slate-200";

    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);

    if (diffDays <= 2) {
      return "bg-emerald-100 border-emerald-300 text-emerald-900"; // New / One day ago
    } else if (diffDays <= 7) {
      return "bg-amber-100 border-amber-300 text-amber-900"; // Long ago
    } else {
      return "bg-rose-100 border-rose-300 text-rose-900"; // Long long ago
    }
  };

  const [liveMessages, setLiveMessages] = useState<string[]>([]);
  const [shortLiveMessages, setShortLiveMessages] = useState<string[]>([]);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        // Ticker feed
        const resFull = await fetch("http://localhost:3978/updates");
        const dataFull = await resFull.json();
        setLiveMessages(dataFull.map((item: any) => item.text));

        // Briefing feed
        const resShort = await fetch("http://localhost:3978/shortliveupdates");
        const dataShort = await resShort.json();
        setShortLiveMessages(dataShort.map((item: any) => item.text));
      } catch (e) {
        console.error("Updates fetch failed:", e);
      }
    };

    fetchUpdates();
    const interval = setInterval(fetchUpdates, 60000);
    return () => clearInterval(interval);
  }, []);



  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<Ticket[]>([]);
  const [myRfcTickets, setMyRfcTickets] = useState<Ticket[]>([]);
  const [upcomingRfcTickets, setUpcomingRfcTickets] = useState<Ticket[]>([]);
  const [azureHealthIssues, setAzureHealthIssues] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("http://localhost:3978/api/dashboard");
        const data = await res.json();
        console.log("Health issues", data.serviceHealth)
        // Map backend → UI Ticket shape
        const mappedMy: Ticket[] = data.myAndGroupTickets
          .filter((t: any) => t.assignee === activeAccount?.name)
          .map((t: any) => ({
            id: t.key,
            summary: t.summary,
            description: t.description || `Assigned to ${t.assignee} • Status: ${t.status}`,
            time: t.created ? new Date(t.created).toLocaleDateString() : "Recent",
            created: t.created,
            priority: (t.priority || "low").toLowerCase(),
            status: t.status.toLowerCase().includes("progress") ? "in-progress" : "open",
            reporter: t.assignee,
          }));

        const mappedCritical: Ticket[] = data.highCritical.map((t: any) => ({
          id: t.key,
          summary: t.summary,
          description: t.description || `Assigned to ${t.assignee} • Status: ${t.status}`,
          time: t.created ? new Date(t.created).toLocaleDateString() : "Recent",
          created: t.created,
          priority: (t.priority || "critical").toLowerCase(),
          status: "open",
          reporter: t.assignee,
        }));

        // Map RFC tickets assigned to me
        const mappedMyRfc: Ticket[] = (data.myRfcTickets || []).map((t: any) => ({
          id: t.key,
          summary: t.summary,
          description: t.description,
          created: t.created,
          time: t.created ? new Date(t.created).toLocaleDateString() : (t.startDate || "TBD"),
          priority: "medium",
          reporter: t.assignee,
        }));

        // Map upcoming RFC tickets (today/tomorrow)
        const mappedUpcomingRfc: Ticket[] = (data.upcomingRfcTickets || []).map((t: any) => ({
          id: t.key,
          summary: t.summary,
          description: t.description || `Start Date: ${t.startDate || 'TBD'}`,
          time: t.startDate || "TBD",
          created: t.created,
          priority: "medium",
          status: "scheduled",
          reporter: t.assignee,
        }));



        // Map Azure Health Issues to Ticket shape
        const mappedHealth: Ticket[] = (data.serviceHealth || []).map((issue: any, idx: number) => ({
          id: issue.trackingId || `HEALTH-${idx}`,
          summary: issue.issueName || issue.title || issue.service || "Azure Health Issue",
          description: issue.summary || `Service: ${issue.service}\nStatus: ${issue.status}`,
          scope: issue.scope || "",
          service: issue.service || "",
          time: issue.startTime || "Active",
          created: issue.startTime,
          priority: issue.level === "Critical" ? "critical" : issue.level === "Warning" ? "high" : "medium",
          status: (issue.status || "").toLowerCase().includes("resolved") ? "resolved" : "open",
          reporter: "Azure Service Health"
        }));

        setMyTickets(mappedMy);
        setCriticalTickets(mappedCritical);
        setMyRfcTickets(mappedMyRfc);
        setUpcomingRfcTickets(mappedUpcomingRfc);
        setAzureHealthIssues(mappedHealth);
      } catch (err) {
        console.error("Failed to load dashboard tickets", err);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to check if a date string is from "today"
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const ticketsAssignedToday = myTickets.filter(t => isToday(t.created));
  const criticalTicketsToday = criticalTickets.filter(t => isToday(t.created));
  const rfcStartingTodayTomorrow = upcomingRfcTickets; // Backend already filters for today/tomorrow

  const briefingMessages = [
    `${ticketsAssignedToday.length} tickets assigned to me today: ${ticketsAssignedToday.map(t => t.id).join(", ") || 'None'}`,
    `${rfcStartingTodayTomorrow.length} RFC tickets starting today/tomorrow: ${rfcStartingTodayTomorrow.map(t => t.id).join(", ") || 'None'}`,
    `${criticalTicketsToday.length} critical tickets assigned to me/team today: ${criticalTicketsToday.map(t => t.id).join(", ") || 'None'}`
  ];



  // ------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------

  const handleTicketClick = (ticketId: string, source: Ticket[]) => {
    const ticket = source.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
      setIsTicketModalOpen(true);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(res.account);
      console.log("Logged in:", res.account);
    } catch (e) {
      console.error("Login failed:", e);
    }
  };

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
      setMessages([]);
      setPrompt("");
      setConnectionError(false);
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("msal."));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  };

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
      const popupResp = await instance.acquireTokenPopup({
        scopes: ["api://9f25b3b5-9b43-47cf-b9e7-4df2cdeb6656/access_as_user"],
      });
      return popupResp.accessToken;
    }
  };

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
    setShowSummary(false); // Hide briefing when chat starts/continues
    setIsLoading(true);

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
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn("Backend reset failed:", e);
    }
  };

  const handleFetchDailyReport = async () => {
    setIsReportLoading(true);
    try {
      const res = await fetch("http://localhost:3978/api/daily_report");
      const data = await res.json();
      setDailyReport(data);
      setIsReportModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch daily report", err);
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!dailyReport) return;

    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175); // Blue-800
    doc.text(`DAILY REPORT - ${dailyReport.date}`, margin, y);
    y += 15;

    // User Info
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`User: ${dailyReport.userName}`, margin, y);
    y += 10;
    doc.text(`Date: ${dailyReport.date}`, margin, y);
    y += 20;

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-900
    doc.text("SUMMARY", margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`- Tickets Assigned Today: ${dailyReport.assignedToday.count}`, margin + 5, y);
    y += 10;
    doc.text(`- Tickets Resolved Today: ${dailyReport.resolvedToday.count}`, margin + 5, y);
    y += 10;
    doc.text(`- Chatbot Actions: ${dailyReport.chatbotActions}`, margin + 5, y);
    y += 20;

    // Assigned Today Details
    doc.setFontSize(16);
    doc.text("DETAILS - ASSIGNED TODAY", margin, y);
    y += 10;
    doc.setFontSize(10);
    if (dailyReport.assignedToday.tickets.length > 0) {
      dailyReport.assignedToday.tickets.forEach(t => {
        doc.text(`[${t.key}] ${t.summary}`, margin + 5, y);
        y += 7;
        if (y > 280) { doc.addPage(); y = 20; }
      });
    } else {
      doc.text("None", margin + 5, y);
      y += 10;
    }
    y += 10;

    // Resolved Today Details
    doc.setFontSize(16);
    doc.text("DETAILS - RESOLVED TODAY", margin, y);
    y += 10;
    doc.setFontSize(10);
    if (dailyReport.resolvedToday.tickets.length > 0) {
      dailyReport.resolvedToday.tickets.forEach(t => {
        doc.text(`[${t.key}] ${t.summary}`, margin + 5, y);
        y += 7;
        if (y > 280) { doc.addPage(); y = 20; }
      });
    } else {
      doc.text("None", margin + 5, y);
      y += 10;
    }

    // Footer
    y = 280;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Generated by Cloudops AI Copilot", margin, y);

    doc.save(`Daily_Report_${dailyReport.date}.pdf`);
  };

  // ------------------------------------------------------
  // RENDER HELPERS
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
          <div className="p-2 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full text-white h-8 w-8 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div className="max-w-[75%] p-4 bg-slate-100 rounded-lg rounded-bl-none flex items-center">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-slate-700 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
              <span className="w-2 h-2 bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
        {msg.sender === "bot" && (
          <div className="p-2 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full text-white h-8 w-8 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        )}
        <div
          className={`max-w-[75%] p-4 rounded-lg ${msg.sender === "user" ? "bg-slate-700 text-white rounded-br-none" : "bg-slate-100 text-slate-900 rounded-bl-none"
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
          <div className="p-2 bg-slate-700 rounded-full text-white h-8 w-8 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto">

      {/* 1) NOTIFICATION TICKER */}
      {/* 1) NOTIFICATION TICKER - Now showing dynamic Live Updates */}
      {/* 1) NOTIFICATION TICKER - Now showing dynamic Live Updates + Static Notifications */}
      <NotificationTicker messages={liveMessages} />


      <div className="flex gap-4 items-start">
        {/* 2) LEFT SIDEBAR — ACCORDION */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-3 border-b border-gray-100 bg-slate-50 rounded-t-lg">
            <h3 className="font-semibold text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Operations Center
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={handleFetchDailyReport}
                disabled={isReportLoading}
              >
                {isReportLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Daily Report
              </Button>
            </h3>
          </div>

          <Accordion type="multiple" defaultValue={["item-1", "item-2"]} className="w-full px-2">
            {/* SECTION 1: MY TICKETS */}
            <AccordionItem value="item-1">
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-slate-500" />
                  My Tickets ({myTickets.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-3">
                <Select onValueChange={(val) => handleTicketClick(val, myTickets)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a ticket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {myTickets.map(ticket => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        <div className="flex flex-col items-start text-left max-w-[250px]">
                          <span className="font-semibold text-xs flex items-center gap-2">
                            {ticket.id}
                            <Badge variant="outline" className="text-[10px] h-4 py-0 px-1">{ticket.priority}</Badge>
                          </span>
                          <span className="truncate text-xs text-slate-500 w-full">{ticket.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {myTickets.map(t => (
                    <div
                      key={t.id}
                      className={`text-xs p-2 border rounded cursor-pointer hover:opacity-80 transition-colors ${getTicketAgeColor(t.created)}`}
                      onClick={() => handleTicketClick(t.id, myTickets)}
                    >
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>{t.id}</span>
                        <span className="text-[10px] text-slate-400">{t.time}</span>
                      </div>
                      <div className="truncate text-slate-500">{t.summary}</div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 1.5: MY RFC TICKETS */}
            <AccordionItem value="item-1-5">
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  My RFC Tickets ({myRfcTickets.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-3">
                <Select onValueChange={(val) => handleTicketClick(val, myRfcTickets)}>
                  <SelectTrigger className="w-full border-purple-200 bg-purple-50">
                    <SelectValue placeholder="Select RFC ticket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {myRfcTickets.map(ticket => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        <div className="flex flex-col items-start text-left max-w-[250px]">
                          <span className="font-semibold text-xs flex items-center gap-2">
                            {ticket.id}
                            <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 bg-purple-50">RFC</Badge>
                          </span>
                          <span className="truncate text-xs text-slate-500 w-full">{ticket.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {myRfcTickets.map(t => (
                    <div
                      key={t.id}
                      className={`text-xs p-2 border rounded cursor-pointer hover:opacity-80 transition-colors ${getTicketAgeColor(t.created)}`}
                      onClick={() => handleTicketClick(t.id, myRfcTickets)}
                    >
                      <div className="flex justify-between font-medium text-purple-900 mb-1">
                        <span>{t.id}</span>
                        <span className="text-[10px] text-purple-400">{t.time}</span>
                      </div>
                      <div className="truncate text-purple-700">{t.summary}</div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 2: CRITICAL TEAM TICKETS */}
            <AccordionItem value="item-2">
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Critical Team Tickets ({criticalTickets.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-3">
                <Select onValueChange={(val) => handleTicketClick(val, criticalTickets)}>
                  <SelectTrigger className="w-full border-red-200 bg-red-50">
                    <SelectValue placeholder="View critical tickets..." />
                  </SelectTrigger>
                  <SelectContent>
                    {criticalTickets.map(ticket => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        <div className="flex gap-2 items-center">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="font-semibold">{ticket.id}</span>
                          <span className="text-xs text-gray-500 truncate max-w-[150px]">- {ticket.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* List items for quick view */}
                <div className="space-y-2 mt-2">
                  {criticalTickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleTicketClick(t.id, criticalTickets)}
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer hover:opacity-80 transition ${getTicketAgeColor(t.created)}`}
                    >
                      <AlertTriangle className="w-3 h-3 text-red-500 mt-1 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-red-900 flex justify-between">
                          {t.id}
                          <span className="font-normal opacity-70">{t.time}</span>
                        </p>
                        <p className="text-xs text-red-800 truncate">{t.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 2.5: UPCOMING RFC TICKETS */}
            <AccordionItem value="item-2-5">
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  RFC Starting Today/Tomorrow ({upcomingRfcTickets.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-3">
                <Select onValueChange={(val) => handleTicketClick(val, upcomingRfcTickets)}>
                  <SelectTrigger className="w-full border-orange-200 bg-orange-50">
                    <SelectValue placeholder="View RFCs starting today/tomorrow..." />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingRfcTickets.map(ticket => (
                      <SelectItem key={ticket.id} value={ticket.id}>
                        <div className="flex gap-2 items-center">
                          <Calendar className="w-3 h-3 text-orange-500" />
                          <span className="font-semibold">{ticket.id}</span>
                          <span className="text-xs text-gray-500 truncate max-w-[150px]">- {ticket.summary}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2 mt-2">
                  {upcomingRfcTickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleTicketClick(t.id, upcomingRfcTickets)}
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer hover:opacity-80 transition ${getTicketAgeColor(t.created)}`}
                    >
                      <Calendar className="w-3 h-3 text-orange-500 mt-1 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-orange-900 flex justify-between">
                          {t.id}
                          <span className="font-normal opacity-70">{t.time}</span>
                        </p>
                        <p className="text-xs text-orange-800 truncate">{t.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* SECTION 3: AZURE HEALTH ISSUES */}
            <AccordionItem value="item-3">
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  Azure Health Issues ({azureHealthIssues.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-3">
                {azureHealthIssues.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-2">No active health issues</div>
                ) : (
                  <div className="space-y-2">
                    {azureHealthIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleTicketClick(issue.id, azureHealthIssues)}
                        className="text-xs p-2 bg-blue-50 border border-blue-100 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex justify-between font-medium text-blue-900 mb-1">
                          <span>{issue.id}</span>
                          <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 bg-blue-100">
                            {issue.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-blue-700 font-semibold">{issue.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>


          </Accordion>

          {/* Color Legend */}
          <div className="mt-6 p-3 bg-white/50 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Sparkles className="w-3 h-3 text-slate-400" />
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ticket Age Legend</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium p-1.5 rounded-md hover:bg-white transition-colors">
                <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 shrink-0 shadow-sm"></div>
                <span>New / Recent (0-2 days)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium p-1.5 rounded-md hover:bg-white transition-colors">
                <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 shrink-0 shadow-sm"></div>
                <span>Active / Older (3-7 days)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium p-1.5 rounded-md hover:bg-white transition-colors">
                <div className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300 shrink-0 shadow-sm"></div>
                <span>Stale (&gt; 7 days)</span>
              </div>
            </div>
          </div>
        </div>


        {/* 3) RIGHT — CHAT */}
        <Card className="w-2/3 shadow-lg bg-white border border-gray-200 chat-interface">
          <div className="p-6">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg">
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
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDashboard(true)}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Status
                    </Button>
                    {/* Toggle Summary Button */}
                    <Button
                      size="sm"
                      variant={showSummary ? "secondary" : "outline"}
                      onClick={() => setShowSummary(!showSummary)}
                      title="View Summary"
                    >
                      <Sparkles className="w-4 h-4 mr-1 text-blue-500" />
                      Briefing
                    </Button>

                    <Button size="sm" variant="outline" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
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
            <div className="space-y-4 mb-6 min-h-[400px] max-h-[500px] overflow-y-auto pr-2 relative">
              {showSummary ? (
                <BriefingContent
                  activeAccountName={activeAccount?.name}
                  criticalTickets={criticalTickets}
                  myTickets={myTickets}
                  upcomingRfcTickets={upcomingRfcTickets}
                  briefingMessages={briefingMessages}
                  shortLiveMessages={shortLiveMessages}
                  onClose={messages.length > 0 ? () => setShowSummary(false) : undefined}
                />
              ) : messages.length === 0 ? (
                <div className="flex flex-col h-64 justify-center items-center text-slate-500 space-y-4">
                  <Bot className="w-12 h-12 text-slate-700" />
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
                  className="bg-slate-700 text-white hover:bg-slate-800"
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

          <DashboardModal
            open={showDashboard}
            onClose={() => setShowDashboard(false)}
          />
          {/* 5) TICKET DETAIL MODAL */}
          <TicketDetailModal
            open={isTicketModalOpen}
            onClose={() => setIsTicketModalOpen(false)}
            ticket={selectedTicket}
            recommendation={selectedTicket ? recommendationCache[selectedTicket.id] : undefined}
            onUpdateRecommendation={(id, rec) => setRecommendationCache(prev => ({ ...prev, [id]: rec }))}
          />

          {/* 6) DAILY REPORT MODAL */}
          <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Daily Activity Summary
                </DialogTitle>
                <DialogDescription>
                  Performance report for {dailyReport?.date}
                </DialogDescription>
              </DialogHeader>

              {dailyReport && (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 bg-blue-50 border-blue-100 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-blue-700">{dailyReport.assignedToday.count}</span>
                      <span className="text-[10px] font-medium text-blue-600 uppercase tracking-tight">Assigned Today</span>
                    </Card>
                    <Card className="p-4 bg-emerald-50 border-emerald-100 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-emerald-700">{dailyReport.resolvedToday.count}</span>
                      <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-tight">Resolved Today</span>
                    </Card>
                    <Card className="p-4 bg-purple-50 border-purple-100 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-purple-700">{dailyReport.chatbotActions}</span>
                      <span className="text-[10px] font-medium text-purple-600 uppercase tracking-tight">Bot Actions</span>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Tickets Assigned Today
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-3 max-h-[120px] overflow-y-auto border border-slate-100">
                        {dailyReport.assignedToday.tickets.length > 0 ? (
                          <ul className="space-y-2">
                            {dailyReport.assignedToday.tickets.map(t => (
                              <li key={t.key} className="text-xs flex justify-between gap-2">
                                <span className="font-medium text-slate-700">{t.key}</span>
                                <span className="text-slate-500 truncate text-right">{t.summary}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No tickets assigned today</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Tickets Resolved Today
                      </h4>
                      <div className="bg-emerald-50/30 rounded-lg p-3 max-h-[120px] overflow-y-auto border border-emerald-100">
                        {dailyReport.resolvedToday.tickets.length > 0 ? (
                          <ul className="space-y-2">
                            {dailyReport.resolvedToday.tickets.map(t => (
                              <li key={t.key} className="text-xs flex justify-between gap-2">
                                <span className="font-medium text-emerald-700">{t.key}</span>
                                <span className="text-emerald-600 truncate text-right">{t.summary}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No tickets resolved today</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>Close</Button>
                <Button className="gap-2" onClick={handleDownloadReport}>
                  <Download className="w-4 h-4" />
                  Download Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </div>
  );
}
