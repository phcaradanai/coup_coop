import { Role } from "../shared/types";

interface Props {
  role: Role | "Unknown";
  revealed?: boolean;
}

const roleNames: Record<Role | "Unknown", string> = {
  Duke: "ดยุค (Duke)",
  Assassin: "มือสังหาร (Assassin)",
  Captain: "กัปตัน (Captain)",
  Ambassador: "ทูต (Ambass.)",
  Contessa: "เคาน์เตส (Contessa)",
  Unknown: "ไม่ทราบ"
};

const roleStyles: Record<Role | "Unknown", { bg: string, text: string, textSub: string, desc: string, icon: string }> = {
  Duke: { bg: "from-purple-900 to-purple-950 border-purple-500", text: "text-purple-300", textSub: "text-purple-400", desc: "รับ 3 เหรียญ / ป้องกันการขอเงินสนับสนุน", icon: "💰" },
  Assassin: { bg: "from-zinc-800 to-black border-red-500", text: "text-red-400", textSub: "text-red-500", desc: "จ่าย 3 เหรียญเพื่อสังหารผู้เล่นอื่น", icon: "🗡️" },
  Captain: { bg: "from-indigo-900 to-indigo-950 border-indigo-500", text: "text-indigo-300", textSub: "text-indigo-400", desc: "ขโมย 2 เหรียญ / ป้องกันการถูกขโมย", icon: "⚓" },
  Ambassador: { bg: "from-green-900 to-green-950 border-green-500", text: "text-green-300", textSub: "text-green-400", desc: "จั่ว 2 ทิ้ง 2 / ป้องกันการถูกขโมย", icon: "📜" },
  Contessa: { bg: "from-rose-900 to-rose-950 border-rose-500", text: "text-rose-300", textSub: "text-rose-400", desc: "ป้องกันการถูกสังหาร", icon: "🛡️" },
  Unknown: { bg: "from-zinc-800 to-zinc-900 border-zinc-600", text: "text-zinc-400", textSub: "text-zinc-500", desc: "ไพ่คว่ำ", icon: "?" }
};

export default function PlayingCard({ role, revealed }: Props) {
  const style = revealed ? { bg: "from-zinc-800 to-zinc-900 border-zinc-600", text: "text-zinc-400", textSub: "text-zinc-500", desc: roleStyles[role].desc, icon: roleStyles[role].icon } : roleStyles[role];

  return (
    <div className={`relative w-40 h-28 shrink-0 bg-gradient-to-br border-2 rounded-lg p-3 shadow-xl ${style.bg} ${revealed ? 'opacity-60' : ''}`}>
      <div className={`text-[10px] font-bold uppercase ${style.text}`}>{roleNames[role]} {revealed && "(ตาย)"}</div>
      <div className={`mt-1 text-[8px] leading-tight flex-wrap ${style.textSub}`}>{style.desc}</div>
      <div className="absolute bottom-2 right-2 text-3xl opacity-20">{style.icon}</div>
      {revealed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-px w-full bg-red-600 rotate-[20deg]" />
        </div>
      )}
    </div>
  );
}
