import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/auth/authConfig";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/auth/authConfig";
import DashboardPage from "@/components/DashboardModal";

const Index = () => {
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: "/",
    });
  };

  const getAccessToken = async () => {
    if (accounts.length === 0) return null;
    const request = { ...loginRequest, account: accounts[0] };
    const response = await instance.acquireTokenSilent(request);
    return response.accessToken;
  };



  const handleSendMessage = async (prompt: string) => {
    const token = await getAccessToken();
    // Now include the token when you call the backend
    const res = await fetch(`http://localhost:8000/query?user_input=${encodeURIComponent(prompt)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  };




  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="text-center pt-4 mb-2">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5 leading-tight">
          Chat with CloudOps Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Intelligent cloud operations powered by AI
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pb-2">

        {/* CHAT + COMMENTARY */}
        <div className="w-full max-w-7xl">
          <ChatInterface
            prompt={selectedPrompt}
            setPrompt={setSelectedPrompt}
          />
        </div>
      </div>

    </div>
  );
};

export default Index;
