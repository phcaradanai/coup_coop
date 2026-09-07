import { Users, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Socket } from "socket.io-client";
import { ClientToServerEvents, GameState, ServerToClientEvents } from "../shared/types";
import { audioFeedback } from "../utils/audio";
import Avatar from "./Avatar";

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  gameState: GameState;
  playerName: string;
}

export default function Lobby({ socket, gameState, playerName }: Props) {
  const [copied, setCopied] = useState(false);

  const copyRoom = () => {
    navigator.clipboard.writeText(gameState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    socket.emit("startGame");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4">
      <div className="w-full max-w-xl bg-zinc-900 p-6 rounded-lg border border-zinc-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black tracking-tighter text-red-600">รอล็อบบี้</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 flex items-center gap-2">
              กำลังรอ <span className="flex gap-1">
                <span className="w-1 h-1 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={copyRoom}
              className="flex items-center gap-3 bg-zinc-950 hover:bg-zinc-800 px-4 py-2 rounded border border-zinc-800 transition-colors cursor-pointer group"
            >
              <div>
                <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">รหัสห้อง</div>
                <div className="font-mono text-sm text-zinc-300">{gameState.roomId}</div>
              </div>
              {copied ? <Check className="text-green-500" size={16} /> : <Copy className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={16} />}
            </button>
            <button 
              onClick={() => socket.emit("leaveRoom")}
              className="flex items-center px-4 bg-zinc-950 hover:bg-red-950/40 border border-zinc-800 rounded transition-colors text-xs font-bold text-zinc-500 hover:text-red-400 uppercase tracking-widest"
            >
              ออก
            </button>
          </div>
        </div>

        <div className="bg-zinc-950 rounded border border-zinc-800 overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400">
              <Users size={14} className="text-amber-500" />
              ผู้เล่น ({gameState.players.length}/6)
            </h3>
          </div>
          <div className="p-2 space-y-1">
            {gameState.players.map(p => (
              <div key={p.id} className="px-3 py-2 flex items-center justify-between rounded bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center font-bold text-[10px] border border-zinc-700 overflow-hidden">
                    <Avatar seed={p.name} />
                  </div>
                  <span className={`font-mono text-xs ${p.name === playerName ? "text-amber-500 font-bold" : "text-zinc-300"}`}>
                    {p.name} {p.name === playerName && "(คุณ)"}
                  </span>
                </div>
              </div>
            ))}
            {gameState.players.length === 0 && (
              <div className="p-4 text-center text-zinc-600 text-xs font-mono">ยังไม่มีผู้เล่น</div>
            )}
          </div>
        </div>

        <button 
          onClick={handleStart}
          disabled={gameState.players.length < 2}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 shadow-lg shadow-red-900/20 text-white font-bold py-3 rounded text-xs uppercase tracking-widest flex justify-center items-center transition-all disabled:shadow-none"
        >
          {gameState.players.length < 2 ? "รอผู้เล่นคนอื่นเข้าเพิ่ม" : "เริ่มเกม"}
        </button>
      </div>
    </div>
  );
}
