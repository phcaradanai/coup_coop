import { useState, useEffect } from "react";
import { Plus, LogIn, Users, Settings, Clock, Check } from "lucide-react";
import { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, RoomInfo, RoomSettings } from "../shared/types";
import { audioFeedback } from "../utils/audio";

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  onJoin: (name: string) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60];

export default function Home({ socket, onJoin }: Props) {
  const [name, setName] = useState(() => localStorage.getItem("coup_name") || "");
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  // Room Creation Settings
  const [showSettings, setShowSettings] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [turnDuration, setTurnDuration] = useState(30);

  useEffect(() => {
    socket.on("availableRooms", (availableRooms) => {
      setRooms(availableRooms);
    });

    socket.emit("requestRooms");
    const interval = setInterval(() => {
      socket.emit("requestRooms");
    }, 3000);

    return () => {
      socket.off("availableRooms");
      clearInterval(interval);
    };
  }, [socket]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("coup_name", trimmed);
    audioFeedback.init();
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    const settings: RoomSettings = {
      timerEnabled,
      turnDuration: timerEnabled ? turnDuration : 30
    };
    socket.emit("joinRoom", newRoom, trimmed, settings);
    onJoin(trimmed);
  };

  const handleJoin = (targetRoomId: string = roomId) => {
    const trimmed = name.trim();
    const trimmedRoom = targetRoomId.trim();
    if (!trimmed || !trimmedRoom) return;
    localStorage.setItem("coup_name", trimmed);
    audioFeedback.init();
    socket.emit("joinRoom", trimmedRoom.toUpperCase(), trimmed);
    onJoin(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 py-8">
      <div className="w-full max-w-md bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl mb-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tighter text-red-600">COUP <span className="text-zinc-400 font-light text-sm uppercase tracking-widest block mt-1">ฉบับดิจิทัล</span></h1>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 uppercase tracking-wider mb-2 font-bold">ชื่อผู้เล่น</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-red-500/50 transition-colors text-base font-mono"
              placeholder="ใส่ชื่อของคุณ"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                localStorage.setItem("coup_name", e.target.value);
              }}
              maxLength={15}
            />
          </div>

          {/* Room Settings Toggle */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
            <button 
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between text-base text-zinc-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <Settings size={18} className="text-amber-500" />
                ตั้งค่าห้องที่จะสร้าง
              </span>
              <span className="text-sm text-amber-500/90 font-mono">
                {timerEnabled ? `⏱️ จับเวลา (${turnDuration}s)` : '⏱️ ไม่จำกัดเวลา'}
              </span>
            </button>

            {showSettings && (
              <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-base text-zinc-200">เปิดนับเวลาถอยหลัง</span>
                  <button 
                    type="button"
                    onClick={() => setTimerEnabled(!timerEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${timerEnabled ? 'bg-amber-600' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${timerEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {timerEnabled && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm text-zinc-400">
                      <span>เวลานับถอยหลังต่อตา:</span>
                      <span className="font-mono text-amber-400 font-bold">{turnDuration} วินาที</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {DURATION_PRESETS.map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setTurnDuration(dur)}
                          className={`py-1.5 text-sm font-mono rounded-lg border transition-colors ${
                            turnDuration === dur
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {dur}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-1 flex flex-col gap-3">
            <button 
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-3 rounded-xl text-base uppercase tracking-wider flex justify-center items-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:shadow-none cursor-pointer"
            >
              <Plus size={18} />
              สร้างห้องใหม่
            </button>
            
            <div className="flex bg-zinc-950 rounded-xl border border-zinc-800 focus-within:border-red-500/50 transition-colors p-1 gap-1.5">
              <input 
                className="flex-1 bg-transparent px-3 py-2 outline-none uppercase font-mono text-base placeholder:text-zinc-600 text-zinc-100"
                placeholder="รหัสห้อง"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={6}
              />
              <button 
                onClick={() => handleJoin()}
                disabled={!name.trim() || !roomId.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-transparent disabled:text-zinc-700 text-white px-4 rounded-lg font-bold transition-colors flex items-center justify-center cursor-pointer"
              >
                <LogIn size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        <h2 className="text-base text-zinc-400 uppercase tracking-wider mb-2 font-bold px-2">ห้องที่กำลังเปิดรับผู้เล่น</h2>
        {rooms.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 text-center text-zinc-500 text-base">
            ไม่มีห้องที่เปิดอยู่ตอนนี้
          </div>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {rooms.map(room => (
                <button
                  key={room.roomId}
                  onClick={() => handleJoin(room.roomId)}
                  disabled={!name.trim() || room.status !== 'LOBBY'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-bold text-zinc-200 group-disabled:text-zinc-500">{room.roomId}</span>
                    <div className="flex items-center gap-1 text-zinc-400 text-sm">
                      <Users size={15} />
                      <span>{room.playersCount}</span>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">
                      {room.settings?.timerEnabled ? `⏱️ ${room.settings.turnDuration}s` : '⏱️ ไม่จำกัด'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold tracking-wider uppercase ${
                      room.status === 'LOBBY' ? 'text-green-400 group-disabled:text-green-500/50' : 
                      room.status === 'PLAYING' ? 'text-amber-400' : 'text-zinc-500'
                    }`}>
                      {room.status === 'LOBBY' ? 'รอผู้เล่น' : room.status === 'PLAYING' ? 'กำลังเล่น' : 'จบเกม'}
                    </span>
                    
                    <div className="bg-zinc-800 group-hover:bg-zinc-700 group-disabled:bg-zinc-900 group-disabled:text-zinc-700 text-white rounded-lg p-2 transition-colors">
                      <LogIn size={15} />
                    </div>
                  </div>
                </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
