import React, { useCallback, useEffect, useRef, useState } from "react";
import { soundManager } from "../utils/audio";

export type CyberFxType =
  | "assassinate"
  | "steal"
  | "steal_block"
  | "block_foreign_aid"
  | "exchange"
  | "examine"
  | "force_exchange"
  | "block_assassinate"
  | "tax"
  | "foreign_aid"
  | "challenge"
  | "coup"
  | "lose_card"
  | "player_eliminated"
  | "victory";

export interface CyberFxEvent {
  type: CyberFxType;
  id: string;
  title?: string;
  subtitle?: string;
  role?: string;
}

interface Props {
  activeFx: CyberFxEvent | null;
  highFxEnabled: boolean;
  onClose?: () => void;
}

export interface RoleVideoConfig {
  mp4: string;
  roleEn: string;
  roleTh: string;
  actionEn: string;
  actionTh: string;
  accentHex: string;
  borderColor: string;
  glowColor: string;
  badgeClass: string;
}

export const ROLE_VIDEOS: Partial<Record<CyberFxType, RoleVideoConfig>> = {
  challenge: {
    mp4: "/video/CHALLENGE.mp4",
    roleEn: "THE COURT",
    roleTh: "การท้าทาย",
    actionEn: "CHALLENGE DECLARED",
    actionTh: "ประกาศจับโกหก",
    accentHex: "#f59e0b",
    borderColor: "border-amber-500/60",
    glowColor: "rgba(245,158,11,0.4)",
    badgeClass: "bg-amber-950/90 text-amber-300 border-amber-500/60",
  },
  coup: {
    mp4: "/video/COUP_D_ÉTAT.mp4",
    roleEn: "THE COURT",
    roleTh: "รัฐประหาร",
    actionEn: "COUP D'ÉTAT",
    actionTh: "ประกาศรัฐประหาร",
    accentHex: "#ef4444",
    borderColor: "border-red-500/60",
    glowColor: "rgba(239,68,68,0.45)",
    badgeClass: "bg-red-950/90 text-red-300 border-red-500/60",
  },
  exchange: {
    mp4: "/video/AMBASSADOR_CARAVAN_EXCHANGE.mp4",
    roleEn: "AMBASSADOR / INQUISITOR",
    roleTh: "ทูต / ผู้ตรวจการ",
    actionEn: "CARAVAN EXCHANGE",
    actionTh: "เปลี่ยนการ์ดสำเร็จ",
    accentHex: "#10b981",
    borderColor: "border-emerald-500/60",
    glowColor: "rgba(16,185,129,0.4)",
    badgeClass: "bg-emerald-950/90 text-emerald-300 border-emerald-500/60",
  },
  force_exchange: {
    mp4: "/video/AMBASSADOR_CARAVAN_EXCHANGE.mp4",
    roleEn: "INQUISITOR",
    roleTh: "ผู้ตรวจการ",
    actionEn: "FORCED CARD SWAP",
    actionTh: "บังคับเปลี่ยนการ์ด",
    accentHex: "#8b5cf6",
    borderColor: "border-violet-500/60",
    glowColor: "rgba(139,92,246,0.4)",
    badgeClass: "bg-violet-950/90 text-violet-300 border-violet-500/60",
  },
  assassinate: {
    mp4: "/video/ASSASSIN_TARGET_EXECUTION.mp4",
    roleEn: "ASSASSIN",
    roleTh: "นักฆ่า",
    actionEn: "TARGET EXECUTION",
    actionTh: "สังหารเป้าหมายสำเร็จ",
    accentHex: "#ef4444",
    borderColor: "border-red-500/60",
    glowColor: "rgba(239,68,68,0.4)",
    badgeClass: "bg-red-950/90 text-red-300 border-red-500/60",
  },
  steal: {
    mp4: "/video/CAPTAIN_STEAL_FLEET_RAID.mp4",
    roleEn: "CAPTAIN",
    roleTh: "กัปตัน",
    actionEn: "FLEET RAID",
    actionTh: "ขโมยเหรียญสำเร็จ",
    accentHex: "#06b6d4",
    borderColor: "border-cyan-500/60",
    glowColor: "rgba(6,182,212,0.4)",
    badgeClass: "bg-cyan-950/90 text-cyan-300 border-cyan-500/60",
  },
  tax: {
    mp4: "/video/DUKE_TAX_COLLECTION.mp4",
    roleEn: "DUKE",
    roleTh: "ดยุก",
    actionEn: "TAX COLLECTION",
    actionTh: "เก็บภาษีสำเร็จ",
    accentHex: "#f59e0b",
    borderColor: "border-amber-500/60",
    glowColor: "rgba(245,158,11,0.4)",
    badgeClass: "bg-amber-950/90 text-amber-300 border-amber-500/60",
  },
  examine: {
    mp4: "/video/INQUISITOR_TRIBUNAL_EXAMINATION.mp4",
    roleEn: "INQUISITOR",
    roleTh: "ผู้ตรวจการ",
    actionEn: "TRIBUNAL EXAMINATION",
    actionTh: "ส่องการ์ดฝ่ายตรงข้ามสำเร็จ",
    accentHex: "#a855f7",
    borderColor: "border-purple-500/60",
    glowColor: "rgba(168,85,247,0.4)",
    badgeClass: "bg-purple-950/90 text-purple-300 border-purple-500/60",
  },
  block_assassinate: {
    mp4: "/video/CONTESSA_ASSASSINATION.mp4",
    roleEn: "CONTESSA",
    roleTh: "เคาน์เตส",
    actionEn: "ROYAL AEGIS DEFENSE",
    actionTh: "ขัดขวางการสังหารสำเร็จ",
    accentHex: "#f43f5e",
    borderColor: "border-rose-500/60",
    glowColor: "rgba(244,63,94,0.4)",
    badgeClass: "bg-rose-950/90 text-rose-300 border-rose-500/60",
  },
};

