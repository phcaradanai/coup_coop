import React from "react";
import { Role } from "../shared/types";
import { X, ZoomIn, Shield, Swords, Coins, RefreshCw, Search } from "lucide-react";

interface Props {
  role: Role | "Unknown" | null;
  onClose: () => void;
}

const roleArtMap: Record<Role | "Unknown", string> = {
  Duke: "/cards/duke.jpg",
  Assassin: "/cards/assassin.jpg",
  Captain: "/cards/captain.jpg",
  Ambassador: "/cards/ambassador.jpg",
  Contessa: "/cards/contessa.jpg",
  Inquisitor: "/cards/inquisitor.jpg",
  Unknown: "/cards/unknown.jpg"
};

const roleDetails: Record<Role | "Unknown", {
  name: string;
  roleCode: string;
  color: string;
  borderColor: string;
  desc: string;
  actions: string[];
  blocks: string[];
  lore: string;
}> = {
  Duke: {
    name: "ดยุค (Duke)",
    roleCode: "ROLE_DUKE_01",
    color: "text-purple-400",
    borderColor: "border-purple-500",
    desc: "ผู้มีอำนาจระดับสูงในระบบเครือข่ายจักรวรรดิ ควบคุมการไหลเวียนของทรัพยากรและภาษี",
    actions: ["เก็บภาษี (Tax): รับ 3 เหรียญเข้ากระเป๋าทันทีโดยไม่ต้องมีเงื่อนไข"],
    blocks: ["ขัดขวางเงินสนับสนุน (Block Foreign Aid): สกัดกั้นผู้เล่นอื่นไม่ให้รับ 2 เหรียญจากคลังกลาง"],
    lore: "ผู้นำตระกูลขุนนางไซเบอร์ผู้สวมมงกุฎโฮโลแกรม ควบคุมวงจรอำนาจและเงินทุนของมหานครนิว-เวนิส"
  },
  Assassin: {
    name: "มือสังหาร (Assassin)",
    roleCode: "ROLE_ASSASSIN_02",
    color: "text-red-400",
    borderColor: "border-red-500",
    desc: "มือสังหารเงามืดไซเบอร์เนติก ปฏิบัติการในตรอกมืดของนีโอซิตี้ พร้อมดาบความร้อนคู่",
    actions: ["ลอบสังหาร (Assassinate): จ่าย 3 เหรียญ เพื่อกำจัดไพ่เป้าหมาย 1 ใบ"],
    blocks: ["ไม่สามารถใช้ขัดขวางการกระทำใดๆ ได้"],
    lore: "ชุดเกราะ Exoskeleton สีดำด้าน ล่องหนผ่านกล้องตรวจจับเพื่อลงทัณฑ์เป้าหมายตามสัญญาจ้าง"
  },
  Captain: {
    name: "กัปตัน (Captain)",
    roleCode: "ROLE_CAPTAIN_03",
    color: "text-sky-400",
    borderColor: "border-sky-500",
    desc: "ผู้บัญชาการเรือรบดัดแปลงไซเบอร์ ผู้ควบคุมน่านฟ้าและเครือข่ายท่าเทียบยานอวกาศ",
    actions: ["ขโมย (Steal): ปล้น 2 เหรียญจากผู้เล่นเป้าหมาย"],
    blocks: ["ป้องกันการถูกขโมย (Block Steal): ขัดขวางกัปตันฝ่ายตรงข้ามไม่ให้ขโมยเหรียญ"],
    lore: "ผ่านศึกสงครามจักรกลมานับครั้งไม่ถ้วน มีดวงตาไซบอร์กเล็งพิกัดและอุปกรณ์รีดไถพลังงาน EMP"
  },
  Ambassador: {
    name: "ทูต (Ambassador)",
    roleCode: "ROLE_AMBASSADOR_04",
    color: "text-emerald-400",
    borderColor: "border-emerald-500",
    desc: "ผู้แทนทางการทูตดิจิทัล มีสิทธิ์เข้าถึงและสับเปลี่ยนฐานข้อมูลลับในคลังข้อมูลส่วนกลาง",
    actions: ["สับเปลี่ยน (Exchange): จั่วไพ่ 2 ใบจากกองกลาง แล้วเลือกเก็บไว้ตามจำนวนไพ่ที่มี คืนที่เหลือ"],
    blocks: ["ป้องกันการถูกขโมย (Block Steal): ขัดขวางการปล้นเหรียญจากกัปตัน"],
    lore: "ผู้เชี่ยวชาญการเจรจาระดับพหุภาคี ควบคุมสิทธิในการลบล้างและเขียนทับตัวตนทางการเมือง"
  },
  Contessa: {
    name: "เคาน์เตส (Contessa)",
    roleCode: "ROLE_CONTESSA_05",
    color: "text-rose-400",
    borderColor: "border-rose-500",
    desc: "สตรีชนชั้นสูงผู้ครอบครองสนามพลังนาโนชิลด์ สะท้อนและเบี่ยงเบนการโจมตีทุกรูปแบบ",
    actions: ["ไม่มีการกระทำเชิงรุกในเทิร์นของตนเอง"],
    blocks: ["ขัดขวางการลอบสังหาร (Block Assassination): ลบล้างความเสียหายจากมือสังหาร"],
    lore: "มาพร้อมเกราะพลังงานแม่เหล็กไฟฟ้ากุหลาบทองคำ ปกป้องตระกูลและเครือข่ายจากการลอบสังหาร"
  },
  Inquisitor: {
    name: "ผู้ตรวจการ (Inquisitor)",
    roleCode: "ROLE_INQUISITOR_EX",
    color: "text-teal-400",
    borderColor: "border-teal-500",
    desc: "ผู้ตรวจการพิเศษประจำสำนักสืบสวนไซเบอร์ สามารถเจาะความทรงจำและบังคับสับเปลี่ยนตัวตน",
    actions: [
      "ส่องไพ่ (Examine): สุ่มตรวจไพ่ 1 ใบของคู่ต่อสู้ แล้วเลือกว่าจะคืนหรือบังคับสับจั่วใหม่",
      "แลกไพ่ 1 ใบ (Exchange): จั่ว 1 ใบจากกองกลาง แล้วเลือกเก็บ 1 ใบ"
    ],
    blocks: ["ป้องกันการถูกขโมย (Block Steal): ขัดขวางการปล้นเหรียญจากกัปตัน"],
    lore: "เลนส์สแกนเนอร์ควอนตัมมองทะลุคำโกหกและเจาะระบบการพรางตัวของเครือข่ายใต้ดิน"
  },
  Unknown: {
    name: "ข้อมูลถูกเข้ารหัส (Encrypted Identity)",
    roleCode: "IDENTITY_LOCKED",
    color: "text-zinc-400",
    borderColor: "border-zinc-700",
    desc: "ไพ่ใบนี้ยังคว่ำหน้าอยู่ ตัวตนและข้อมูลจำเพาะถูกเข้ารหัสความปลอดภัยระดับ Quantum Key",
    actions: ["ขึ้นอยู่กับบทบาทจริงเมื่อเปิดเผย"],
    blocks: ["ขึ้นอยู่กับบทบาทจริงเมื่อเปิดเผย"],
    lore: "ความลับคืออาวุธที่ทรงพลังที่สุดในเวทีการเมืองของ Coup"
  }
};

