import { useState, useEffect, useRef, FormEvent } from "react";
import { ChatMessage } from "../shared/types";
import { MessageSquare, ScrollText, Send, Filter, X } from "lucide-react";

interface Props {
  logs: string[];
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (text: string) => void;
  unreadChatCount: number;
  activeTab: "logs" | "chat";
  onTabChange: (tab: "logs" | "chat") => void;
  isOpen: boolean;
  onClose: () => void;
}

type LogFilter = "all" | "attacks" | "challenges";

export default function GameSidebar({
  logs,
  messages,
  currentUserId,
  onSendMessage,
  unreadChatCount,
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [filter, setFilter] = useState<LogFilter>("all");
  const logScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (activeTab === "logs" && logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logs, activeTab, filter]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText("");
  };

  const getLogColor = (log: string, isLatest: boolean) => {
    if (
      log.includes("รัฐประหาร") ||
      log.includes("สังหาร") ||
      log.includes("ขโมย") ||
      log.includes("จับโกหก") ||
      log.includes("เสียไพ่") ||
      log.includes("ถูกกำจัด") ||
      log.includes("หน้าแตก") ||
      log.includes("โกหก") ||
      log.includes("ล้มเหลว") ||
      log.includes("ตาย")
    ) {
      return isLatest ? "text-red-400 font-bold opacity-100" : "text-red-400/80 opacity-80";
    }

    if (
      log.includes("อ้างตัวเป็น") ||
      log.includes("หงายไพ่") ||
      log.includes("ขัดขวาง") ||
      log.includes("ตัวจริง") ||
      log.includes("เปลี่ยนไพ่") ||
      log.includes("ป้องกัน")
    ) {
      return isLatest ? "text-sky-400 font-bold opacity-100" : "text-sky-400/80 opacity-80";
    }

    if (
      log.includes("ส่องไพ่") ||
      log.includes("Inquisitor") ||
      log.includes("ผู้ตรวจการ")
    ) {
      return isLatest ? "text-teal-300 font-bold opacity-100" : "text-teal-400/80 opacity-80";
    }

    if (
      log.includes("รายได้") ||
      log.includes("เงินสนับสนุน") ||
      log.includes("เก็บภาษี") ||
      log.includes("ได้รับ")
    ) {
      return isLatest ? "text-emerald-400 font-bold opacity-100" : "text-emerald-400/80 opacity-80";
    }

    return isLatest ? "text-amber-400 font-bold opacity-100" : "text-zinc-400 opacity-80";
  };

  // Filter logs based on selection
  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "attacks") {
      return (
        log.includes("รัฐประหาร") ||
        log.includes("สังหาร") ||
        log.includes("ขโมย") ||
        log.includes("กำจัด") ||
        log.includes("เสียไพ่")
      );
    }
    if (filter === "challenges") {
      return (
        log.includes("จับโกหก") ||
        log.includes("ท้าทาย") ||
        log.includes("ขัดขวาง") ||
        log.includes("อ้างตัวเป็น") ||
        log.includes("หงายไพ่") ||
        log.includes("ตัวจริง") ||
        log.includes("หน้าแตก")
      );
    }
    return true;
  });

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Backdrop overlay for drawer */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <aside 
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-96 md:w-[440px] bg-zinc-950/98 backdrop-blur-xl border-l border-zinc-800 flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* Header Tabs with Close Button */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 p-2 gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-1">
            <button
              onClick={() => onTabChange("logs")}
              className={`flex-1 py-2 px-3 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "logs"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <ScrollText size={18} className={activeTab === "logs" ? "text-amber-400" : ""} />
              <span>ประวัติเกม</span>
            </button>

            <button
              onClick={() => onTabChange("chat")}
              className={`flex-1 py-2 px-3 rounded-lg text-base font-bold flex items-center justify-center gap-2 relative transition-all ${
                activeTab === "chat"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <MessageSquare size={18} className={activeTab === "chat" ? "text-red-400" : ""} />
              <span>แชทห้อง</span>
              {unreadChatCount > 0 && (
                <span className="ml-1 bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={20} />
          </button>
        </div>

      {/* Tab 1: Game Logs */}
      {activeTab === "logs" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/60 bg-zinc-900/30 overflow-x-auto text-sm shrink-0">
            <Filter size={15} className="text-zinc-500 mr-1 shrink-0" />
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                filter === "all"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter("attacks")}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                filter === "attacks"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⚔️ โจมตี/สังหาร
            </button>
            <button
              onClick={() => setFilter("challenges")}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                filter === "challenges"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🛡️ ท้าทาย/ขัดขวาง
            </button>
          </div>

          {/* Logs List */}
          <div
            ref={logScrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-base flex flex-col gap-2 scroll-smooth"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-zinc-600 text-base italic text-center py-6">ไม่มีประวัติในหมวดนี้</div>
            ) : (
              filteredLogs.map((log, i) => (
                <div
                  key={i}
                  className={`leading-relaxed animate-in slide-in-from-left-2 duration-300 ${getLogColor(
                    log,
                    i === filteredLogs.length - 1
                  )}`}
                >
                  <span className="opacity-50 select-none mr-2">›</span>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Room Chat */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="text-zinc-600 text-base italic text-center py-8">
                ยังไม่มีข้อความ เริ่มคุยกับเพื่อนในห้องได้เลย!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUserId && msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isMe ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-sm text-zinc-500 px-1">
                      <span className={`font-semibold ${isMe ? "text-amber-400" : "text-zinc-400"}`}>
                        {isMe ? "คุณ" : msg.senderName}
                      </span>
                      <span>•</span>
                      <span>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-base break-words shadow-sm leading-relaxed ${
                        isMe
                          ? "bg-amber-600 text-white rounded-tr-none"
                          : "bg-zinc-800 text-zinc-100 border border-zinc-700/60 rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-2.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง)"
              maxLength={200}
              className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-lg px-3.5 py-2 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-lg transition-colors shrink-0"
              title="ส่งข้อความ"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </aside>
  </>
  );
}
