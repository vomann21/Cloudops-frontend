import { useState } from "react";
import { FeatureCard } from "@/components/FeatureCard";
import ChatInterface from "@/components/ChatInterface";
import { ResourceManagementCards } from "@/components/ResourceManagementCards";
import { DollarSign, Server, Search } from "lucide-react";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/auth/authConfig";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/auth/authConfig";


const Index = () => {
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [showResourceManagement, setShowResourceManagement] = useState(false);
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const features = [
    {
      title: "Resource Management",
      description: "Provision, start, stop, scale, or delete Azure resources with intelligent automation.",
      prompt: "Start my VM named test-vm and check its current status.",
      icon: <Server className="w-6 h-6" />,
    },
    {
      title: "Resource Query",
      description: "List and explore existing Azure resources across subscriptions with detailed insights.",
      prompt: "List all storage accounts in East US region with their usage metrics.",
      icon: <Search className="w-6 h-6" />,
    },
    {
      title: "FinOps Advisor",
      description: "Analyze Azure costs, estimate spend, and suggest optimizations to reduce your cloud expenses.",
      prompt: "Show me cost trends for the last 30 days and suggest optimizations.",
      icon: <DollarSign className="w-6 h-6" />,
    },
  ];

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

  const handleCardClick = (prompt: string, isResourceManagement = false) => {
    if (isResourceManagement) {
      setShowResourceManagement(true);
    } else {
      setSelectedPrompt(prompt);
    }
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


  const handleResourceActionClick = (prompt: string) => {
    setSelectedPrompt(prompt);
  };

  const handleBackClick = () => setShowResourceManagement(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="text-center pt-12 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 leading-tight">
          Chat with CloudOps Agent
        </h1>
        <p className="text-lg text-muted-foreground">
          Intelligent cloud operations powered by AI
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-4xl mb-12">
          {!showResourceManagement ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto">
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  prompt={feature.prompt}
                  icon={feature.icon}
                  onClick={(prompt) => handleCardClick(prompt, feature.title === "Resource Management")}
                />
              ))}
            </div>
          ) : (
            <ResourceManagementCards
              onCardClick={handleResourceActionClick}
              onBackClick={handleBackClick}
            />
          )}
        </div>

        <div className="w-full max-w-4xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Start Your Conversation
            </h2>
            <p className="text-muted-foreground text-sm">
              {selectedPrompt ? "Your prompt is ready - customize it or send as is" : "Type your question or select a capability above"}
            </p>
          </div>

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
