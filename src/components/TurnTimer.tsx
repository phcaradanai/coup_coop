import { useState, useEffect, useRef } from "react";
import { soundManager } from "../utils/audio";

export default function TurnTimer({ 
  isActive, 
  turnIndex, 
  duration = 30, 
  enabled = true 
}: { 
  isActive: boolean; 
  turnIndex: number; 
  duration?: number; 
  enabled?: boolean; 
}) {
  const [progress, setProgress] = useState(100);
  const [timeLeft, setTimeLeft] = useState(duration);
  const lastTickedSecond = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !enabled) {
      setProgress(100);
      setTimeLeft(duration);
      lastTickedSecond.current = null;
      return;
    }
    
    setProgress(100);
    setTimeLeft(duration);
    lastTickedSecond.current = null;
    const startTime = Date.now();
    const durationMs = duration * 1000;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.ceil(Math.max(0, durationMs - elapsed) / 1000);
      const newProgress = Math.max(0, 100 - (elapsed / durationMs) * 100);
      
      setProgress(newProgress);
      setTimeLeft(left);

      // Play tick sound when <= 5 seconds remain
      if (left <= 5 && left > 0 && lastTickedSecond.current !== left) {
        lastTickedSecond.current = left;
        soundManager.playTimerTick();
      }
      
      if (newProgress === 0) {
        clearInterval(interval);
      }
    }, 50); 
    
    return () => clearInterval(interval);
  }, [isActive, turnIndex, duration, enabled]);

  if (!isActive) return null;

  if (!enabled) {
    return (
      <div className="absolute top-0 right-0 bg-zinc-700 text-base px-2.5 py-0.5 uppercase tracking-wide text-zinc-200 font-bold z-10 flex gap-1.5 items-center rounded-bl-lg">
        <span>กำลังเล่น</span>
        <span className="bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-300">ไม่จำกัดเวลา</span>
      </div>
    );
  }

  const isUrgent = timeLeft <= 5 && timeLeft > 0;

  return (
    <>
      <div className={`absolute top-0 right-0 text-base px-2.5 py-0.5 uppercase tracking-wide font-bold z-10 flex gap-1.5 items-center rounded-bl-lg transition-colors ${
        isUrgent ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/50' : 'bg-amber-500 text-zinc-950'
      }`}>
        <span>{isUrgent ? '⚠️ ใกล้หมดเวลา' : 'กำลังเล่น'}</span>
        <span className={`px-1.5 py-0.2 rounded ${isUrgent ? 'bg-black/40 text-red-200' : 'bg-amber-900/20 text-amber-950'}`}>
          {timeLeft}s
        </span>
      </div>
      <div 
        className={`absolute bottom-0 left-0 h-1.5 md:h-2 z-0 transition-none ${
          isUrgent ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
        }`}
        style={{ width: `${progress}%` }} 
      />
    </>
  );
}
