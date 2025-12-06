import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "@/auth/authConfig";
import { AppSidebar } from "@/components/AppSidebar";
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

      {/* Show full app with sidebar when user IS authenticated */}
      <AuthenticatedTemplate>
        <BrowserRouter>
          <SidebarProvider>
            <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger className="ml-2" />
            </header>
            
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
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