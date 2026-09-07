import { X, ZoomIn } from "lucide-react";
import { Role } from "../shared/types";

interface Props {
  onClose: () => void;
  onSelectRole?: (role: Role) => void;
}

export default function RulesOverlay({ onClose, onSelectRole }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100">กฎการเล่น (Rules Overview)</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          
          <section>
            <h3 className="text-zinc-300 text-lg font-bold uppercase tracking-wide mb-3 border-b border-zinc-800 pb-1.5">การกระทำพื้นฐาน (ทุกคนทำได้)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-amber-500 mb-1 block text-base">รายได้ (Income)</span>
                <p className="text-base text-zinc-300">รับ 1 เหรียญ (จับโกหกไม่ได้ ไม่ถูกขัดขวาง)</p>
              </div>
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-sky-400 mb-1 block text-base">เงินสนับสนุน (Foreign Aid)</span>
                <p className="text-base text-zinc-300">รับ 2 เหรียญ (ดยุคขัดขวางได้)</p>
              </div>
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 md:col-span-2">
                <span className="font-bold text-red-500 mb-1 block text-base">รัฐประหาร (Coup)</span>
                <p className="text-base text-zinc-300">จ่าย 7 เหรียญ เลือกตัวเป้าหมาย เป้าหมายต้องเสียไพ่ 1 ใบ (ห้ามขัดขวาง หรือจับโกหก, บังคับใช้ถ้ามี 10 เหรียญ)</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <h3 className="text-zinc-300 text-lg font-bold uppercase tracking-wide">บทบาท และ ความสามารถ</h3>
              <span className="text-sm text-cyan-400 font-mono flex items-center gap-1.5">
                <ZoomIn size={14} /> คลิกที่การ์ดเพื่อดู Art และข้อมูลแบบเต็ม
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div 
                onClick={() => onSelectRole?.("Duke")} 
                className="flex flex-col gap-2 p-3 bg-zinc-950 hover:bg-purple-950/20 rounded-xl border border-zinc-800 hover:border-purple-500/80 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-purple-500/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src="/cards/duke.jpg" alt="Duke" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-fuchsia-400 text-lg">ดยุค (Duke)</span>
                  </div>
                  <ZoomIn size={15} className="text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="text-base text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">กระทำ: </span>เก็บภาษี (Tax) รับ 3 เหรียญ<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>เงินสนับสนุน (Foreign Aid)
                </div>
              </div>

              <div 
                onClick={() => onSelectRole?.("Assassin")} 
                className="flex flex-col gap-2 p-3 bg-zinc-950 hover:bg-red-950/20 rounded-xl border border-zinc-800 hover:border-red-500/80 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-red-500/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src="/cards/assassin.jpg" alt="Assassin" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-red-300 text-lg">สังหาร (Assassin)</span>
                  </div>
                  <ZoomIn size={15} className="text-zinc-500 group-hover:text-red-400 transition-colors" />
                </div>
                <div className="text-base text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">กระทำ: </span>ลอบสังหาร (Assassinate) จ่าย 3 เหรียญ กำจัดไพ่เป้าหมาย 1 ใบ<br/>
                </div>
              </div>

              <div 
                onClick={() => onSelectRole?.("Captain")} 
                className="flex flex-col gap-2 p-3 bg-zinc-950 hover:bg-sky-950/20 rounded-xl border border-zinc-800 hover:border-sky-500/80 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-sky-500/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src="/cards/captain.jpg" alt="Captain" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-sky-400 text-lg">กัปตัน (Captain)</span>
                  </div>
                  <ZoomIn size={15} className="text-zinc-500 group-hover:text-sky-400 transition-colors" />
                </div>
                <div className="text-base text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">กระทำ: </span>ขโมย (Steal) ปล้น 2 เหรียญจากผู้อื่น<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>โดนปล้นด้วยกัปตัน
                </div>
              </div>

              <div 
                onClick={() => onSelectRole?.("Ambassador")} 
                className="flex flex-col gap-2 p-3 bg-zinc-950 hover:bg-emerald-950/20 rounded-xl border border-zinc-800 hover:border-emerald-500/80 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-emerald-500/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src="/cards/ambassador.jpg" alt="Ambassador" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-lime-400 text-lg">ทูต (Ambassador)</span>
                  </div>
                  <ZoomIn size={15} className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="text-base text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">กระทำ: </span>สับเปลี่ยน (Exchange) จั่วไพ่ 2 ใบจากกอง แล้วเลือกเก็บไว้ คืนที่เหลือ<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>โดนปล้นด้วยกัปตัน
                </div>
              </div>

              <div 
                onClick={() => onSelectRole?.("Contessa")} 
                className="flex flex-col gap-2 p-3 bg-zinc-950 hover:bg-rose-950/20 rounded-xl border border-zinc-800 hover:border-rose-500/80 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-rose-500/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src="/cards/contessa.jpg" alt="Contessa" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-rose-400 text-lg">คุณหญิง (Contessa)</span>
                  </div>
                  <ZoomIn size={15} className="text-zinc-500 group-hover:text-rose-400 transition-colors" />
                </div>
                <div className="text-base text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">ขัดขวาง: </span>ลอบสังหาร (Assassinate)
                </div>
              </div>

              <div 
                onClick={() => onSelectRole?.("Inquisitor")} 
                className="flex flex-col gap-2 p-3 bg-zinc-950 hover:bg-teal-950/30 rounded-xl border border-teal-800/60 hover:border-teal-400 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border border-teal-500/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src="/cards/inquisitor.jpg" alt="Inquisitor" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-teal-400 text-lg">ผู้ตรวจการ (Inquisitor)</span>
                    <span className="text-xs bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-mono">ภาคเสริม</span>
                  </div>
                  <ZoomIn size={15} className="text-zinc-500 group-hover:text-teal-400 transition-colors" />
                </div>
                <div className="text-base text-zinc-300 leading-relaxed">
                  <span className="text-zinc-500">กระทำ: </span>ส่องไพ่ 1 ใบของคู่ต่อสู้ หรือ แลกไพ่ 1 ใบกับกองกลาง<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>โดนปล้นด้วยกัปตัน
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
