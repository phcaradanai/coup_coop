import { useEffect, useRef } from "react";

export default function GameHistoryLog({ logs }: { logs: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (log: string, isLatest: boolean) => {
    if (
      log.includes("รัฐประหาร") ||
      log.includes("สังหาร") ||
      log.includes("ขโมย") ||
      log.includes("จับโกหก") ||
      log.includes("เสียไพ่") ||
      log.includes("ถูกกำจัด") ||
      log.includes("หน้าแตก") ||
      log.includes("โกหก") ||
      log.includes("ล้มเหลว") ||
      log.includes("ตาย")
    ) {
      return isLatest ? 'text-red-400 font-bold opacity-100' : 'text-red-400/80 opacity-80';
    }

    if (
      log.includes("อ้างตัวเป็น") ||
      log.includes("หงายไพ่") ||
      log.includes("ขัดขวาง") ||
      log.includes("ตัวจริง") ||
      log.includes("เปลี่ยนไพ่") ||
      log.includes("ป้องกัน")
    ) {
      return isLatest ? 'text-sky-400 font-bold opacity-100' : 'text-sky-400/80 opacity-80';
    }

    if (
      log.includes("รายได้") ||
      log.includes("เงินสนับสนุน") ||
      log.includes("เก็บภาษี") ||
      log.includes("ได้รับ")
    ) {
      return isLatest ? 'text-emerald-400 font-bold opacity-100' : 'text-emerald-400/80 opacity-80';
    }

    return isLatest ? 'text-amber-400 font-bold opacity-100' : 'text-zinc-400 opacity-80';
  };

  return (
    <div className="absolute bottom-4 left-4 w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-2xl z-30 h-56 md:h-64 pointer-events-auto transition-all">
      <div className="p-2.5 border-b border-zinc-800 shrink-0 bg-zinc-900/60 flex justify-between items-center">
        <h2 className="text-base font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          บันทึกการเล่น
        </h2>
      </div>
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-3.5 font-mono text-base flex flex-col gap-2 relative scroll-smooth"
      >
        {logs.map((log, i) => (
          <div 
            key={i} 
            className={`leading-relaxed animate-in slide-in-from-left-2 duration-300 ${getLogColor(log, i === logs.length - 1)}`}
          >
            <span className="opacity-50 select-none mr-2">›</span>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
