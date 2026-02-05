import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, User, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface Ticket {
    id: string;
    summary: string;
    description: string;
    time: string;
    priority: "low" | "medium" | "high" | "critical";
    status: "open" | "in-progress" | "resolved";
    reporter?: string;
    created?: string;
}

interface TicketDetailModalProps {
    open: boolean;
    onClose: () => void;
    ticket: Ticket | null;
    recommendation?: string;
    onUpdateRecommendation: (id: string, rec: string) => void;
}

export default function TicketDetailModal({ open, onClose, ticket, recommendation, onUpdateRecommendation }: TicketDetailModalProps) {
    const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

    useEffect(() => {
        if (open && ticket && !recommendation) {
            fetchAIRecommendation(ticket.id);
        }
    }, [open, ticket, recommendation]);

    const fetchAIRecommendation = async (ticketId: string) => {
        setIsLoadingRecommendation(true);
        try {
            const response = await fetch(`http://localhost:3978/api/ticket-recommendation/${ticketId}`);
            const data = await response.json();
            onUpdateRecommendation(ticketId, data.recommendation || "No recommendation available.");
        } catch (error) {
            console.error("Failed to fetch AI recommendation:", error);
            onUpdateRecommendation(ticketId, "Failed to load AI recommendation.");
        } finally {
            setIsLoadingRecommendation(false);
        }
    };

    const handleRefresh = () => {
        if (ticket) {
            fetchAIRecommendation(ticket.id);
        }
    };

    if (!ticket) return null;

    const priorityColor = {
        low: "bg-green-100 text-green-800 border-green-200",
        medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
        high: "bg-orange-100 text-orange-800 border-orange-200",
        critical: "bg-red-100 text-red-800 border-red-200",
    }[ticket.priority];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md md:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono text-xs text-slate-500">
                            {ticket.id}
                        </Badge>
                        <Badge className={`${priorityColor} hover:${priorityColor}`}>
                            {ticket.priority.toUpperCase()}
                        </Badge>
                    </div>
                    <DialogTitle className="text-xl font-bold leading-tight">{ticket.summary}</DialogTitle>
                    <DialogDescription className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {ticket.time}
                        </span>
                        {ticket.reporter && (
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {ticket.reporter}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed max-h-[200px] overflow-y-auto">
                    <h4 className="font-semibold text-slate-900 mb-2 sticky top-0 bg-slate-50 pb-2">Description</h4>
                    <div className="whitespace-pre-wrap">{ticket.description}</div>
                </div>

                <div className="my-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 text-sm text-slate-700 leading-relaxed max-h-[200px] overflow-y-auto relative">
                    <div className="flex items-center justify-between sticky top-0 bg-gradient-to-br from-blue-50 to-indigo-50 pb-2 mb-2">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            AI Recommendation
                        </h4>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
                            onClick={handleRefresh}
                            disabled={isLoadingRecommendation}
                            title="Refresh Recommendation"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecommendation ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    {isLoadingRecommendation ? (
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>Generating recommendation...</span>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap text-slate-700">{recommendation || "Loading recommendation..."}</div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    {/* Action buttons could go here */}
                </div>
            </DialogContent>
        </Dialog>
    );
}