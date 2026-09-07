import React from "react";
import { Role } from "../shared/types";
import { ZoomIn } from "lucide-react";

interface Props {
  role: Role | "Unknown";
  revealed?: boolean;
  key?: React.Key;
  size?: "sm" | "md" | "lg";
  onFocus?: () => void;
  className?: string;
}

const roleNames: Record<Role | "Unknown", string> = {
  Duke: "ดยุค (Duke)",
  Assassin: "มือสังหาร (Assassin)",
  Captain: "กัปตัน (Captain)",
  Ambassador: "ทูต (Ambass.)",
  Contessa: "เคาน์เตส (Contessa)",
  Inquisitor: "ผู้ตรวจการ (Inquisitor)",
  Unknown: "ไม่ทราบ"
};

const roleArtMap: Record<Role | "Unknown", string> = {
  Duke: "/cards/duke.jpg",
  Assassin: "/cards/assassin.jpg",
  Captain: "/cards/captain.jpg",
  Ambassador: "/cards/ambassador.jpg",
  Contessa: "/cards/contessa.jpg",
  Inquisitor: "/cards/inquisitor.jpg",
  Unknown: "/cards/unknown.jpg"
};

const roleStyles: Record<Role | "Unknown", { border: string, glow: string, badge: string, text: string, desc: string }> = {
  Duke: {
    border: "border-purple-500 shadow-purple-900/40",
    glow: "from-purple-950/80 via-purple-900/20 to-black/90",
    badge: "bg-purple-950/90 text-purple-300 border-purple-500/60",
    text: "text-purple-300",
    desc: "รับ 3 เหรียญ / ป้องกันเงินสนับสนุน"
  },
  Assassin: {
    border: "border-red-500 shadow-red-900/40",
    glow: "from-red-950/80 via-red-900/20 to-black/90",
    badge: "bg-red-950/90 text-red-300 border-red-500/60",
    text: "text-red-400",
    desc: "จ่าย 3C สังหารกำจัดไพ่เป้าหมาย 1 ใบ"
  },
  Captain: {
    border: "border-sky-500 shadow-sky-900/40",
    glow: "from-sky-950/80 via-sky-900/20 to-black/90",
    badge: "bg-sky-950/90 text-sky-300 border-sky-500/60",
    text: "text-sky-300",
    desc: "ขโมย 2 เหรียญ / ป้องกันการถูกขโมย"
  },
  Ambassador: {
    border: "border-emerald-500 shadow-emerald-900/40",
    glow: "from-emerald-950/80 via-emerald-900/20 to-black/90",
    badge: "bg-emerald-950/90 text-emerald-300 border-emerald-500/60",
    text: "text-emerald-300",
    desc: "จั่ว 2 ทิ้ง 2 / ป้องกันการถูกขโมย"
  },
  Contessa: {
    border: "border-rose-500 shadow-rose-900/40",
    glow: "from-rose-950/80 via-rose-900/20 to-black/90",
    badge: "bg-rose-950/90 text-rose-300 border-rose-500/60",
    text: "text-rose-300",
    desc: "ป้องกันการถูกสังหาร (Block Assassinate)"
  },
  Inquisitor: {
    border: "border-teal-500 shadow-teal-900/40",
    glow: "from-teal-950/80 via-teal-900/20 to-black/90",
    badge: "bg-teal-950/90 text-teal-300 border-teal-500/60",
    text: "text-teal-300",
    desc: "ส่องไพ่หรือแลกไพ่ 1 ใบ / ป้องกันถูกขโมย"
  },
  Unknown: {
    border: "border-zinc-700 shadow-black/60",
    glow: "from-zinc-950/90 via-zinc-900/40 to-black/90",
    badge: "bg-zinc-900 text-zinc-400 border-zinc-700",
    text: "text-zinc-400",
    desc: "ข้อมูลการ์ดถูกเข้ารหัส"
  }
};

export default function PlayingCard({ role, revealed, onFocus, className }: Props) {
  const meta = roleStyles[role] || roleStyles.Unknown;
  const artSrc = roleArtMap[role] || roleArtMap.Unknown;

  return (
    <div className="perspective-1000">
      <div
        onClick={onFocus}
        role={onFocus ? "button" : undefined}
        tabIndex={onFocus ? 0 : undefined}
        title={onFocus ? "คลิกเพื่อโฟกัสภาพ Art และดูข้อมูลเชิงลึก" : undefined}
        className={`relative w-56 sm:w-60 h-44 sm:h-48 shrink-0 rounded-2xl overflow-hidden border-2 shadow-2xl transition-all duration-500 group select-none animate-card-3d shimmer-on-hover ${
          onFocus ? "cursor-pointer" : ""
        } ${meta.border} ${
          revealed ? "opacity-60 grayscale-[40%]" : "hover:scale-[1.04] hover:-translate-y-2 hover:shadow-xl hover:shadow-cyan-500/20 hover:rotate-1"
        } ${className || ""}`}
      >
        {/* Futuristic Card Art Background Image */}
        <img
          src={artSrc}
          alt={role}
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Cyberpunk Vignette & High-tech Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className={`absolute inset-0 bg-gradient-to-b ${meta.glow} mix-blend-color-dodge opacity-60 pointer-events-none`} />

        {/* Holographic Circuit Grid Line */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 animate-pulse" />

        {/* Top Header Badge */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 gap-2">
          <span className={`text-base font-black uppercase tracking-wide px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-md truncate ${meta.badge}`}>
            {roleNames[role]} {revealed && "(ตาย)"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {onFocus && (
              <div 
                className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-md group-hover:scale-110 transition-transform opacity-80 group-hover:opacity-100"
                title="ขยายดูภาพ Art เต็ม"
              >
                <ZoomIn size={18} />
              </div>
            )}
            <div className="w-8 h-8 rounded-full border border-white/40 overflow-hidden shadow-md bg-black/60 shrink-0">
              <img src={artSrc} alt={role} className="w-full h-full object-cover object-center" />
            </div>
          </div>
        </div>

        {/* Bottom Ability Text Box */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
          <p className="text-base leading-snug font-medium text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-white/15">
            {meta.desc}
          </p>
        </div>

        {/* Hover Inspect Indicator */}
        {onFocus && (
          <div className="absolute inset-x-0 bottom-0 py-0.5 bg-cyan-950/95 text-cyan-300 text-sm font-mono uppercase tracking-wider text-center opacity-0 group-hover:opacity-100 transition-opacity z-20 border-t border-cyan-500/40 pointer-events-none">
            🔍 คลิกเพื่อโฟกัสภาพ Art
          </div>
        )}

        {/* Destroyed / Revealed Influence Shatter VFX */}
        {revealed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-20">
            <div className="absolute inset-0 bg-red-950/50 backdrop-blur-[1px]" />
            {/* Holographic Laser Shards */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/60 via-transparent to-transparent animate-pulse" />
            <div className="h-0.5 w-[150%] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] rotate-[24deg]" />
            <div className="h-0.5 w-[150%] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] -rotate-[24deg]" />
            <div className="h-0.5 w-[120%] bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)] rotate-[65deg]" />
            <span className="relative bg-red-950/95 border border-red-500 text-red-300 text-lg font-black uppercase px-3.5 py-1 rounded-lg shadow-2xl tracking-widest animate-pulse">
              สูญเสีย
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