function CssFallback({ type }: { type: CyberFxType }) {
  return (
    <>
      {/* 01 — ASSASSIN: TARGET EXECUTION */}
      {type === "assassinate" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 sm:w-[500px] h-80 sm:h-[500px] flex items-center justify-center animate-cyber-slash">
            {/* Lock-on reticle */}
            <div className="absolute w-44 h-44 rounded-full border-2 border-dashed border-red-500/80 animate-spin" />
            <div className="absolute w-56 h-56 rounded-full border border-red-500/40" />
            {/* Dual surgical diagonal energy blades */}
            <div className="absolute w-[170%] h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_30px_rgba(192,132,252,1)] rotate-45" />
            <div className="absolute w-[170%] h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_30px_rgba(239,68,68,1)] -rotate-45" />
            <div className="w-20 h-20 bg-white rounded-full blur-sm animate-ping" />
          </div>
          <div className="absolute inset-0 bg-purple-950/20 mix-blend-color-dodge animate-pulse" />
        </div>
      )}

      {/* 02 — CAPTAIN: STEAL FLEET RAID */}
      {type === "steal" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-72 h-72 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full border-2 border-sky-400 bg-sky-500/10 shadow-[0_0_40px_rgba(56,189,248,0.8)] animate-emp-ripple" />
            <div className="w-64 h-64 rounded-full border border-cyan-300 bg-cyan-400/5 shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-emp-ripple" style={{ animationDelay: "180ms" }} />
            <div className="w-64 h-64 rounded-full border border-amber-300/80 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.7)] animate-emp-ripple" style={{ animationDelay: "360ms" }} />
            {/* Fleet chevron formation */}
            <div className="absolute flex gap-6 animate-pulse">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,1)] rotate-90" />
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[30px] border-b-cyan-300 drop-shadow-[0_0_16px_rgba(34,211,238,1)] rotate-90" />
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,1)] rotate-90" />
            </div>
          </div>
          <div className="absolute inset-0 bg-cyan-950/20 mix-blend-screen animate-pulse" />
        </div>
      )}

      {/* 03 — STEAL BLOCK: FLEET VS FLEET */}
      {type === "steal_block" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Electromagnetic clash shockwave */}
            <div className="absolute w-72 h-72 rounded-full border-4 border-cyan-400/80 bg-cyan-600/10 animate-ping shadow-[0_0_50px_rgba(34,211,238,0.9)]" />
            <div className="absolute w-1 h-80 bg-gradient-to-b from-transparent via-white to-transparent shadow-[0_0_30px_rgba(255,255,255,1)]" />
            <div className="absolute text-cyan-300 font-mono text-xs tracking-widest uppercase bg-cyan-950/80 px-4 py-1 rounded border border-cyan-500 shadow-lg animate-pulse">
              INTERCEPTED
            </div>
          </div>
          <div className="absolute inset-0 bg-cyan-950/30 mix-blend-screen" />
        </div>
      )}

      {/* 04 — DUKE: FOREIGN AID BLOCK */}
      {type === "block_foreign_aid" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex flex-col items-center justify-center animate-in zoom-in-75 duration-300">
            {/* Fortress gate barrier */}
            <div className="w-80 sm:w-96 h-60 rounded-xl border-4 border-amber-400/90 bg-amber-950/40 backdrop-blur-sm shadow-[0_0_60px_rgba(245,158,11,0.8)] flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_25px_rgba(251,191,36,1)]" />
              <div className="absolute text-amber-300 font-mono text-sm tracking-widest font-black uppercase px-4 py-1.5 rounded bg-black/70 border border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                ACCESS DENIED • IMPERIAL AUTHORITY
              </div>
            </div>
            <div className="w-72 h-72 rounded-full border-2 border-amber-500/50 animate-ping absolute" />
          </div>
          <div className="absolute inset-0 bg-amber-950/25 mix-blend-screen" />
        </div>
      )}

      {/* 05 — AMBASSADOR: CARAVAN EXCHANGE */}
      {type === "exchange" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-xl flex items-center justify-around">
            {/* Diplomatic caravan panels */}
            <div className="w-24 h-36 rounded-lg border-2 border-emerald-400/80 bg-emerald-950/40 shadow-[0_0_30px_rgba(52,211,153,0.7)] animate-card-3d flex items-center justify-center">
              <div className="w-12 h-16 rounded border border-teal-300/40 bg-teal-400/10" />
            </div>
            <div className="w-28 h-40 rounded-lg border-2 border-teal-300/90 bg-teal-950/50 shadow-[0_0_40px_rgba(45,212,191,0.8)] animate-pulse flex items-center justify-center">
              <div className="w-14 h-20 rounded border border-emerald-300/50 bg-emerald-400/15" />
            </div>
            <div className="w-24 h-36 rounded-lg border-2 border-emerald-400/80 bg-emerald-950/40 shadow-[0_0_30px_rgba(52,211,153,0.7)] animate-card-3d flex items-center justify-center" style={{ animationDelay: "150ms" }}>
              <div className="w-12 h-16 rounded border border-teal-300/40 bg-teal-400/10" />
            </div>
          </div>
          <div className="absolute inset-0 bg-teal-950/20 mix-blend-screen" />
        </div>
      )}

      {/* 06 — INQUISITOR: TRIBUNAL EXAMINATION */}
      {type === "examine" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Scanning pillars and judicial gavel shockwave */}
            <div className="absolute w-72 h-72 rounded-full border-4 border-violet-500/80 bg-violet-950/30 animate-ping shadow-[0_0_60px_rgba(139,92,246,0.9)]" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-violet-300/70 animate-spin" />
            <div className="w-32 h-44 rounded-lg border-2 border-violet-400 bg-violet-900/30 shadow-[0_0_35px_rgba(167,139,250,0.8)] flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-1 bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,1)] animate-pulse" />
              <div className="text-violet-300 text-xs font-mono tracking-wider">TRIBUNAL SCAN</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-violet-950/30 mix-blend-screen" />
        </div>
      )}

      {/* 07 — INQUISITOR: FORCE CARD EXCHANGE */}
      {type === "force_exchange" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-72 h-72 flex items-center justify-center">
            {/* Swirling deck portal */}
            <div className="w-64 h-64 rounded-full border-4 border-violet-500/60 border-t-cyan-400 border-b-purple-400 animate-spin shadow-[0_0_50px_rgba(139,92,246,0.8)]" />
            <div className="absolute w-24 h-36 rounded-lg border-2 border-cyan-400/90 bg-cyan-950/50 shadow-[0_0_30px_rgba(34,211,238,0.7)] animate-card-3d" />
          </div>
          <div className="absolute inset-0 bg-violet-950/20 mix-blend-screen" />
        </div>
      )}

      {/* 08 — CONTESSA: ASSASSINATION BLOCK */}
      {type === "block_assassinate" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Royal rose-red energy shield */}
            <div className="w-72 h-72 rounded-full border-4 border-rose-500/90 bg-rose-600/15 shadow-[0_0_70px_rgba(244,63,94,0.9)] animate-emp-ripple" />
            <div className="w-60 h-60 rounded-full border-2 border-amber-300/80 bg-transparent shadow-[0_0_40px_rgba(252,211,77,0.8)] animate-pulse" />
            <div className="absolute text-rose-200 font-mono text-sm tracking-widest font-black uppercase px-4 py-1.5 rounded bg-black/60 border border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.7)]">
              ROYAL AEGIS DEFENSE
            </div>
          </div>
          <div className="absolute inset-0 bg-rose-950/25 mix-blend-screen" />
        </div>
      )}

      {/* 09 — DUKE: TAX COLLECTION */}
      {type === "tax" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center gap-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-16 h-16 rounded-full border-2 border-amber-300 bg-amber-400/20 shadow-[0_0_30px_rgba(245,158,11,0.9)] flex items-center justify-center animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="w-8 h-8 rounded-full border border-amber-200 bg-amber-300/40" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-amber-950/20 mix-blend-screen" />
        </div>
      )}

      {/* 10 — FOREIGN AID SUCCESS */}
      {type === "foreign_aid" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center gap-6 animate-pulse">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="w-14 h-24 rounded-full border-2 border-amber-400/90 bg-amber-500/20 shadow-[0_0_35px_rgba(251,191,36,0.8)] flex items-center justify-center"
              >
                <div className="w-6 h-12 rounded-full border border-white/60 bg-white/20" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-amber-950/15 mix-blend-screen" />
        </div>
      )}

      {/* 11 — CHALLENGE */}
      {type === "challenge" && (
        <div className="absolute inset-0">
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-amber-500/80 to-transparent animate-pulse shadow-[0_0_20px_rgba(245,158,11,1)]" />
          <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-amber-500/80 to-transparent animate-pulse shadow-[0_0_20px_rgba(245,158,11,1)]" />
          {/* Dual opposing brackets */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-80 h-80 flex items-center justify-between px-6 animate-pulse">
              <div className="w-4 h-36 border-l-4 border-y-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.9)]" />
              <div className="w-4 h-36 border-r-4 border-y-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.9)]" />
            </div>
          </div>
          <div className="absolute inset-0 bg-amber-900/20 mix-blend-screen animate-pulse" />
        </div>
      )}

      {/* 12 — COUP D'ÉTAT */}
      {type === "coup" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-[200vw] h-24 sm:h-36 bg-gradient-to-r from-transparent via-red-500 to-transparent blur-md animate-laser-sweep opacity-90 shadow-[0_0_80px_rgba(239,68,68,1)]" />
          <div className="absolute w-[200vw] h-6 bg-white animate-laser-sweep opacity-95 shadow-[0_0_40px_rgba(255,255,255,1)]" />
          <div className="absolute w-96 h-96 rounded-full border-4 border-red-500/80 bg-red-600/20 animate-ping" />
          <div className="absolute inset-0 bg-red-950/30 mix-blend-screen animate-pulse" />
        </div>
      )}

      {/* 13 — INFLUENCE LOST / CARD DESTROYED */}
      {type === "lose_card" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-36 h-52 rounded-xl border-2 border-red-500/90 bg-red-950/40 shadow-[0_0_50px_rgba(239,68,68,0.9)] flex items-center justify-center animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/30 via-transparent to-red-900/40" />
            <div className="w-full h-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,1)] rotate-45" />
            <div className="w-20 h-20 rounded-full border border-red-400/60 animate-ping" />
          </div>
          <div className="absolute inset-0 bg-red-950/20 mix-blend-screen" />
        </div>
      )}

      {/* 14 — PLAYER ELIMINATED */}
      {type === "player_eliminated" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80 flex items-center justify-center">
            <div className="w-72 h-72 rounded-full border-2 border-red-700/60 bg-red-950/30 animate-ping" />
            <div className="w-48 h-48 rounded-full border border-zinc-600/60 bg-black/60 shadow-[0_0_40px_rgba(0,0,0,0.8)]" />
            <div className="absolute text-red-500 font-mono text-sm tracking-widest font-bold uppercase animate-pulse">
              FACTION TERMINATED
            </div>
          </div>
          <div className="absolute inset-0 bg-black/60 mix-blend-multiply" />
        </div>
      )}

      {/* 15 — VICTORY */}
      {type === "victory" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-2xl h-96 flex flex-col items-center justify-center">
            {/* Imperial crest geometric light flare */}
            <div className="absolute w-96 h-96 rounded-full border-4 border-amber-300/80 bg-amber-500/10 shadow-[0_0_80px_rgba(251,191,36,0.9)] animate-emp-ripple" />
            <div className="w-48 h-48 border-2 border-amber-400/90 rotate-45 animate-spin shadow-[0_0_40px_rgba(245,158,11,0.8)]" />
            <div className="absolute text-amber-300 font-serif text-3xl md:text-4xl tracking-widest font-black uppercase text-center drop-shadow-[0_0_25px_rgba(251,191,36,1)]">
              VICTORY
            </div>
          </div>
          <div className="absolute inset-0 bg-amber-950/20 mix-blend-screen" />
        </div>
      )}
    </>
  );
}

