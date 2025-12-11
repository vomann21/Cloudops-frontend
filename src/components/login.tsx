// Updated LoginPage.jsx with proper RBAC-ready token handling

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, LogIn, Shield, Sparkles } from "lucide-react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/authConfig";
import { useState } from "react";

export default function LoginPage() {
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      // 1️⃣ Login popup → gets ID token + account
      const loginResponse = await instance.loginPopup(loginRequest);
      instance.setActiveAccount(loginResponse.account);

      // 2️⃣ Get access token for backend (User Token)
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: loginResponse.account,
      });

      const backendAccessToken = tokenResponse.accessToken;
      localStorage.setItem("backend_access_token", backendAccessToken);


    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("interaction_required")
      ) {
        const interactiveResponse = await instance.acquireTokenPopup(
          loginRequest
        );

        localStorage.setItem(
          "backend_access_token",
          interactiveResponse.accessToken
        );

        alert("Interactive login successful. Token received.");
      } else {
        console.error("Login failed:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border border-slate-200 shadow-xl">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md">
                <Bot className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Azure CloudOps Agent</h1>
            <p className="text-slate-600 mt-2">Your intelligent Azure assistant</p>
          </div>

          <div className="space-y-3 py-4">
            <Feature
              icon={<Sparkles className="w-4 h-4" />}
              title="AI-Powered Insights"
              subtitle="Get intelligent recommendations for your Azure resources"
            />
            <Feature
              icon={<Shield className="w-4 h-4" />}
              title="Secure Authentication"
              subtitle="Login securely with your Microsoft account"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-md transition-all duration-200 h-12 text-base font-medium"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {loading ? "Signing in..." : "Sign in with Microsoft"}
            </Button>
            <p className="text-xs text-center text-slate-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Feature({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">{icon}</div>
      <div>
        <p className="font-medium text-slate-900 text-sm">{title}</p>
        <p className="text-xs text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}