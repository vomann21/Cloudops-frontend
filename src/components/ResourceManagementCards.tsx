import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Play, Square, TrendingUp, TrendingDown, Trash2, Settings } from "lucide-react";

interface ResourceManagementCardsProps {
  onCardClick: (prompt: string) => void;
  onBackClick: () => void;
}

export function ResourceManagementCards({ onCardClick, onBackClick }: ResourceManagementCardsProps) {
  const scrollToChat = () => {
    const chatElement = document.querySelector('.chat-interface') || document.querySelector('[class*="chat"]') || document.querySelector('textarea');
    if (chatElement) {
      chatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCardClick = (prompt: string) => {
    onCardClick(prompt);
    setTimeout(scrollToChat, 100); // Small delay to ensure prompt is set first
  };

  const resourceActions = [
    {
      title: "Create Resource",
      prompt: "Create a new Azure storage account in East US with Standard performance and LRS replication.",
      icon: <Plus className="w-5 h-5" />,
    },
    {
      title: "Start Resource",
      prompt: "Start the resource named prod-app-server in the subscription CloudOps-Test.",
      icon: <Play className="w-5 h-5" />,
    },
    {
      title: "Stop Resource",
      prompt: "Stop the virtual machine test-vm-01 to save costs.",
      icon: <Square className="w-5 h-5" />,
    },
    {
      title: "Scale Up Resource",
      prompt: "Scale up the VM analytics-node to 8 vCPUs and 32GB RAM.",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      title: "Scale Down Resource",
      prompt: "Scale down the database server db-prod to reduce compute usage.",
      icon: <TrendingDown className="w-5 h-5" />,
    },
    {
      title: "Delete Resource",
      prompt: "Delete the resource group dev-temp-resources and all its resources.",
      icon: <Trash2 className="w-5 h-5" />,
    },
    {
      title: "Update Resource",
      prompt: "Update the configuration of the VM web-server-02 to enable accelerated networking.",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <div className="w-full max-w-4xl">
      {/* Back to Main Options Card */}
      <div className="mb-6 animate-fade-in">
        <Card 
          className="group relative overflow-hidden bg-gradient-card border border-input-border shadow-card hover:shadow-sophisticated transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:bg-card-hover"
          onClick={onBackClick}
        >
          <div className="p-4 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 mr-2 text-primary" />
            <span className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors duration-300">
              Back to Main Options
            </span>
          </div>
        </Card>
      </div>

      {/* Resource Management Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resourceActions.map((action, index) => (
          <div
            key={action.title}
            className="animate-fade-in h-full"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <Card 
              className="group relative overflow-hidden bg-gradient-card border border-input-border shadow-card hover:shadow-sophisticated transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:bg-card-hover h-full flex flex-col"
              onClick={() => handleCardClick(action.prompt)}
            >
              <div className="p-4 flex flex-col h-full">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-lg bg-gradient-sophisticated text-primary-foreground shadow-sophisticated mr-3">
                    {action.icon}
                  </div>
                  <h3 className="text-base font-semibold text-card-foreground group-hover:text-primary transition-colors duration-300">
                    {action.title}
                  </h3>
                </div>
                
                {/* Prompt shown on hover */}
                <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex-grow flex items-end">
                  <p className="leading-relaxed italic">
                    <span className="font-medium">Example:</span> {action.prompt}
                  </p>
                </div>
              </div>
              
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}