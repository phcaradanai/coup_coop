import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { ActionState, ActionType, ChatMessage, ClientToServerEvents, GameState, Role, ServerToClientEvents } from "../shared/types";
import { Coins, Swords, Smile, BookOpen, Flame, Zap, Bot, ChevronDown, ChevronUp, Eye, EyeOff, ScrollText, MessageSquare } from "lucide-react";
import PlayingCard from "./PlayingCard";
import ActionPanel from "./ActionPanel";
import { soundManager } from "../utils/audio";
import Avatar from "./Avatar";
import TurnTimer from "./TurnTimer";
import GameSidebar from "./GameSidebar";
import RulesOverlay from "./RulesOverlay";
import AudioControls from "./AudioControls";
import CyberFxOverlay, { CyberFxEvent } from "./CyberFxOverlay";
import GameFxLayer from "./GameFxLayer";
import { getHighFxSetting, FX_CHANGE_EVENT } from "../utils/fxSettings";
import CardFocusModal from "./CardFocusModal";

interface Props {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  gameState: GameState;
  uid?: string;
  playerName?: string;
}

const EMOTE_LIST = [
  "🤡", "💀", "😂", "🤣",
  "😭", "🥲", "😤", "🤬",
  "😱", "🫵", "🤫", "🧐",
  "🫡", "💸", "🗡️", "🥸",
  "👑", "🤯", "😎", "🤥",
];