export default function CyberFxOverlay({ activeFx, highFxEnabled, onClose }: Props) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const isMuted = true; // Videos are decorative background overlays; game SFX is synthesized via Web Audio API

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeFxIdRef = useRef<string | null>(null);

  const roleVideo = activeFx && highFxEnabled ? ROLE_VIDEOS[activeFx.type] : undefined;

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Reset state on activeFx change
  useEffect(() => {
    if (activeFx?.id !== activeFxIdRef.current) {
      activeFxIdRef.current = activeFx?.id ?? null;
      setVideoReady(false);
      setVideoFailed(false);
    }
  }, [activeFx?.id]);

  // Auto-dismiss after 3.8 seconds for smooth ambient overlay feel
  useEffect(() => {
    if (!activeFx || !roleVideo) return;
    const timeout = setTimeout(() => {
      handleClose();
    }, 3800);
    return () => clearTimeout(timeout);
  }, [activeFx?.id, roleVideo, handleClose]);

  // Handle video playback
  useEffect(() => {
    if (!roleVideo || !videoRef.current) return;
    const video = videoRef.current;
    video.muted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setVideoFailed(true);
      });
    }
  }, [activeFx?.id, roleVideo]);

  if (!activeFx || !highFxEnabled) return null;

  // 1. Cinematic Video Overlay (When video is available and has not failed)
  if (roleVideo && !videoFailed) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden select-none animate-in fade-in duration-300">
        {/* Ambient colored vignette around screen edges matching role theme */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 120px 40px ${roleVideo.glowColor}`,
          }}
        />

        {/* Video blended seamlessly into background table via mix-blend-screen */}
        <video
          ref={videoRef}
          key={activeFx.id}
          src={roleVideo.mp4}
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none opacity-90 transition-opacity duration-300"
          autoPlay
          playsInline
          muted={isMuted}
          preload="auto"
          aria-hidden="true"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
          onEnded={handleClose}
          onError={(e) => {
            console.error("Video playback error:", roleVideo.mp4, e);
            setVideoFailed(true);
          }}
        />

        {/* Sleek Floating Cyberpunk HUD Action Banner (Non-blocking) */}
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-1.5 animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border ${roleVideo.borderColor} bg-black/80 backdrop-blur-md shadow-[0_0_30px_${roleVideo.glowColor}]`}
          >
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: roleVideo.accentHex }}
            />
            <span className={`text-[11px] sm:text-xs font-mono font-black tracking-widest uppercase ${roleVideo.badgeClass.split(" ")[1] || "text-white"}`}>
              {roleVideo.roleEn}
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-white text-xs sm:text-sm font-black tracking-wider uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
              {roleVideo.actionEn}
            </span>
          </div>

          {(activeFx.subtitle || roleVideo.actionTh) && (
            <div className="px-3 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[11px] sm:text-xs text-zinc-300 font-medium tracking-wide shadow-lg">
              {activeFx.subtitle || roleVideo.actionTh}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Procedural CSS Fallback for actions without video or when video fails
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <CssFallback type={activeFx.type} />
    </div>
  );
}


