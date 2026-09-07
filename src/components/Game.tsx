import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { ActionType, ClientToServerEvents, GameState, Role, ServerToClientEvents } from "../shared/types";
import { Coins, Swords, Smile, BookOpen } from "lucide-react";
import PlayingCard from "./PlayingCard";
import ActionPanel from "./ActionPanel";
import { audioFeedback } from "../utils/audio";
import Avatar from "./Avatar";
import TurnTimer from "./TurnTimer";
import GameHistoryLog from "./GameHistoryLog";
import RulesOverlay from "./RulesOverlay";

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  gameState: GameState;
  playerName: string;
}

const EMOTE_LIST = ["👍", "👎", "🤔", "🤬", "💀", "💰", "👀", "🤡"];

export default function Game({ socket, gameState, playerName }: Props) {
  const [emotes, setEmotes] = useState<Record<string, { emoji: string; timeoutId: any }>>({});
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const notifiedTurnRef = useRef<number>(-1);
  const logsCountRef = useRef<number>(gameState.logs?.length || 0);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (gameState.logs && gameState.logs.length > logsCountRef.current) {
      logsCountRef.current = gameState.logs.length;
      const latestLog = gameState.logs[gameState.logs.length - 1];
      if (latestLog && !latestLog.includes("เข้าร่วมห้อง") && !latestLog.includes("ออกจากห้อง")) {
        audioFeedback.init();
        audioFeedback.playAction();
      }
    }
  }, [gameState.logs]);

  useEffect(() => {
    const handleEmote = (playerId: string, emoji: string) => {
      audioFeedback.init();
      audioFeedback.playEmote();
      
      setEmotes((prev) => {
        if (prev[playerId]?.timeoutId) {
          clearTimeout(prev[playerId].timeoutId);
        }
        
        const timeoutId = setTimeout(() => {
          setEmotes((current) => {
            const newEmotes = { ...current };
            delete newEmotes[playerId];
            return newEmotes;
          });
        }, 3000);

        return { ...prev, [playerId]: { emoji, timeoutId } };
      });
    };

    socket.on("playerEmote", handleEmote);
    return () => {
      socket.off("playerEmote", handleEmote);
    };
  }, [socket]);

  useEffect(() => {
    const me = gameState.players.find(p => p.name === playerName);
    const myIndex = me ? gameState.players.indexOf(me) : -1;
    const isMyTurnToAct = !gameState.currentAction && gameState.turnIndex === myIndex && me?.isAlive;

    if (isMyTurnToAct && notifiedTurnRef.current !== gameState.turnCounter) {
      notifiedTurnRef.current = gameState.turnCounter;
      audioFeedback.init();
      audioFeedback.playMyTurn();
    }
  }, [gameState.currentAction, gameState.turnIndex, gameState.turnCounter, gameState.players, playerName]);

  useEffect(() => {
    if (gameState.status === "FINISHED") {
      audioFeedback.init();
      audioFeedback.playWin();
    }
  }, [gameState.status]);

  const sendEmote = (emoji: string) => {
    socket.emit("emote", emoji);
    setShowEmotePicker(false);
  };

  const me = gameState.players.find(p => p.name === playerName);
  if (!me) return null;

  const getAlivePlayers = () => gameState.players.filter(p => p.isAlive);
  
  if (gameState.status === "FINISHED") {
    const winner = gameState.players.find(p => p.id === gameState.winnerId);
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center w-full">
        <Swords size={64} className="text-amber-500 mb-6" />
        <h1 className="text-5xl font-bold mb-4">{winner?.name === playerName ? "คุณชนะ!" : `${winner?.name || 'มีผู้เล่น'} ชนะเกมนี้!`}</h1>
        <p className="text-zinc-400 text-xl border-t border-zinc-800 pt-6 mt-6">จบเกม.</p>
        <div className="mt-8 flex gap-4">
          <button 
            onClick={() => socket.emit("returnToLobby")}
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-amber-900/50"
          >
            เล่นอีกครั้ง (กลับล็อบบี้)
          </button>
          <button 
            onClick={() => socket.emit("leaveRoom")}
            className="bg-zinc-800 hover:bg-zinc-700 px-8 py-3 rounded-xl font-bold transition-colors text-zinc-300"
          >
            ออก
          </button>
        </div>
      </div>
    );
  }

  // Split players into opponents
  const opponents = gameState.players.filter(p => p.id !== me.id);
  const amITargeted = gameState.currentAction?.targetId === me.id;

  return (
    <div className="flex flex-col h-full w-full max-w-7xl relative">
      {amITargeted && (
        <div className="absolute inset-0 pointer-events-none z-50 animate-pulse border-8 border-red-600/50 mix-blend-screen bg-red-900/10 shadow-[inset_0_0_100px_rgba(220,38,38,0.5)]"></div>
      )}
      
      {/* Header Navigation */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tighter text-red-600">COUP <span className="text-zinc-500 font-light text-sm uppercase tracking-widest ml-2 hidden sm:inline">ฉบับดิจิทัล</span></h1>
          <div className="h-4 w-px bg-zinc-700 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="bg-zinc-800 px-2 py-1 rounded shadow-inner">ห้อง: {gameState.roomId}</span>
            <span className="text-green-500">● กำลังเล่น</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">กองคลัง</span>
            <span className="font-bold text-amber-500">{gameState.deck.length * 2} เหรียญ</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">กองไพ่</span>
            <span className="font-bold text-zinc-200">{gameState.deck.length} ใบ</span>
          </div>
          <div className="h-4 w-px bg-zinc-700 hidden sm:block"></div>
          <button 
            onClick={() => setShowRules(true)}
            className="text-zinc-400 hover:text-white transition-colors p-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0"
            title="วิธีเล่น"
          >
            <BookOpen size={18} />
          </button>
          <button 
            onClick={() => socket.emit("leaveRoom")}
            className="ml-2 text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest"
          >
            ออก
          </button>
        </div>
      </header>

      {/* Main Game Layout */}
      <main className="flex-1 flex overflow-hidden flex-col md:flex-row relative">
        {/* Player Grid (Left) */}
        <section className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 content-start overflow-y-auto pb-[240px]">
          {opponents.map(p => {
            const isTurn = gameState.turnIndex === gameState.players.indexOf(p) && p.isAlive;
            const isTargeted = gameState.currentAction?.targetId === p.id;
            
            return (
              <div key={p.id} className={`bg-zinc-900/80 p-4 rounded-lg flex items-start gap-4 relative transition-all duration-300 ${isTargeted ? 'border-2 border-red-900' : isTurn ? 'border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] shadow-amber-500/20 ring-2 ring-amber-500/30' : 'border border-zinc-800'} ${!p.isAlive && 'opacity-50 grayscale'}`}>
                {isTargeted && <div className="absolute top-0 right-0 bg-red-900 text-[8px] px-2 py-0.5 uppercase tracking-tighter text-white font-bold">เป้าหมาย</div>}
                {isTurn && <div className="absolute inset-0 rounded-lg ring-2 ring-amber-500/50 animate-pulse pointer-events-none"></div>}
                
                <TurnTimer isActive={isTurn} turnIndex={gameState.turnIndex} />
                
                <div className="relative w-12 h-12 shrink-0">
                  <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-xl shadow-inner border border-zinc-700 font-bold overflow-hidden">
                    <Avatar seed={p.name} />
                  </div>
                  {emotes[p.id] && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl animate-bounce z-50 drop-shadow-xl">
                      {emotes[p.id].emoji}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-bold truncate pr-2 ${isTargeted ? 'text-red-400' : 'text-white'}`}>{p.name}</span>
                    <span className="text-amber-500 font-bold text-xs shrink-0 tracking-tighter">● {p.coins} เหรียญ</span>
                  </div>
                  <div className="flex gap-2 relative">
                    {p.influences.map((c, i) => (
                      <div key={`h_${i}`} className={`h-12 w-8 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-[10px] text-zinc-500 uppercase ${i === 0 ? 'rotate-[-4deg]' : 'rotate-[2deg]'}`}>?</div>
                    ))}
                    {p.revealedInfluences.map((c) => {
                      const roleMap: Record<string, {th: string, icon: string}> = {
                        Duke: { th: "ดยุค", icon: "💰" },
                        Assassin: { th: "สังหาร", icon: "🗡️" },
                        Captain: { th: "กัปตัน", icon: "⚓" },
                        Ambassador: { th: "ทูต", icon: "📜" },
                        Contessa: { th: "คุณหญิง", icon: "🛡️" }
                      };
                      const rd = roleMap[c.role] || { th: "?", icon: "?" };
                      return (
                      <div key={c.id} className="h-12 w-16 bg-red-950/80 border border-red-800/60 rounded flex flex-col items-center justify-center text-[9px] text-red-300 font-bold relative overflow-hidden">
                        <span className="z-10 tracking-tighter mix-blend-screen">{rd.th}</span>
                        <span className="z-10 text-[10px] opacity-70 mb-0.5">{rd.icon}</span>
                        <div className="absolute w-full h-px bg-red-600/40 rotate-[20deg]" />
                      </div>
                    )})}
                  </div>
                  {!p.isAlive && <div className="text-[10px] text-zinc-500 self-center font-bold italic uppercase tracking-widest mt-2">แพ้แล้ว</div>}
                </div>
              </div>
            );
          })}
          
          {gameState.currentAction && (
             <div className="col-span-1 md:col-span-2">
                <ActionPanel 
                  gameState={gameState} 
                  me={me}
                  onTakeAction={(action, targetId) => socket.emit("takeAction", action, targetId)}
                  onChallenge={() => socket.emit("challengeAction")}
                  onPass={() => socket.emit("passAction")}
                  onBlock={(role) => socket.emit("blockAction", role)}
                  onChallengeBlock={() => socket.emit("challengeBlock")}
                  onResolveReveal={(id) => socket.emit("resolveReveal", id)}
                  onResolveExchange={(ids) => socket.emit("resolveExchange", ids)}
                />
             </div>
          )}
        </section>

        <GameHistoryLog logs={gameState.logs} />
      </main>

      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}

      {/* Player Action Bar (Bottom) */}
      <footer className={`shrink-0 bg-zinc-900 border-t flex flex-col md:flex-row p-4 md:p-6 gap-4 md:gap-8 items-center md:items-stretch overflow-visible z-20 min-h-[160px] relative transition-all duration-300 ${gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive ? 'border-amber-500 shadow-[0_-10px_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30' : 'border-zinc-800'}`}>
        <TurnTimer 
          isActive={gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive && !gameState.currentAction} 
          turnIndex={gameState.turnIndex} 
        />
        {gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive && (
          <div className="absolute inset-x-0 top-0 h-px bg-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse"></div>
        )}
        
        <div className="flex flex-col justify-center gap-2 shrink-0">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest whitespace-nowrap font-bold">ไพ่บนมือ ({me.name})</div>
          <div className="flex gap-4">
            {me.influences.map(card => (
              <PlayingCard key={card.id} role={card.role} />
            ))}
            {me.revealedInfluences.map(card => (
              <PlayingCard key={card.id} role={card.role} revealed />
            ))}
            {me.influences.length === 0 && me.revealedInfluences.length === 0 && (
              <div className="text-zinc-600 text-sm italic py-4">ไม่มีไพ่</div>
            )}
          </div>
        </div>

        <div className="hidden md:block w-px bg-zinc-800 h-full shrink-0"></div>

        <div className="flex-1 w-full md:w-auto">
          {!gameState.currentAction && gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive ? (
             <ActionPanel 
               gameState={gameState} 
               me={me}
               onTakeAction={(action, targetId) => socket.emit("takeAction", action, targetId)}
               onChallenge={() => {}}
               onPass={() => {}}
               onBlock={() => {}}
               onChallengeBlock={() => {}}
               onResolveReveal={() => {}}
               onResolveExchange={() => {}}
             />
          ) : (
            <div className="h-full flex flex-col justify-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">สถานะ</div>
              <div className="text-sm text-zinc-400">
                {!me.isAlive ? "คุณถูกกำจัดออกจากเกมแล้ว." : 
                 gameState.turnIndex === gameState.players.indexOf(me) ? "กำลังดำเนินการ..." : 
                 `รอตาเล่นของ ${gameState.players[gameState.turnIndex]?.name}...`}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-6 py-2 min-w-[120px] shrink-0 h-full relative">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">เหรียญของคุณ</span>
          <span className="text-4xl font-black text-amber-500 mt-1">{me.coins}</span>

          {emotes[me.id] && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl animate-bounce z-50 drop-shadow-xl pointer-events-none">
              {emotes[me.id].emoji}
            </div>
          )}

          <div className="absolute top-2 right-2">
            <button onClick={() => setShowEmotePicker(true)} className="text-zinc-500 hover:text-white transition-colors p-1 bg-zinc-900 rounded-full hover:bg-zinc-800">
              <Smile size={18} />
            </button>
          </div>
        </div>
      </footer>

      {showEmotePicker && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowEmotePicker(false)}
        >
          <div 
            className="bg-zinc-800 border border-zinc-700 p-6 rounded-2xl grid grid-cols-4 gap-4 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {EMOTE_LIST.map((e) => (
              <button 
                key={e} 
                onClick={() => sendEmote(e)} 
                className="text-5xl hover:scale-110 transition-transform hover:bg-zinc-700 rounded-xl p-4 flex items-center justify-center border border-transparent hover:border-zinc-600 bg-zinc-900/50"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
