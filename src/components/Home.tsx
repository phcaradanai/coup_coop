import { useState, useEffect } from "react";
import { Copy, Plus, LogIn, Users } from "lucide-react";
import { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, RoomInfo } from "../shared/types";
import { audioFeedback } from "../utils/audio";

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  onJoin: (name: string) => void;
}

export default function Home({ socket, onJoin }: Props) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

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
    if (!name.trim()) return;
    audioFeedback.init();
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit("joinRoom", newRoom, name);
    onJoin(name);
  };

  const handleJoin = (targetRoomId: string = roomId) => {
    if (!name.trim() || !targetRoomId.trim()) return;
    audioFeedback.init();
    socket.emit("joinRoom", targetRoomId.toUpperCase(), name);
    onJoin(name);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 py-8">
      <div className="w-full max-w-sm bg-zinc-900 p-6 rounded-lg border border-zinc-800 shadow-xl mb-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-red-600">COUP <span className="text-zinc-500 font-light text-sm uppercase tracking-widest block mt-1">ฉบับดิจิทัล</span></h1>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">ชื่อผู้เล่น</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-3 outline-none focus:border-red-500/50 transition-colors text-sm font-mono"
              placeholder="ใส่ชื่อของคุณ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
            />
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <button 
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-3 rounded text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:shadow-none"
            >
              <Plus size={16} />
              สร้างห้องใหม่
            </button>
            
            <div className="flex bg-zinc-950 rounded border border-zinc-800 focus-within:border-red-500/50 transition-colors p-1">
              <input 
                className="flex-1 bg-transparent px-3 py-2 outline-none uppercase font-mono text-sm placeholder:text-zinc-700"
                placeholder="รหัสห้อง"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={6}
              />
              <button 
                onClick={() => handleJoin()}
                disabled={!name.trim() || !roomId.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-transparent disabled:text-zinc-700 text-white px-4 rounded font-bold transition-colors flex items-center justify-center"
              >
                <LogIn size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-bold px-2">ห้องที่กำลังเปิดรับผู้เล่น</h2>
        {rooms.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-6 text-center text-zinc-600 text-sm">
            ไม่มีห้องที่เปิดอยู่ตอนนี้
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {rooms.map(room => (
                <button
                  key={room.roomId}
                  onClick={() => handleJoin(room.roomId)}
                  disabled={!name.trim() || room.status !== 'LOBBY'}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between group hover:border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-800"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg font-bold text-zinc-300 group-disabled:text-zinc-500">{room.roomId}</span>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <Users size={14} />
                      <span>{room.playersCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${
                      room.status === 'LOBBY' ? 'text-green-500 group-disabled:text-green-500/50' : 
                      room.status === 'PLAYING' ? 'text-amber-500' : 'text-zinc-500'
                    }`}>
                      {room.status === 'LOBBY' ? 'รอผู้เล่น' : room.status === 'PLAYING' ? 'กำลังเล่น' : 'จบเกม'}
                    </span>
                    
                    <div className="bg-zinc-800 group-hover:bg-zinc-700 group-disabled:bg-zinc-900 group-disabled:text-zinc-700 text-white rounded p-1.5 transition-colors">
                      <LogIn size={14} />
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
