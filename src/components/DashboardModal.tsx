"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";



export default function DashboardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-5xl h-[650px] relative">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold text-sm">📊 CloudOps Dashboard</h3>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-full h-full p-2">
          <iframe
            src="http://localhost:3978/dashboard"
            className="w-full h-full border-0 rounded-lg"
            title="CloudOps Dashboard"
          />
        </div>
      </div>
    </div>
  );
}