export default function Game({ socket, gameState, uid, playerName }: Props) {
  const [emotes, setEmotes] = useState<Record<string, { emoji: string; timeoutId: any }>>({});
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const notifiedTurnRef = useRef<number>(-1);
  const logsCountRef = useRef<number>(gameState.logs?.length || 0);
  const [showRules, setShowRules] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [actionBanner, setActionBanner] = useState<{ title: string; subtitle: string; type: "coup" | "assassinate" | "challenge" } | null>(null);
  const [activeFx, setActiveFx] = useState<CyberFxEvent | null>(null);
  const [highFxEnabled, setHighFxEnabled] = useState<boolean>(true);
  const [focusedRole, setFocusedRole] = useState<Role | "Unknown" | null>(null);
  const [coinPopClass, setCoinPopClass] = useState('');
  const prevCoinsRef = useRef<number>(0);
  const prevActionRef = useRef<ActionState | null>(null);
  const actionFxLastTriggeredRef = useRef<Record<"challenge" | "coup", number>>({ challenge: 0, coup: 0 });

  // Layout states: Collapsible hand cards & Slide-over Sidebar Drawer
  const [isHandCollapsed, setIsHandCollapsed] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const isSidebarOpenRef = useRef<boolean>(false);
  isSidebarOpenRef.current = isSidebarOpen;

  // Chat & Sidebar State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"logs" | "chat">("logs");
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const activeSidebarTabRef = useRef<"logs" | "chat">("logs");
  activeSidebarTabRef.current = activeSidebarTab;

  const triggerScreenShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 600);
  };

  const triggerActionCinematic = (type: "challenge" | "coup", subtitle: string) => {
    const now = Date.now();
    if (now - actionFxLastTriggeredRef.current[type] < 2500) return;
    actionFxLastTriggeredRef.current[type] = now;

    const event: CyberFxEvent = { type, id: `${type}-${now}`, subtitle };
    setActiveFx(event);
    setTimeout(() => {
      setActiveFx((current) => current?.id === event.id ? null : current);
    }, 3800);

    if (type === "challenge") {
      soundManager.playCyberAlarm();
      setActionBanner({ title: "CHALLENGE!", subtitle, type });
    } else {
      soundManager.playChargingLaser();
      setTimeout(() => {
        soundManager.playCoupImpact();
        triggerScreenShake();
      }, 150);
      setActionBanner({ title: "COUP D'ÉTAT!", subtitle, type });
    }
    setTimeout(() => setActionBanner(null), 2500);
  };

  useEffect(() => {
    setHighFxEnabled(getHighFxSetting());
    const handleFxChange = (e: any) => {
      if (e.detail && typeof e.detail.highFx === "boolean") {
        setHighFxEnabled(e.detail.highFx);
      }
    };
    window.addEventListener(FX_CHANGE_EVENT, handleFxChange);
    return () => window.removeEventListener(FX_CHANGE_EVENT, handleFxChange);
  }, []);

  useEffect(() => {
    if (gameState.logs && gameState.logs.length > logsCountRef.current) {
      const prevCount = logsCountRef.current;
      logsCountRef.current = gameState.logs.length;
      const newLogs = gameState.logs.slice(prevCount);

      // Iterate in reverse to find the most recent actionable event from new logs
      for (let i = newLogs.length - 1; i >= 0; i--) {
        const log = newLogs[i];
        if (!log || log.includes("เข้าร่วมห้อง") || log.includes("ออกจากห้อง") || log.includes("อัปเดตการตั้งค่า")) {
          continue;
        }

        // Ignore pure next-turn logs from triggering generic sounds
        const isNextTurnLog = log.includes("ตาของ ") || log.includes("เริ่มเกม!");

        soundManager.init();

        if (log.includes("จับโกหกการเป็น") || log.includes("จับโกหกการขัดขวางของ")) {
          triggerActionCinematic("challenge", log.replace(/\[.*?\]\s*/, ""));
          break;
        } else if (log.includes("ทำรัฐประหาร")) {
          triggerActionCinematic("coup", log.replace(/\[.*?\]\s*/, ""));
          break;
        } else if (
          log.toLowerCase().includes("ขัดขวางการ assassinate") ||
          log.includes("ขัดขวางการสังหาร") ||
          (log.includes("ขัดขวาง") && log.includes("Contessa"))
        ) {
          // 6. Contessa blocks Assassination
          setActiveFx({
            type: "block_assassinate",
            id: String(Date.now()),
            title: "ROYAL AEGIS DEFENSE",
            subtitle: log.replace(/\[.*?\]\s*/, ""),
          });
          setTimeout(() => setActiveFx(null), 3800);
          break;
        } else if (log.includes("สังหาร") && !log.includes("แจ้งเพื่อ") && !log.includes("ขัดขวาง") && !log.includes("ถูกสังหาร")) {
          // 2. Assassin target execution succeeds
          soundManager.playBladeSlash();
          triggerScreenShake();
          setActiveFx({
            type: "assassinate",
            id: String(Date.now()),
            title: "TARGET EXECUTION",
            subtitle: log.replace(/\[.*?\]\s*/, ""),
          });
          setTimeout(() => setActiveFx(null), 3800);
          setActionBanner({ title: "ASSASSINATION!", subtitle: log.replace(/\[.*?\]\s*/, ""), type: "assassinate" });
          setTimeout(() => setActionBanner(null), 2500);
          break;
        } else if (log.includes("ขัดขวางการ STEAL") || log.includes("ขัดขวางการขโมย") || log.includes("ขัดขวางการ Steal")) {
          setActiveFx({ type: "steal_block", id: String(Date.now()), subtitle: log.replace(/\[.*?\]\s*/, "") });
          setTimeout(() => setActiveFx(null), 1200);
          break;
        } else if (log.includes("ขโมย") && !log.includes("แจ้งเพื่อ") && !log.includes("ขัดขวาง")) {
          // 3. Captain steal succeeds
          soundManager.playStealTransfer();
          setActiveFx({
            type: "steal",
            id: String(Date.now()),
            title: "FLEET RAID",
            subtitle: log.replace(/\[.*?\]\s*/, ""),
          });
          setTimeout(() => setActiveFx(null), 3800);
          break;
        } else if (log.includes("ขัดขวางการ FOREIGN_AID") || log.includes("ขัดขวางการขอรับเงินช่วยเหลือ") || log.includes("ขัดขวางการ ForeignAid")) {
          setActiveFx({ type: "block_foreign_aid", id: String(Date.now()), subtitle: log.replace(/\[.*?\]\s*/, "") });
          setTimeout(() => setActiveFx(null), 1100);
          break;
        } else if (log.includes("เก็บภาษีสำเร็จ") || (log.includes("เก็บภาษี") && !log.includes("แจ้งเพื่อ"))) {
          // 4. Duke tax collection succeeds
          soundManager.playCoin();
          setActiveFx({
            type: "tax",
            id: String(Date.now()),
            title: "TAX COLLECTION",
            subtitle: log.replace(/\[.*?\]\s*/, ""),
          });
          setTimeout(() => setActiveFx(null), 3800);
          break;
        } else if (log.includes("เงินสนับสนุน") || log.includes("เงินช่วยเหลือ")) {
          soundManager.playCoin();
          setActiveFx({ type: "foreign_aid", id: String(Date.now()), subtitle: log.replace(/\[.*?\]\s*/, "") });
          setTimeout(() => setActiveFx(null), 900);
          break;
        } else if (log.includes("เปลี่ยนไพ่เรียบร้อย") || log.includes("สั่งบังคับให้สับเข้ากองกลาง") || log.includes("เปลี่ยนการ์ด")) {
          // 1. Ambassador & Inquisitor exchange succeeds
          setActiveFx({
            type: "exchange",
            id: String(Date.now()),
            title: "CARAVAN EXCHANGE",
            subtitle: log.replace(/\[.*?\]\s*/, ""),
          });
          setTimeout(() => setActiveFx(null), 3800);
          break;
        } else if (log.includes("กำลังส่องไพ่") || log.includes("ส่องไพ่ของ")) {
          // 5. Inquisitor tribunal examination succeeds
          setActiveFx({
            type: "examine",
            id: String(Date.now()),
            title: "TRIBUNAL EXAMINATION",
            subtitle: log.replace(/\[.*?\]\s*/, ""),
          });
          setTimeout(() => setActiveFx(null), 3800);
          break;
        } else if (log.includes("ถูกกำจัด")) {
          soundManager.playCardShatter();
          triggerScreenShake();
          setActiveFx({ type: "player_eliminated", id: String(Date.now()), subtitle: log.replace(/\[.*?\]\s*/, "") });
          setTimeout(() => setActiveFx(null), 1300);
          break;
        } else if (log.includes("เสีย") || log.includes("สละทิ้ง")) {
          soundManager.playCardShatter();
          triggerScreenShake();
          setActiveFx({ type: "lose_card", id: String(Date.now()), subtitle: log.replace(/\[.*?\]\s*/, "") });
          setTimeout(() => setActiveFx(null), 900);
          break;
        } else if (log.includes("ชนะเกม")) {
          setActiveFx({ type: "victory", id: String(Date.now()), subtitle: log.replace(/\[.*?\]\s*/, "") });
          setTimeout(() => setActiveFx(null), 2000);
          break;
        } else if (!isNextTurnLog) {
          soundManager.playCoin();
        }
      }
    }
  }, [gameState.logs]);

  // Phase transition detector for instant action cutscene triggering
  useEffect(() => {
    const current = gameState.currentAction;
    const prev = prevActionRef.current;

    if (current && prev) {
      // 6. Contessa blocks Assassination
      if (
        current.phase === "WAITING_FOR_BLOCK_CHALLENGE" &&
        prev.phase !== "WAITING_FOR_BLOCK_CHALLENGE" &&
        current.actionType === "Assassinate" &&
        current.claimedRole === "Contessa"
      ) {
        const blocker = gameState.players.find(p => p.id === current.blockerId);
        setActiveFx({
          type: "block_assassinate",
          id: String(Date.now()),
          title: "ROYAL AEGIS DEFENSE",
          subtitle: `${blocker?.name || "Contessa"} ขอขัดขวางการ Assassinate!`,
        });
        setTimeout(() => setActiveFx(null), 3800);
      }
      // 2. Assassin target execution phase
      else if (
        current.actionType === "Assassinate" &&
        current.phase === "RESOLVING_ASSASSINATION" &&
        prev.phase !== "RESOLVING_ASSASSINATION"
      ) {
        const assassin = gameState.players.find(p => p.id === current.playerId);
        const target = gameState.players.find(p => p.id === current.targetId);
        soundManager.playBladeSlash();
        triggerScreenShake();
        setActiveFx({
          type: "assassinate",
          id: String(Date.now()),
          title: "TARGET EXECUTION",
          subtitle: `${assassin?.name || "Assassin"} สังหาร ${target?.name || "เป้าหมาย"}!`,
        });
        setTimeout(() => setActiveFx(null), 3800);
        setActionBanner({ title: "ASSASSINATION!", subtitle: `${assassin?.name || "Assassin"} สังหาร ${target?.name || "เป้าหมาย"}!`, type: "assassinate" });
        setTimeout(() => setActionBanner(null), 2500);
      }
      // 5. Inquisitor tribunal examination phase
      else if (
        current.actionType === "Examine" &&
        current.phase === "EXAMINING" &&
        prev.phase !== "EXAMINING"
      ) {
        const inquisitor = gameState.players.find(p => p.id === current.playerId);
        const target = gameState.players.find(p => p.id === current.targetId);
        setActiveFx({
          type: "examine",
          id: String(Date.now()),
          title: "TRIBUNAL EXAMINATION",
          subtitle: `${inquisitor?.name || "Inquisitor"} กำลังส่องไพ่ของ ${target?.name || "เป้าหมาย"}!`,
        });
        setTimeout(() => setActiveFx(null), 3800);
      }
    }

    prevActionRef.current = current;
  }, [gameState.currentAction, gameState.players]);

  useEffect(() => {
    const handleEmote = (playerId: string, emoji: string) => {
      soundManager.init();
      soundManager.playEmote();
      
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

  // Socket listener for room chat
  useEffect(() => {
    const handleChatHistory = (messages: ChatMessage[]) => {
      setChatMessages(messages);
    };

    const handleNewChatMessage = (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);

      // Play pleasant audio chime if incoming message is from someone else
      if (message.senderId !== uid) {
        soundManager.init();
        soundManager.playChat();
      }

      // If drawer is closed OR player is looking at logs tab, increment unread badge
      if (!isSidebarOpenRef.current || activeSidebarTabRef.current !== "chat") {
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    socket.on("chatHistory", handleChatHistory);
    socket.on("newChatMessage", handleNewChatMessage);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("newChatMessage", handleNewChatMessage);
    };
  }, [socket, uid]);

  const handleOpenSidebar = (tab: "logs" | "chat" = "logs") => {
    setActiveSidebarTab(tab);
    setIsSidebarOpen(true);
    if (tab === "chat") {
      setUnreadChatCount(0);
    }
  };

  const handleSidebarTabChange = (tab: "logs" | "chat") => {
    setActiveSidebarTab(tab);
    if (tab === "chat") {
      setUnreadChatCount(0);
    }
  };

  const handleSendChatMessage = (text: string) => {
    socket.emit("sendChatMessage", text);
  };

  useEffect(() => {
    const me = gameState.players.find(p => (uid && p.id === uid) || (playerName && p.name === playerName));
    const myIndex = me ? gameState.players.indexOf(me) : -1;
    const isMyTurnToAct = !gameState.currentAction && gameState.turnIndex === myIndex && me?.isAlive;

    if (isMyTurnToAct && notifiedTurnRef.current !== gameState.turnCounter) {
      notifiedTurnRef.current = gameState.turnCounter;
      soundManager.init();
      soundManager.playMyTurn();
    }
  }, [gameState.currentAction, gameState.turnIndex, gameState.turnCounter, gameState.players, uid, playerName]);

  useEffect(() => {
    if (gameState.status === "FINISHED") {
      soundManager.init();
      soundManager.playVictory();
    }
  }, [gameState.status]);

  // Coin change micro-animation
  useEffect(() => {
    const me = gameState.players.find(p => (uid && p.id === uid) || (playerName && p.name === playerName));
    if (!me) return;
    if (prevCoinsRef.current !== me.coins) {
      prevCoinsRef.current = me.coins;
      setCoinPopClass('animate-coin-pop');
      const t = setTimeout(() => setCoinPopClass(''), 450);
      return () => clearTimeout(t);
    }
  }, [gameState.players, uid, playerName]);

  const sendEmote = (emoji: string) => {
    socket.emit("emote", emoji);
    setShowEmotePicker(false);
  };

  const me = gameState.players.find(p => (uid && p.id === uid) || (playerName && p.name === playerName));
  if (!me) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400 font-mono text-base">
        กำลังโหลดข้อมูลเกม...
      </div>
    );
  }

  const getAlivePlayers = () => gameState.players.filter(p => p.isAlive);
  
  if (gameState.status === "FINISHED") {
    const winner = gameState.players.find(p => p.id === gameState.winnerId);
    const isMeWinner = (me && winner?.id === me.id) || (winner?.name === playerName);
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center w-full">
        <Swords size={64} className="text-amber-500 mb-6" />
        <h1 className="text-5xl font-bold mb-4">{isMeWinner ? "คุณชนะ!" : `${winner?.name || 'มีผู้เล่น'} ชนะเกมนี้!`}</h1>
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
    <div className={`flex flex-col h-full w-full overflow-hidden relative transition-transform duration-75 ${screenShake ? 'translate-x-1 -translate-y-1 rotate-[0.5deg]' : ''}`}>
      {/* Cinematic full-screen FX + single-canvas role/action FX */}
      <CyberFxOverlay activeFx={activeFx} highFxEnabled={highFxEnabled} onClose={() => setActiveFx(null)} />
      <GameFxLayer gameState={gameState} enabled={highFxEnabled} />

      {amITargeted && (
        <div className="absolute inset-0 pointer-events-none z-50 animate-pulse border-8 border-red-600/50 mix-blend-screen bg-red-900/10 shadow-[inset_0_0_100px_rgba(220,38,38,0.5)]"></div>
      )}

      {/* Floating Action Banner */}
      {actionBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in zoom-in-90 fade-in duration-200">
          <div className={`px-8 py-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md flex flex-col items-center gap-1 ${
            actionBanner.type === 'challenge' ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-950/80' :
            actionBanner.type === 'coup' ? 'bg-red-950/90 border-red-500 text-red-300 shadow-red-950/80' :
            'bg-purple-950/90 border-purple-500 text-purple-300 shadow-purple-950/80'
          }`}>
            <div className="flex items-center gap-2 text-2xl md:text-3xl font-black tracking-widest uppercase">
              {actionBanner.type === 'challenge' && <Zap className="text-amber-400 fill-amber-400 animate-bounce" size={28} />}
              {actionBanner.type === 'coup' && <Flame className="text-red-400 fill-red-400 animate-bounce" size={28} />}
              {actionBanner.type === 'assassinate' && <Swords className="text-purple-400 animate-bounce" size={28} />}
              <span>{actionBanner.title}</span>
            </div>
            <p className="text-base text-zinc-200 font-medium tracking-wide text-center max-w-md">
              {actionBanner.subtitle}
            </p>
          </div>
        </div>
      )}
      
      {/* Header Navigation */}
      <header className="z-40 flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter text-red-600">COUP <span className="text-zinc-500 font-light text-base uppercase tracking-widest ml-2 hidden sm:inline">ฉบับดิจิทัล</span></h1>
          <div className="h-4 w-px bg-zinc-700 hidden sm:block"></div>
          <div className="flex items-center gap-3 text-base font-mono text-zinc-400">
            <span className="bg-zinc-800 px-2.5 py-1 rounded shadow-inner">ห้อง: {gameState.roomId}</span>
            <span className="bg-zinc-800/80 px-2.5 py-1 rounded text-sm text-zinc-400">
              {gameState.settings?.timerEnabled ? `⏱️ ${gameState.settings?.turnDuration}s` : '⏱️ ไม่จับเวลา'}
            </span>
            <span className="text-green-500">● กำลังเล่น</span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4 text-base">
          <div className="flex flex-col items-end">
            <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">กองคลัง</span>
            <span className="font-bold text-amber-500">{gameState.deck.length * 2} เหรียญ</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm text-zinc-500 uppercase tracking-widest font-bold">กองไพ่</span>
            <span className="font-bold text-zinc-200">{gameState.deck.length} ใบ</span>
          </div>
          <div className="h-4 w-px bg-zinc-700 hidden sm:block"></div>

          {/* Drawer Trigger Button with Unread Badge */}
          <button 
            onClick={() => handleOpenSidebar("logs")}
            className="relative flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors border border-zinc-700/60 shrink-0 cursor-pointer shadow-sm"
            title="เปิดประวัติเกมและแชทห้อง"
          >
            <ScrollText size={18} className="text-amber-400" />
            <span className="text-sm font-bold hidden lg:inline">ประวัติ & แชท</span>
            {unreadChatCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-md">
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            )}
          </button>

          <AudioControls />
          <button 
            onClick={() => setShowRules(true)}
            className="text-zinc-400 hover:text-white transition-colors p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
            title="วิธีเล่น"
          >
            <BookOpen size={18} />
          </button>
          <button 
            onClick={() => socket.emit("leaveRoom")}
            className="text-base font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest cursor-pointer ml-1"
          >
            ออก
          </button>
        </div>
      </header>

      {/* Main Game Layout */}
      <main className="flex-1 flex overflow-hidden flex-col md:flex-row relative min-h-0">
        {/* Player Grid (Left) */}
        <section className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opponents.map(p => {
            const isTurn = gameState.turnIndex === gameState.players.indexOf(p) && p.isAlive;
            const isTargeted = gameState.currentAction?.targetId === p.id;
            
            return (
              <div key={p.id} className={`bg-zinc-900/80 p-4 rounded-lg flex items-start gap-4 relative transition-all duration-300 ${emotes[p.id] ? 'z-10' : ''} ${isTargeted ? 'border-2 border-red-900 animate-danger-ring' : isTurn ? 'border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/30 scale-[1.02]' : 'border border-zinc-800 hover:border-zinc-600 hover:shadow-md'} ${!p.isAlive && 'opacity-50 grayscale'}`}>
                {isTargeted && <div className="absolute top-0 right-0 bg-red-900 text-xs px-2.5 py-1 uppercase tracking-tighter text-white font-bold">เป้าหมาย</div>}
                {isTurn && <div className="absolute inset-0 rounded-lg ring-2 ring-amber-500/50 animate-pulse pointer-events-none"></div>}

                {/* Emote sticker — rendered inside card at top-center, high z-index beats sibling cards */}
                {emotes[p.id] && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-emote-pop">
                    <span className="text-5xl drop-shadow-[0_3px_14px_rgba(0,0,0,0.95)] filter">{emotes[p.id].emoji}</span>
                  </div>
                )}

                <TurnTimer 
                  isActive={isTurn} 
                  turnIndex={gameState.turnIndex}
                  duration={gameState.settings?.turnDuration}
                  enabled={gameState.settings?.timerEnabled}
                />
                
                <div className="relative w-14 h-14 shrink-0">
                  <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-2xl shadow-inner border border-zinc-700 font-bold overflow-hidden">
                    <Avatar seed={p.name} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-bold text-lg truncate ${isTargeted ? 'text-red-400' : 'text-white'}`}>{p.name}</span>
                      {p.isBot && (
                        <span className="flex items-center gap-1 text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-600/50 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                          <Bot size={12} />
                          BOT
                        </span>
                      )}
                    </div>
                    <span className="text-amber-500 font-bold text-base shrink-0 tracking-tighter ml-2">● {p.coins} เหรียญ</span>
                  </div>
                  <div className="flex gap-2 relative" data-fx-player-id={p.id}>
                    {p.influences.map((c, i) => (
                      <div key={`h_${i}`} className={`h-14 w-10 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center text-sm font-bold text-zinc-400 uppercase ${i === 0 ? 'rotate-[-4deg]' : 'rotate-[2deg]'}`}>?</div>
                    ))}
                    {p.revealedInfluences.map((c) => {
                      const roleMap: Record<string, {th: string, art: string}> = {
                        Duke: { th: "ดยุค", art: "/cards/duke.jpg" },
                        Assassin: { th: "สังหาร", art: "/cards/assassin.jpg" },
                        Captain: { th: "กัปตัน", art: "/cards/captain.jpg" },
                        Ambassador: { th: "ทูต", art: "/cards/ambassador.jpg" },
                        Contessa: { th: "คุณหญิง", art: "/cards/contessa.jpg" },
                        Inquisitor: { th: "ผู้ตรวจการ", art: "/cards/inquisitor.jpg" }
                      };
                      const rd = roleMap[c.role] || { th: "?", art: "/cards/unknown.jpg" };
                      return (
                      <div 
                        key={c.id} 
                        onClick={() => setFocusedRole(c.role as Role)}
                        title="คลิกเพื่อโฟกัสภาพ Art และดูข้อมูลเชิงลึก"
                        className="h-14 w-20 bg-zinc-950 border border-red-700/80 hover:border-cyan-400 rounded-md flex flex-col items-center justify-center text-xs text-red-200 font-bold relative overflow-hidden shadow-md cursor-pointer hover:scale-105 transition-all group"
                      >
                        <img src={rd.art} alt={c.role} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[30%] group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 bg-red-950/50" />
                        <span className="z-10 tracking-tighter mix-blend-screen text-white drop-shadow font-black">{rd.th}</span>
                        <div className="absolute w-full h-0.5 bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,1)] rotate-[20deg]" />
                        <div className="absolute w-full h-0.5 bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,1)] -rotate-[20deg]" />
                      </div>
                    )})}
                  </div>
                  {!p.isAlive && <div className="text-sm text-zinc-500 self-center font-bold italic uppercase tracking-widest mt-2">แพ้แล้ว</div>}
                </div>
              </div>
            );
          })}
          </div> {/* end grid */}
          {gameState.currentAction && (
             <div className="mt-4 animate-slide-up">
                <ActionPanel 
                  gameState={gameState} 
                  me={me}
                  onTakeAction={(action, targetId) => {
                    if (action === "Coup") triggerActionCinematic("coup", "ประกาศรัฐประหาร");
                    socket.emit("takeAction", action, targetId);
                  }}
                  onChallenge={() => {
                    triggerActionCinematic("challenge", "ประกาศจับโกหก");
                    socket.emit("challengeAction");
                  }}
                  onPass={() => socket.emit("passAction")}
                  onBlock={(role) => socket.emit("blockAction", role)}
                  onChallengeBlock={() => {
                    triggerActionCinematic("challenge", "ประกาศจับโกหกการขัดขวาง");
                    socket.emit("challengeBlock");
                  }}
                  onResolveReveal={(id) => socket.emit("resolveReveal", id)}
                  onResolveExchange={(ids) => socket.emit("resolveExchange", ids)}
                  onResolveExamine={(decision) => socket.emit("resolveExamine", decision)}
                />
             </div>
          )}
        </section>

        <GameSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          logs={gameState.logs || []}
          messages={chatMessages}
          currentUserId={uid}
          onSendMessage={handleSendChatMessage}
          unreadChatCount={unreadChatCount}
          activeTab={activeSidebarTab}
          onTabChange={handleSidebarTabChange}
        />
      </main>

      {showRules && (
        <RulesOverlay 
          onClose={() => setShowRules(false)} 
          onSelectRole={(role) => setFocusedRole(role)}
        />
      )}

      {focusedRole && (
        <CardFocusModal 
          role={focusedRole} 
          onClose={() => setFocusedRole(null)} 
        />
      )}

      {/* Player Action Bar (Bottom) */}
      <footer className={`relative z-30 shrink-0 bg-zinc-900/95 backdrop-blur-md border-t flex flex-col md:flex-row p-3 md:p-4 gap-3 md:gap-6 items-start md:items-stretch overflow-x-hidden transition-all duration-300 ${gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive ? 'border-amber-500 shadow-[0_-10px_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30 animate-turn-glow' : 'border-zinc-800'}`}>
        <TurnTimer 
          isActive={gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive && !gameState.currentAction} 
          turnIndex={gameState.turnIndex} 
          duration={gameState.settings?.turnDuration}
          enabled={gameState.settings?.timerEnabled}
        />
        {gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive && (
          <div className="absolute inset-x-0 top-0 h-px bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)] animate-sweep-line"></div>
        )}
        
        <div className="flex flex-col justify-center gap-2 shrink-0 transition-all" data-fx-player-id={me.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-400 uppercase tracking-widest whitespace-nowrap font-bold">
              ไพ่บนมือ ({me.name})
            </div>
            <button
              onClick={() => setIsHandCollapsed(prev => !prev)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md border border-zinc-700/50 transition-colors cursor-pointer"
              title={isHandCollapsed ? "เปิดดูไพ่บนมือ" : "ซ่อนไพ่เพื่อประหยัดพื้นที่"}
            >
              {isHandCollapsed ? (
                <>
                  <Eye size={14} className="text-cyan-400" />
                  <span>เปิดดูไพ่ ({me.influences.length})</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <EyeOff size={14} className="text-zinc-400" />
                  <span>ซ่อนไพ่</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          </div>

          {isHandCollapsed ? (
            <div 
              onClick={() => setIsHandCollapsed(false)}
              className="flex items-center gap-3 px-3 py-2 bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all group shadow-inner"
              title="คลิกเพื่อขยายดูไพ่บนมือ"
            >
              <div className="flex -space-x-2 overflow-hidden items-center p-0.5">
                {me.influences.map((c) => {
                  const roleMap: Record<string, { th: string, art: string }> = {
                    Duke: { th: "ดยุค", art: "/cards/duke.jpg" },
                    Assassin: { th: "สังหาร", art: "/cards/assassin.jpg" },
                    Captain: { th: "กัปตัน", art: "/cards/captain.jpg" },
                    Ambassador: { th: "ทูต", art: "/cards/ambassador.jpg" },
                    Contessa: { th: "คุณหญิง", art: "/cards/contessa.jpg" },
                    Inquisitor: { th: "ผู้ตรวจการ", art: "/cards/inquisitor.jpg" }
                  };
                  const rd = roleMap[c.role] || { th: "?", art: "/cards/unknown.jpg" };
                  return (
                    <div key={c.id} className="relative w-9 h-12 rounded border border-zinc-700 overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-zinc-900">
                      <img src={rd.art} alt={c.role} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-0.5">
                        <span className="text-[9px] font-bold text-zinc-100">{rd.th}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-sm font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors">
                  ไพ่ในมือ: {me.influences.length} ใบ
                </span>
                <span className="text-xs text-zinc-500">คลิกเพื่อเปิดดูรายละเอียด</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap animate-in fade-in zoom-in-95 duration-200">
              {me.influences.map(card => (
                <PlayingCard 
                  key={card.id} 
                  role={card.role} 
                  onFocus={() => setFocusedRole(card.role)} 
                />
              ))}
              {me.revealedInfluences.map(card => (
                <PlayingCard 
                  key={card.id} 
                  role={card.role} 
                  revealed 
                  onFocus={() => setFocusedRole(card.role)} 
                />
              ))}
              {me.influences.length === 0 && me.revealedInfluences.length === 0 && (
                <div className="text-zinc-500 text-base italic py-4">ไม่มีไพ่</div>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:block w-px bg-zinc-800 h-full shrink-0"></div>

        <div className="flex-1 min-w-0 w-full md:w-auto">
          {!gameState.currentAction && gameState.turnIndex === gameState.players.indexOf(me) && me.isAlive ? (
             <ActionPanel 
               gameState={gameState} 
               me={me}
               onTakeAction={(action, targetId) => {
                 if (action === "Coup") triggerActionCinematic("coup", "ประกาศรัฐประหาร");
                 socket.emit("takeAction", action, targetId);
               }}
               onChallenge={() => {}}
               onPass={() => {}}
               onBlock={() => {}}
               onChallengeBlock={() => {}}
               onResolveReveal={() => {}}
               onResolveExchange={() => {}}
             />
          ) : (
            <div className="h-full flex flex-col justify-center">
              <div className="text-sm text-zinc-500 uppercase tracking-widest mb-2 font-bold">สถานะ</div>
              <div className="text-base text-zinc-300">
                {!me.isAlive ? "คุณถูกกำจัดออกจากเกมแล้ว." : 
                 gameState.turnIndex === gameState.players.indexOf(me) ? "กำลังดำเนินการ..." : 
                 `รอตาเล่นของ ${gameState.players[gameState.turnIndex]?.name}...`}
              </div>
            </div>
          )}
        </div>

        <div className={`flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 rounded-lg px-6 py-2 min-w-[130px] shrink-0 h-full relative overflow-visible ${emotes[me.id] ? 'z-10' : ''}`}>
          <span className={`text-sm text-zinc-400 uppercase font-bold tracking-widest transition-opacity ${emotes[me.id] ? 'opacity-20' : ''}`}>เหรียญของคุณ</span>
          <span className={`text-4xl font-black text-amber-500 mt-1 transition-opacity inline-block ${emotes[me.id] ? 'opacity-20' : ''} ${coinPopClass}`}>{me.coins}</span>

          {/* My emote — absolute center with backdrop, stays inside box bounds */}
          {emotes[me.id] && (
            <div className="absolute inset-0 flex items-center justify-center z-[9999] pointer-events-none animate-emote-pop rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm rounded-lg" />
              <span className="relative text-6xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] filter">{emotes[me.id].emoji}</span>
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
            className="bg-zinc-900 border border-zinc-700 p-5 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center">เลือก Emote</p>
            <div className="grid grid-cols-5 gap-2">
              {EMOTE_LIST.map((e) => (
                <button
                  key={e}
                  onClick={() => sendEmote(e)}
                  className="text-4xl hover:scale-125 active:scale-95 transition-transform hover:bg-zinc-700 rounded-xl p-2 flex items-center justify-center border border-transparent hover:border-zinc-600 bg-zinc-800/60 cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
