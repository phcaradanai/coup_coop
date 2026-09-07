import { Users, Copy, Check, Settings, Clock, Bot, Trash2 } from "lucide-react";
import { useState } from "react";
import { Socket } from "socket.io-client";
import { ClientToServerEvents, GameState, ServerToClientEvents, RoomSettings } from "../shared/types";
import { audioFeedback } from "../utils/audio";
import Avatar from "./Avatar";

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  gameState: GameState;
  uid?: string;
  playerName?: string;
}

const DURATION_PRESETS = [15, 30, 45, 60];

export default function Lobby({ socket, gameState, uid, playerName }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = gameState.players[0]?.id === uid;
  const settings = gameState.settings || { timerEnabled: true, turnDuration: 30 };

  const copyRoom = () => {
    navigator.clipboard.writeText(gameState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    socket.emit("startGame");
  };

  const handleUpdateTimerEnabled = (enabled: boolean) => {
    socket.emit("updateSettings", {
      timerEnabled: enabled,
      turnDuration: settings.turnDuration || 30
    });
  };

  const handleUpdateDuration = (duration: number) => {
    socket.emit("updateSettings", {
      timerEnabled: settings.timerEnabled,
      turnDuration: duration
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 py-8">
      <div className="w-full max-w-xl md:max-w-2xl bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-red-600">รอล็อบบี้</h2>
            <p className="text-base text-zinc-400 uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              กำลังรอ <span className="flex gap-1">
                <span className="w-1 h-1 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </p>
          </div>

          <div className="flex gap-2.5">
            <button 
              onClick={copyRoom}
              className="flex items-center gap-2.5 bg-zinc-950 hover:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-800 transition-colors cursor-pointer group"
            >
              <div>
                <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-0.5">รหัสห้อง</div>
                <div className="font-mono text-lg font-bold text-zinc-200">{gameState.roomId}</div>
              </div>
              {copied ? <Check className="text-green-500" size={18} /> : <Copy className="text-zinc-500 group-hover:text-zinc-300 transition-colors" size={18} />}
            </button>
            <button 
              onClick={() => socket.emit("leaveRoom")}
              className="flex items-center px-4 bg-zinc-950 hover:bg-red-950/40 border border-zinc-800 rounded-xl transition-colors text-base font-bold text-zinc-400 hover:text-red-400 uppercase tracking-wider cursor-pointer"
            >
              ออก
            </button>
          </div>
        </div>

        {/* Room Settings Info & Host Controls */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-amber-500" />
              <span className="text-lg font-bold uppercase tracking-wide text-zinc-300">การตั้งค่าห้อง</span>
            </div>
            {isHost ? (
              <span className="text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-mono font-bold">
                คุณเป็นหัวหน้าห้อง (ปรับแต่งได้)
              </span>
            ) : (
              <span className="text-sm text-zinc-500 font-mono">
                กำหนดโดยหัวหน้าห้อง
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-900 flex flex-col gap-3.5">
            {/* Role Set Selection */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-base text-zinc-200">
                <span>โหมดการ์ดบทบาท:</span>
                <div className="flex items-center gap-1.5 font-mono text-amber-400 font-bold text-base">
                  <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                    <img 
                      src={settings.roleSet === "inquisitor" ? "/cards/inquisitor.jpg" : "/cards/ambassador.jpg"} 
                      alt="Role" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <span>{settings.roleSet === "inquisitor" ? "ผู้ตรวจการ (Inquisitor)" : "ทูต (Ambassador)"}</span>
                </div>
              </div>
              {isHost ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      socket.emit("updateSettings", {
                        ...settings,
                        roleSet: "classic"
                      })
                    }
                    className={`py-2.5 px-3 text-base rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                      settings.roleSet !== "inquisitor"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full border border-emerald-400/60 overflow-hidden shadow bg-black/60 shrink-0">
                      <img src="/cards/ambassador.jpg" alt="Ambassador" className="w-full h-full object-cover" />
                    </div>
                    <span>ดั้งเดิม (Ambassador)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      socket.emit("updateSettings", {
                        ...settings,
                        roleSet: "inquisitor"
                      })
                    }
                    className={`py-2.5 px-3 text-base rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                      settings.roleSet === "inquisitor"
                        ? "bg-teal-500/20 border-teal-500 text-teal-300 font-bold shadow-sm"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full border border-teal-400/60 overflow-hidden shadow bg-black/60 shrink-0">
                      <img src="/cards/inquisitor.jpg" alt="Inquisitor" className="w-full h-full object-cover" />
                    </div>
                    <span>ส่วนเสริม (Inquisitor)</span>
                  </button>
                </div>
              ) : (
                <p className="text-base text-zinc-400">
                  {settings.roleSet === "inquisitor"
                    ? "แทนที่บทบาททูตด้วยผู้ตรวจการ (Inquisitor) แลกไพ่ 1 ใบหรือส่องไพ่คู่ต่อสู้"
                    : "ใช้บทบาททูตดั้งเดิม (Ambassador) จั่ว 2 คืน 2"}
                </p>
              )}
            </div>

            <div className="h-px bg-zinc-900" />

            <div className="flex items-center justify-between">
              <span className="text-base text-zinc-200">นับเวลาถอยหลังแต่ละตา</span>
              {isHost ? (
                <button
                  type="button"
                  onClick={() => handleUpdateTimerEnabled(!settings.timerEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${settings.timerEnabled ? 'bg-amber-600' : 'bg-zinc-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.timerEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              ) : (
                <span className="text-base font-mono font-bold text-amber-400">
                  {settings.timerEnabled ? "เปิด" : "ปิด"}
                </span>
              )}
            </div>

            {settings.timerEnabled && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-base text-zinc-400">
                  <span>เวลานับถอยหลังต่อตา:</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.turnDuration} วินาที</span>
                </div>
                {isHost && (
                  <div className="grid grid-cols-4 gap-2">
                    {DURATION_PRESETS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => handleUpdateDuration(dur)}
                        className={`py-1.5 text-base font-mono rounded-lg border transition-colors ${
                          settings.turnDuration === dur
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Player List */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-base uppercase tracking-wider text-zinc-300">
              <Users size={18} className="text-amber-500" />
              ผู้เล่น ({gameState.players.length}/6)
            </h3>
            {isHost && gameState.players.length < 6 && (
              <button
                type="button"
                onClick={() => {
                  audioFeedback.playAction();
                  socket.emit("addBot");
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                <Bot size={15} />
                <span>+ เพิ่มบอท (Add Bot)</span>
              </button>
            )}
          </div>
          <div className="p-2.5 space-y-1.5">
            {gameState.players.map((p, idx) => {
              const isMe = (uid && p.id === uid) || (playerName && p.name === playerName);
              return (
                <div key={p.id} className="px-3.5 py-2.5 flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm border border-zinc-700 overflow-hidden">
                      <Avatar seed={p.name} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-base ${isMe ? "text-amber-400 font-bold" : "text-zinc-200"}`}>
                        {p.name} {isMe && "(คุณ)"} {idx === 0 && "👑 (หัวหน้าห้อง)"}
                      </span>
                      {p.isBot && (
                        <span className="flex items-center gap-1 text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-600/50 px-1.5 py-0.2 rounded font-mono font-bold tracking-wider">
                          <Bot size={13} />
                          BOT
                        </span>
                      )}
                    </div>
                  </div>
                  {isHost && p.isBot && (
                    <button
                      type="button"
                      onClick={() => {
                        audioFeedback.playError();
                        socket.emit("removeBot", p.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1.5 transition-colors rounded-lg hover:bg-zinc-800"
                      title="ลบบอท"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
            {gameState.players.length === 0 && (
              <div className="p-4 text-center text-zinc-500 text-base font-mono">ยังไม่มีผู้เล่น</div>
            )}
          </div>
        </div>

        <button 
          onClick={handleStart}
          disabled={gameState.players.length < 2 || (isHost && false)}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 shadow-lg shadow-red-900/20 text-white font-bold py-3.5 rounded-xl text-base uppercase tracking-wider flex justify-center items-center transition-all disabled:shadow-none cursor-pointer"
        >
          {gameState.players.length < 2 ? "รอผู้เล่นคนอื่นเข้าเพิ่ม" : isHost ? "เริ่มเกม" : "รอหัวหน้าห้องเริ่มเกม"}
        </button>
      </div>
    </div>
  );
}
