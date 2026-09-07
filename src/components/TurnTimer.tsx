import { useState, useEffect } from "react";

export default function TurnTimer({ isActive, turnIndex }: { isActive: boolean; turnIndex: number }) {
  const [progress, setProgress] = useState(100);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!isActive) {
      setProgress(100);
      setTimeLeft(30);
      return;
    }
    
    // Slight delay to ensure UI updates, or just start immediately
    setProgress(100);
    setTimeLeft(30);
    const startTime = Date.now();
    const duration = 30000;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.ceil(Math.max(0, duration - elapsed) / 1000);
      const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setProgress(newProgress);
      setTimeLeft(left);
      
      if (newProgress === 0) {
        clearInterval(interval);
      }
    }, 50); 
    
    return () => clearInterval(interval);
  }, [isActive, turnIndex]);

  if (!isActive) return null;

  return (
    <>
      <div className="absolute top-0 right-0 bg-amber-500 text-[8px] px-2 py-0.5 uppercase tracking-widest text-zinc-950 font-bold z-10 flex gap-1 items-center">
        <span>กำลังเล่น</span>
        <span className="bg-amber-900/20 px-1 rounded text-amber-950">{timeLeft}s</span>
      </div>
      <div 
        className="absolute bottom-0 left-0 h-1 md:h-1.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] z-0 transition-none" 
        style={{ width: `${progress}%` }} 
      />
    </>
  );
}