export default function CardFocusModal({ role, onClose }: Props) {
  if (!role) return null;

  const info = roleDetails[role] || roleDetails.Unknown;
  const artSrc = roleArtMap[role] || roleArtMap.Unknown;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border-2 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border-zinc-800 shadow-black animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 bg-black/70 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white border border-white/20 transition-colors cursor-pointer shadow-lg"
          title="ปิด"
        >
          <X size={20} />
        </button>

        {/* Left: Full-bleed Character Art Showcase */}
        <div className="relative w-full md:w-1/2 h-72 md:h-auto min-h-[300px] overflow-hidden bg-black flex items-center justify-center">
          <img
            src={artSrc}
            alt={role}
            className="w-full h-full object-cover object-center scale-100 hover:scale-105 transition-transform duration-700"
          />
          {/* Cyberpunk ambient Vignette & Neon Circuit Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950 opacity-90 pointer-events-none" />
          
          {/* Cyber Badge Watermark */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-black/85 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/15">
            <ZoomIn size={20} className="text-cyan-400" />
            <span className="text-xl font-mono uppercase tracking-widest text-cyan-300 font-bold">
              {info.roleCode}
            </span>
          </div>
        </div>

        {/* Right: Character Info, Lore & Tactical Rules */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto space-y-5 bg-gradient-to-b from-zinc-950 to-zinc-900">
          
          <div>
            {/* Header / Subtitle */}
            <div className="text-sm font-mono tracking-widest text-zinc-500 uppercase font-bold mb-1">
              CYBERNETIC DOSSIER // CLASSIFIED
            </div>
            <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${info.color}`}>
              {info.name}
            </h2>
            <p className="text-base text-zinc-300 mt-2 leading-relaxed">
              {info.desc}
            </p>
          </div>

          {/* Lore Quote Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-base italic text-zinc-200 relative pl-4 border-l-4 border-l-cyan-500 leading-relaxed">
            "{info.lore}"
          </div>

          {/* Tactical Role Rules Breakdown */}
          <div className="space-y-4 text-base">
            <div>
              <div className="text-base uppercase font-bold tracking-wide text-amber-400 mb-1.5 flex items-center gap-2">
                <span>⚡ ความสามารถเชิงรุก (Actions)</span>
              </div>
              <ul className="space-y-1.5 text-zinc-200 pl-2">
                {info.actions.map((act, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold shrink-0">▸</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-base uppercase font-bold tracking-wide text-sky-400 mb-1.5 flex items-center gap-2">
                <span>🛡️ ความสามารถในการขัดขวาง (Blocks)</span>
              </div>
              <ul className="space-y-1.5 text-zinc-200 pl-2">
                {info.blocks.map((blk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold shrink-0">▸</span>
                    <span>{blk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-base font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง (Close)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

