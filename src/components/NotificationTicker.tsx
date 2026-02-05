import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell } from 'lucide-react';

interface NotificationTickerProps {
  messages: string[];
  speed?: number; // seconds for one complete cycle
}

export default function NotificationTicker({ messages, speed = 20 }: NotificationTickerProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!messages || messages.length === 0) return null;

  // Calculate duration based on total character length to maintain consistent read speed
  // Approx 10 chars per second, with a minimum of 30 seconds
  const totalChars = messages.join('').length;
  const duration = Math.max(30, totalChars / 5);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-700 text-white overflow-hidden py-2 relative flex items-center shadow-md z-10">
      <div className="absolute left-0 top-0 bottom-0 bg-slate-900 z-10 px-3 flex items-center border-r border-slate-700 shadow-sm">
        <Bell className="w-4 h-4 text-sky-400 mr-2 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Live Updates</span>
      </div>

      <div
        className="flex whitespace-nowrap overflow-hidden w-full ml-32"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`inline-block animate-marquee ${isHovered ? 'paused' : ''}`}
          style={{ animationDuration: `${duration}s` }}
        >
          {messages.map((msg, index) => (
            <span key={index} className="mx-8 text-sm font-medium inline-flex items-center">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mr-2"></span>
              {msg}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {messages.map((msg, index) => (
            <span key={`dup-${index}`} className="mx-8 text-sm font-medium inline-flex items-center">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mr-2"></span>
              {msg}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
        .paused {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
