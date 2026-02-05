"use client";

import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";
import ChatInterface from "./ChatInterface"; // assuming same folder
import DashboardPage from "./DashboardModal";
export default function ChatPage() {
  const { accounts } = useMsal();
  const [prompt, setPrompt] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (accounts.length === 0) {
      window.location.href = "/login";
    }
  }, [accounts]);

  if (accounts.length === 0) {
    return <p>Redirecting...</p>;
  }
  
  return <ChatInterface prompt={prompt} setPrompt={setPrompt} />;
}
