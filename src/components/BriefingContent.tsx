"use client";

import { AlertTriangle, FileText, Calendar, Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ticket {
    id: string;
    summary: string;
    description: string;
    time: string;
    created?: string;
    priority: string;
    status?: string;
    reporter?: string;
}

interface BriefingContentProps {
    activeAccountName?: string;
    criticalTickets: Ticket[];
    myTickets: Ticket[];
    upcomingRfcTickets: Ticket[];
    briefingMessages: string[];
    shortLiveMessages: string[];
    onClose?: () => void;
}

export default function BriefingContent({
    activeAccountName,
    criticalTickets,
    myTickets,
    upcomingRfcTickets,
    briefingMessages,
    shortLiveMessages,
    onClose,
}: BriefingContentProps) {
    return (
        <div className="flex flex-col gap-3 animate-in fade-in duration-500 p-2 relative">
            {onClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 rounded-full"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
            <div className="flex flex-col gap-0.5">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {activeAccountName?.split(' ')[0] || 'User'}
                </h1>
                <p className="text-slate-500 text-xs italic">Here is your operational briefing for today.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Critical Card */}
                <div className="p-3 rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 rounded-full bg-red-100 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-red-900 text-xs">Critical</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-0.5">{criticalTickets.length}</div>
                    <p className="text-[10px] text-red-700 font-medium truncate">Active Incidents</p>
                </div>

                {/* Workload Card */}
                <div className="p-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 rounded-full bg-blue-100 text-blue-600">
                            <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-blue-900 text-xs">Workload</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-0.5">{myTickets.length}</div>
                    <p className="text-[10px] text-blue-700 font-medium truncate">Assigned Jira</p>
                </div>

                {/* RFC Card */}
                <div className="p-3 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm hover:shadow-md transition-shadow cursor-default">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1.5 rounded-full bg-purple-100 text-purple-600">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-purple-900 text-xs">Upcoming RFC</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-0.5">{upcomingRfcTickets.length}</div>
                    <p className="text-[10px] text-purple-700 font-medium truncate">Next 48 Hours</p>
                </div>
            </div>

            {/* Recent Highlights */}
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-2 text-xs uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-sky-500" />
                    Recent Live Updates
                </h4>
                <div className="space-y-2">
                    {briefingMessages.map((msg, i) => (
                        <div key={`briefing-${i}`} className="flex gap-3 items-start text-sm text-slate-700 font-medium">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span className="leading-relaxed">{msg}</span>
                        </div>
                    ))}
                    <div className="border-t border-slate-100 my-2 pt-2">
                        {shortLiveMessages.map((msg, i) => (
                            <div key={`live-${i}`} className="flex gap-2 items-start text-[13px] text-slate-500 mb-1.5">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                                <span className="leading-normal">{msg}</span>
                            </div>
                        ))}
                    </div>
                    {shortLiveMessages.length === 0 && briefingMessages.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic">No recent updates...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
