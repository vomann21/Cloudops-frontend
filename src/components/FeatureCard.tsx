import React from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  onClick: (prompt: string) => void;
}

export function FeatureCard({ title, description, prompt, icon, onClick }: FeatureCardProps) {
  const scrollToChat = () => {
    const chatElement = document.querySelector('.chat-interface') || document.querySelector('[class*="chat"]') || document.querySelector('textarea');
    if (chatElement) {
      chatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleClick = () => {
    onClick(prompt);
    // Only scroll to chat if it's not the Resource Management card
    if (title !== "Resource Management") {
      setTimeout(scrollToChat, 100);
    }
  };

  return (
    <Card
      className="group relative overflow-hidden bg-gradient-card border border-input-border shadow-card hover:shadow-sophisticated transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:bg-card-hover h-full flex flex-col"
      onClick={handleClick}
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-sophisticated text-primary-foreground shadow-sophisticated">
            {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300 group-hover:transform group-hover:translate-x-1" />
        </div>

        <h3 className="text-base font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>

        <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-card-foreground transition-colors duration-300 flex-grow">
          {description}
        </p>
      </div>

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
}