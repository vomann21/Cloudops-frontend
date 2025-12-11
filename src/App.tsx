import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "@/auth/authConfig";
import LoginPage from "./components/login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

const AppContent = () => {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      const loginResponse = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(loginResponse.account);
      console.log("Login successful:", loginResponse.account);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <>
      {/* Show Login Page when user is NOT authenticated */}
      <UnauthenticatedTemplate>
        <LoginPage onLogin={handleLogin} />
      </UnauthenticatedTemplate>

      {/* Show main app when user IS authenticated */}
      <AuthenticatedTemplate>
        <BrowserRouter>
          <main className="w-full">
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthenticatedTemplate>
    </>
  );
};

const App = () => (
  <MsalProvider instance={msalInstance}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </MsalProvider>
);

export default App;