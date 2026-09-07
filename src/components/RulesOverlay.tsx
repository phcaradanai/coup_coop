import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function RulesOverlay({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <h2 className="text-lg font-bold uppercase tracking-widest text-zinc-100">กฎการเล่น (Rules Overview)</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
          
          <section>
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">การกระทำพื้นฐาน (ทุกคนทำได้)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="font-bold text-amber-500 mb-1 block">รายได้ (Income)</span>
                <p className="text-sm text-zinc-400">รับ 1 เหรียญ (จับโกหกไม่ได้ ไม่ถูกขัดขวาง)</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <span className="font-bold text-sky-400 mb-1 block">เงินสนับสนุน (Foreign Aid)</span>
                <p className="text-sm text-zinc-400">รับ 2 เหรียญ (ดยุคขัดขวางได้)</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 md:col-span-2">
                <span className="font-bold text-red-500 mb-1 block">รัฐประหาร (Coup)</span>
                <p className="text-sm text-zinc-400">จ่าย 7 เหรียญ เลือกตัวเป้าหมาย เป้าหมายต้องเสียไพ่ 1 ใบ (ห้ามขัดขวาง หรือจับโกหก, บังคับใช้ถ้ามี 10 เหรียญ)</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">บทบาท และ ความสามารถ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div className="flex flex-col gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span className="font-bold text-fuchsia-400 text-lg">ดยุค (Duke)</span>
                </div>
                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-500">กระทำ: </span>เก็บภาษี (Tax) รับ 3 เหรียญ<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>เงินสนับสนุน (Foreign Aid)
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                   <span className="text-2xl">🗡️</span>
                  <span className="font-bold text-zinc-200 text-lg">สังหาร (Assassin)</span>
                </div>
                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-500">กระทำ: </span>ลอบสังหาร (Assassinate) จ่าย 3 เหรียญ กำจัดไพ่เป้าหมาย 1 ใบ<br/>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚓</span>
                  <span className="font-bold text-sky-400 text-lg">กัปตัน (Captain)</span>
                </div>
                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-500">กระทำ: </span>ขโมย (Steal) ปล้น 2 เหรียญจากผู้อื่น<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>โดนปล้นด้วยกัปตัน
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📜</span>
                  <span className="font-bold text-lime-400 text-lg">ทูต (Ambassador)</span>
                </div>
                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-500">กระทำ: </span>สับเปลี่ยน (Exchange) จั่วไพ่ 2 ใบจากกอง แล้วเลือกเก็บไว้ (ตามจำนวนไพ่ที่มี) คืนที่เหลือ<br/>
                  <span className="text-zinc-500">ขัดขวาง: </span>โดนปล้นด้วยกัปตัน
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <span className="font-bold text-rose-500 text-lg">คุณหญิง (Contessa)</span>
                </div>
                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-500">ขัดขวาง: </span>ลอบสังหาร (Assassinate)
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
