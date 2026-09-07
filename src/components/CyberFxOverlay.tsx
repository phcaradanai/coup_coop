import { useEffect, useState } from "react";

export interface CyberFxEvent {
  type: "coup" | "assassinate" | "steal" | "challenge";
  id: string;
}

interface Props {
  activeFx: CyberFxEvent | null;
  highFxEnabled: boolean;
}

const VIDEO_SOURCES: Record<CyberFxEvent["type"], { webm: string; mp4: string }> = {
  coup: { webm: "/fx/coup.webm", mp4: "/fx/coup.mp4" },
  challenge: { webm: "/fx/challenge.webm", mp4: "/fx/challenge.mp4" },
  assassinate: { webm: "/fx/assassinate.webm", mp4: "/fx/assassinate.mp4" },
  steal: { webm: "/fx/steal.webm", mp4: "/fx/steal.mp4" },
};

function CssFallback({ type }: { type: CyberFxEvent["type"] }) {
  return (
    <>
      {type === "coup" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-[200vw] h-24 sm:h-36 bg-gradient-to-r from-transparent via-red-500 to-transparent blur-md animate-laser-sweep opacity-90 shadow-[0_0_80px_rgba(239,68,68,1)]" />
          <div className="absolute w-[200vw] h-6 bg-white animate-laser-sweep opacity-95 shadow-[0_0_40px_rgba(255,255,255,1)]" />
          <div className="absolute w-96 h-96 rounded-full border-4 border-red-500/80 bg-red-600/20 animate-ping" />
          <div className="absolute inset-0 bg-red-950/30 mix-blend-screen animate-pulse" />
        </div>
      )}

      {type === "assassinate" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 sm:w-[500px] h-80 sm:h-[500px] flex items-center justify-center animate-cyber-slash">
            <div className="absolute w-[160%] h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_30px_rgba(192,132,252,1)] rotate-45" />
            <div className="absolute w-[160%] h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_30px_rgba(239,68,68,1)] -rotate-45" />
            <div className="w-16 h-16 bg-white rounded-full blur-sm animate-ping" />
          </div>
          <div className="absolute inset-0 bg-purple-950/20 mix-blend-color-dodge animate-pulse" />
        </div>
      )}

      {type === "steal" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 rounded-full border-2 border-sky-400 bg-sky-500/10 shadow-[0_0_40px_rgba(56,189,248,0.8)] animate-emp-ripple" />
          <div className="w-64 h-64 rounded-full border border-cyan-300 bg-cyan-400/5 shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-emp-ripple" style={{ animationDelay: "200ms" }} />
          <div className="w-64 h-64 rounded-full border border-white bg-transparent animate-emp-ripple" style={{ animationDelay: "400ms" }} />
        </div>
      )}

      {type === "challenge" && (
        <div className="absolute inset-0">
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-amber-500/80 to-transparent animate-pulse shadow-[0_0_20px_rgba(245,158,11,1)]" />
          <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-amber-500/80 to-transparent animate-pulse shadow-[0_0_20px_rgba(245,158,11,1)]" />
          <div className="absolute inset-0 bg-amber-900/15 mix-blend-screen animate-pulse" />
        </div>
      )}
    </>
  );
}

export default function CyberFxOverlay({ activeFx, highFxEnabled }: Props) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
  }, [activeFx?.id]);

  if (!activeFx || !highFxEnabled) return null;

  const source = VIDEO_SOURCES[activeFx.type];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {!videoFailed && (
        <video
          key={activeFx.id}
          className={`absolute inset-0 h-full w-full object-cover mix-blend-screen transition-opacity duration-100 ${videoReady ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        >
          <source src={source.webm} type="video/webm" />
          <source src={source.mp4} type="video/mp4" />
        </video>
      )}

      {(!videoReady || videoFailed) && <CssFallback type={activeFx.type} />}
    </div>
  );
}
