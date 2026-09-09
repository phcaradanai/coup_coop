import { ActionType, GameState, Player, Role } from "../shared/types";
import { Coins, Hand, Swords, Skull, RefreshCw, Shield, UserX, XCircle, Search } from "lucide-react";
import { useState } from "react";
import PlayingCard from "./PlayingCard";

const roleArtMap: Record<string, string> = {
  Duke: "/cards/duke.jpg",
  Assassin: "/cards/assassin.jpg",
  Captain: "/cards/captain.jpg",
  Ambassador: "/cards/ambassador.jpg",
  Contessa: "/cards/contessa.jpg",
  Inquisitor: "/cards/inquisitor.jpg",
  Unknown: "/cards/unknown.jpg"
};

const roleNames: Record<string, string> = {
  Duke: "ดยุค (Duke)",
  Assassin: "มือสังหาร (Assassin)",
  Captain: "กัปตัน (Captain)",
  Ambassador: "ทูต (Ambassador)",
  Contessa: "เคาน์เตส (Contessa)",
  Inquisitor: "ผู้ตรวจการ (Inquisitor)"
};

interface Props {
  gameState: GameState;
  me: Player;
  onTakeAction: (action: ActionType, targetId?: string) => void;
  onChallenge: () => void;
  onPass: () => void;
  onBlock: (claimRole: Role) => void;
  onChallengeBlock: () => void;
  onResolveReveal: (cardId: string) => void;
  onResolveExchange: (cardIds: string[]) => void;
  onResolveExamine?: (decision: "keep" | "exchange") => void;
}

export default function ActionPanel({
  gameState, me, onTakeAction, onChallenge, onPass, onBlock, onChallengeBlock, onResolveReveal, onResolveExchange, onResolveExamine
}: Props) {
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [exchangeSelection, setExchangeSelection] = useState<string[]>([]);
  
  const act = gameState.currentAction;
  const isMyTurn = gameState.players[gameState.turnIndex]?.id === me.id;
  const turnPlayer = gameState.players[gameState.turnIndex];
  const targetPlayer = act?.targetId ? gameState.players.find(p => p.id === act.targetId) : null;
  const actorPlayer = act ? gameState.players.find(p => p.id === act.playerId) : null;

  const getAliveOthers = () => gameState.players.filter(p => p.isAlive && p.id !== me.id);

  if (!me.isAlive) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-2xl text-center">
        <Skull size={48} className="mx-auto text-red-500/50 mb-4" />
        <h3 className="text-xl font-bold text-red-400">คุณถูกกำจัดออกจากเกม</h3>
        <p className="text-zinc-500 mt-2">โปรดรอชมการเล่นของผู้เล่นที่เหลือ</p>
      </div>
    );
  }

  // Active turn (picking action)
  if (!act && isMyTurn) {
    return (
      <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl space-y-6">
        <h3 className="text-xl font-bold text-amber-400">ตาของคุณ</h3>
        
        {me.coins >= 10 ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-bold mb-4">คุณมี 10 เหรียญขึ้นไป กรุณาทำรัฐประหาร!</p>
            <div className="flex gap-2">
              <select 
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 flex-1 outline-none text-zinc-100"
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
              >
                <option value="">- เลือกเป้าหมาย -</option>
                {getAliveOthers().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button 
                disabled={!selectedTarget}
                onClick={() => onTakeAction("Coup", selectedTarget)}
                className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 px-6 py-2 rounded-lg font-bold transition-colors"
              >
                รัฐประหาร (7C)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2 flex items-center gap-1.5">
                <span>⚡ แอ็กชันพื้นฐาน (ไม่ต้องอ้างบทบาท)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <ActionButton 
                  title="รับรายได้" desc="1C (ไม่มีใครขัดได้)" icon={<Coins size={16} />}
                  onClick={() => onTakeAction("Income")}
                />
                <ActionButton 
                  title="ขอเงินสนับสนุน" desc="2C (ดยุคขัดได้)" roleArt="/cards/duke.jpg"
                  onClick={() => onTakeAction("ForeignAid")}
                />
                <TargetedAction 
                  targets={getAliveOthers()} selected={selectedTarget} onSelect={setSelectedTarget}
                  title="รัฐประหาร" cost={7} icon={<Swords className="text-amber-500" size={16} />}
                  disabled={me.coins < 7}
                  onClick={() => onTakeAction("Coup", selectedTarget)}
                />
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                <span>🎭 แอ็กชันตามบทบาท (สามารถถูกจับโกหกได้)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ActionButton 
                  title="เก็บภาษี" desc="3C (อ้างตนเป็นดยุค)" roleArt="/cards/duke.jpg"
                  onClick={() => onTakeAction("Tax")}
                />
                {gameState.settings?.roleSet === "inquisitor" ? (
                  <ActionButton 
                    title="แลกไพ่ 1 ใบ" desc="จั่ว 1/คืน 1 (ผู้ตรวจการ)" roleArt="/cards/inquisitor.jpg"
                    onClick={() => onTakeAction("Exchange")}
                  />
                ) : (
                  <ActionButton 
                    title="เปลี่ยนไพ่" desc="จั่ว 2/คืน 2 (ทูต)" roleArt="/cards/ambassador.jpg"
                    onClick={() => onTakeAction("Exchange")}
                  />
                )}
                
                <TargetedAction 
                  targets={getAliveOthers()} selected={selectedTarget} onSelect={setSelectedTarget}
                  title="สังหาร" cost={3} claim="มือสังหาร" roleArt="/cards/assassin.jpg"
                  disabled={me.coins < 3}
                  onClick={() => onTakeAction("Assassinate", selectedTarget)}
                />
                
                <TargetedAction 
                  targets={getAliveOthers().filter(p => p.coins > 0)} selected={selectedTarget} onSelect={setSelectedTarget}
                  title="ขโมย" claim="กัปตัน" roleArt="/cards/captain.jpg"
                  onClick={() => onTakeAction("Steal", selectedTarget)}
                  disabled={getAliveOthers().filter(p => p.coins > 0).length === 0}
                />

                {gameState.settings?.roleSet === "inquisitor" && (
                  <TargetedAction 
                    targets={getAliveOthers()} selected={selectedTarget} onSelect={setSelectedTarget}
                    title="ส่องไพ่" claim="ผู้ตรวจการ" roleArt="/cards/inquisitor.jpg"
                    onClick={() => onTakeAction("Examine", selectedTarget)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Resolving generic Wait phases
  if (act) {
    if (act.phase === "RESOLVING_CHALLENGE_LOSS") {
      if (act.losingPlayerId === me.id) {
        if (me.influences.length === 0) return null;
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border-2 border-red-500/80 p-6 md:p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-bold text-red-500">คุณแพ้การท้าทาย (Challenge)!</h3>
              <p className="text-zinc-300 text-base">เลือกไพ่บนมือ 1 ใบที่คุณต้องการเปิดเผยเพื่อสละทิ้ง:</p>
              <div className="flex justify-center gap-4 flex-wrap pt-2">
                {me.influences.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => onResolveReveal(c.id)}
                    className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-red-500/50 hover:border-red-500 rounded-xl font-bold transition-all text-red-300 hover:text-white flex items-center gap-2.5 shadow-lg group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full border border-red-400/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                      <img src={roleArtMap[c.role] || "/cards/unknown.jpg"} alt={c.role} className="w-full h-full object-cover" />
                    </div>
                    <span>สละ {roleNames[c.role] || c.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      } else {
        const loser = gameState.players.find(p => p.id === act.losingPlayerId);
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
            <h3 className="text-xl font-bold text-amber-400 mb-2">
              {loser?.name} แพ้การท้าทาย!
            </h3>
            <p className="text-zinc-400 text-sm">
              กำลังรอให้ {loser?.name} ตัดสินใจเลือกไพ่ที่จะเปิดเผยทิ้ง...
            </p>
          </div>
        );
      }
    }

    if (act.phase === "RESOLVING_COUP" && act.targetId === me.id) {
       if (me.influences.length === 0) return null;
       return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border-2 border-red-500/80 p-6 md:p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
             <h3 className="text-2xl font-bold text-red-500">คุณถูกรัฐประหาร!</h3>
             <p className="text-zinc-300 text-base">เลือกไพ่ที่ต้องการหงายทิ้ง (สูญเสีย):</p>
             <div className="flex justify-center gap-4 flex-wrap pt-2">
               {me.influences.map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => onResolveReveal(c.id)}
                   className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-red-500/50 hover:border-red-500 rounded-xl font-bold transition-all text-red-300 hover:text-white flex items-center gap-2.5 shadow-lg group cursor-pointer"
                 >
                   <div className="w-8 h-8 rounded-full border border-red-400/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                     <img src={roleArtMap[c.role] || "/cards/unknown.jpg"} alt={c.role} className="w-full h-full object-cover" />
                   </div>
                   <span>หงาย {roleNames[c.role] || c.role}</span>
                 </button>
               ))}
             </div>
           </div>
         </div>
       );
    }

    if (act.phase === "RESOLVING_ASSASSINATION" && act.targetId === me.id) {
       if (me.influences.length === 0) return null;
       return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border-2 border-red-500/80 p-6 md:p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
             <h3 className="text-2xl font-bold text-red-500">คุณถูกสังหาร!</h3>
             <p className="text-zinc-300 text-base">เลือกไพ่ที่ต้องการหงายทิ้ง (สูญเสีย):</p>
             <div className="flex justify-center gap-4 flex-wrap pt-2">
               {me.influences.map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => onResolveReveal(c.id)}
                   className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-red-500/50 hover:border-red-500 rounded-xl font-bold transition-all text-red-300 hover:text-white flex items-center gap-2.5 shadow-lg group cursor-pointer"
                 >
                   <div className="w-8 h-8 rounded-full border border-red-400/60 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
                     <img src={roleArtMap[c.role] || "/cards/unknown.jpg"} alt={c.role} className="w-full h-full object-cover" />
                   </div>
                   <span>หงาย {roleNames[c.role] || c.role}</span>
                 </button>
               ))}
             </div>
           </div>
         </div>
       );
    }

    if (act.phase === "EXCHANGING" && act.playerId === me.id && act.exchangeCards) {
      const isInquisitor = gameState.settings?.roleSet === "inquisitor";
      const totalRequired = me.influences.length;
      return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className={`border-2 p-6 md:p-8 rounded-2xl shadow-2xl max-w-2xl w-full text-center space-y-4 animate-in zoom-in-95 duration-200 ${isInquisitor ? 'bg-zinc-900 border-teal-500/80' : 'bg-zinc-900 border-green-500/80'}`}>
             <h3 className={`text-2xl font-bold ${isInquisitor ? 'text-teal-400' : 'text-green-400'}`}>
               {isInquisitor ? "ผู้ตรวจการแลกไพ่ (Inquisitor Exchange)" : "เข้าพบทูต (Ambassador Exchange)"}
             </h3>
             <p className="text-zinc-300 text-base">โปรดเลือกไพ่ที่ต้องการเก็บไว้จำนวน {totalRequired} ใบ:</p>
             <div className="flex flex-wrap justify-center gap-4 py-2">
               {[...me.influences, ...act.exchangeCards].map(c => {
                 const isSelected = exchangeSelection.includes(c.id);
                 return (
                   <button 
                     key={c.id} 
                     onClick={() => {
                       setExchangeSelection(prev => 
                         prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                       )
                     }}
                     className={`px-5 py-3 border-2 rounded-xl font-bold transition-all flex items-center gap-2.5 cursor-pointer ${isSelected ? (isInquisitor ? 'bg-teal-600/30 border-teal-500 text-white shadow-teal-500/30' : 'bg-green-600/30 border-green-500 text-white shadow-green-500/30') : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}
                   >
                     <div className="w-8 h-8 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                       <img src={roleArtMap[c.role] || "/cards/unknown.jpg"} alt={c.role} className="w-full h-full object-cover" />
                     </div>
                     <span>{roleNames[c.role] || c.role}</span>
                   </button>
                 )
               })}
             </div>
             <button
               disabled={exchangeSelection.length !== totalRequired}
               onClick={() => onResolveExchange(exchangeSelection)}
               className={`${isInquisitor ? 'bg-teal-600 hover:bg-teal-500' : 'bg-green-600 hover:bg-green-500'} disabled:bg-zinc-700 px-8 py-3 rounded-xl font-bold transition-colors text-base`}
             >
               ยืนยันไพ่บนมือ ({exchangeSelection.length}/{totalRequired})
             </button>
           </div>
         </div>
      );
    }

    // Inquisitor EXAMINING phase
    if (act.phase === "EXAMINING") {
      const isActor = act.playerId === me.id;
      const target = act.targetId ? gameState.players.find(p => p.id === act.targetId) : null;

      if (isActor && act.examinedCard) {
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border-2 border-teal-500/80 p-6 md:p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-bold text-teal-400 flex items-center justify-center gap-2">
                <Search size={24} /> ผลการส่องไพ่ของ {target?.name}
              </h3>
              <p className="text-sm text-zinc-400">
                คุณได้สุ่มดูไพ่ 1 ใบของ {target?.name} (เฉพาะคุณเท่านั้นที่มองเห็นไพ่นี้)
              </p>

              <div className="flex flex-col items-center justify-center py-2">
                <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2">ไพ่ของ {target?.name}</div>
                <PlayingCard role={act.examinedCard.role} />
              </div>

              <div className="flex gap-4 justify-center pt-2">
                <button
                  onClick={() => onResolveExamine && onResolveExamine("keep")}
                  className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-bold text-white transition-colors text-base"
                >
                  คืนไพ่ใบเดิม (ไม่เปลี่ยน)
                </button>
                <button
                  onClick={() => onResolveExamine && onResolveExamine("exchange")}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold text-white shadow-lg transition-colors text-base"
                >
                  บังคับให้สับเข้ากองกลางแล้วจั่วใหม่
                </button>
              </div>
            </div>
          </div>
        );
      } else {
        const actor = gameState.players.find(p => p.id === act.playerId);
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
            <h3 className="text-lg font-bold text-teal-400 mb-2">
              {actor?.name} กำลังส่องดูไพ่ 1 ใบของ {target?.name}...
            </h3>
            <p className="text-zinc-400 text-sm">
              กำลังรอให้ {actor?.name} ตัดสินใจว่าจะอนุญาตให้เก็บไพ่ใบเดิมไว้ หรือบังคับให้เปลี่ยนไพ่ใหม่
            </p>
          </div>
        );
      }
    }

    // Interactive Reaction Phases (Challenge, Block)
    const isActor = act.playerId === me.id;
    const isTarget = act.targetId === me.id;
    const hasIPassed = act.passedPlayerIds?.includes(me.id);
    const aliveOthersExceptActor = gameState.players.filter(p => p.isAlive && p.id !== act.playerId);
    const passCount = act.passedPlayerIds?.length || 0;

    // Phase 1: WAITING_FOR_CHALLENGE (Tax, Exchange, Steal, Assassinate)
    if (act.phase === "WAITING_FOR_CHALLENGE") {
      if (isActor) {
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
            <h3 className="text-xl font-bold text-amber-400 mb-2">
              คุณกำลังเล่น {act.actionType} {act.targetId ? `ใส่ ${targetPlayer?.name}` : ''} (อ้างตัวเป็น {act.claimedRole})
            </h3>
            <p className="text-zinc-400 text-sm">
              กำลังรอผู้เล่นคนอื่นตัดสินใจว่าจะจับโกหกหรือไม่... ({passCount}/{aliveOthersExceptActor.length} คนเลือกปล่อยผ่าน)
            </p>
          </div>
        );
      }

      if (hasIPassed) {
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
            <h3 className="text-lg font-bold text-zinc-300 mb-2">
              {actorPlayer?.name} เล่น {act.actionType} โดยอ้างตนเป็น {act.claimedRole} {act.targetId ? `ใส่ ${targetPlayer?.name}` : ''}
            </h3>
            <p className="text-emerald-400 font-bold">✓ คุณเลือกปล่อยผ่านแล้ว (ไม่จับโกหก)</p>
            <p className="text-xs text-zinc-500 mt-2">
              กำลังรอผู้เล่นคนอื่น... ({passCount}/{aliveOthersExceptActor.length} คนเลือกปล่อยผ่าน)
            </p>
          </div>
        );
      }

      return (
        <ReactionPanel 
          title={`${actorPlayer?.name} เล่น ${act.actionType} โดยอ้างตนเป็น ${act.claimedRole} ${act.targetId ? `ใส่ ${targetPlayer?.name}` : ''}`}
          subtitle={`ผ่านแล้ว: ${passCount}/${aliveOthersExceptActor.length} คน`}
          onPass={onPass}
          passLabel="ปล่อยให้เล่น (ไม่จับโกหก)"
          primaryAction={onChallenge}
          primaryLabel={`จับโกหก ${act.claimedRole}`}
          primaryIcon={
            act.claimedRole && roleArtMap[act.claimedRole] ? (
              <div className="w-5 h-5 rounded-full border border-white/60 overflow-hidden shadow bg-black/60 shrink-0">
                <img src={roleArtMap[act.claimedRole]} alt={act.claimedRole} className="w-full h-full object-cover" />
              </div>
            ) : (
              <XCircle size={18} />
            )
          }
          primaryColor="red"
        />
      );
    }

    // Phase 2: WAITING_FOR_BLOCK
    if (act.phase === "WAITING_FOR_BLOCK") {
      // Targeted actions: Assassinate and Steal -> ONLY target can block or pass!
      if (act.actionType === "Assassinate" || act.actionType === "Steal") {
        if (isTarget) {
          if (act.actionType === "Assassinate") {
            return (
              <div className="bg-zinc-800/80 p-6 rounded-2xl border border-red-500/60 shadow-xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-xl font-bold text-red-400">{actorPlayer?.name} กำลังสั่งสังหารคุณ!</h3>
                <p className="text-sm text-zinc-400">คุณสามารถใช้บทบาทเคาน์เตส (Contessa) เพื่อขัดขวางการสังหารได้</p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button onClick={() => onBlock("Contessa")} className="px-6 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-colors shadow-lg text-white">
                    <div className="w-6 h-6 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                      <img src="/cards/contessa.jpg" alt="Contessa" className="w-full h-full object-cover" />
                    </div>
                    <span>ขัดขวาง (อ้างตัวเป็นเคาน์เตส)</span>
                  </button>
                  <button onClick={onPass} className="px-6 py-3 bg-red-900/60 hover:bg-red-800 rounded-xl font-medium transition-colors text-white">
                    ยอมรับการสังหาร (ไม่ขัดขวาง)
                  </button>
                </div>
              </div>
            );
          }

          if (act.actionType === "Steal") {
            const isInquisitor = gameState.settings?.roleSet === "inquisitor";
            return (
              <div className="bg-zinc-800/80 p-6 rounded-2xl border border-amber-500/60 shadow-xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-xl font-bold text-amber-400">{actorPlayer?.name} กำลังจะขโมย 2 เหรียญจากคุณ!</h3>
                <p className="text-sm text-zinc-400">
                  คุณสามารถใช้บทบาทกัปตัน (Captain) หรือ{isInquisitor ? "ผู้ตรวจการ (Inquisitor)" : "ทูต (Ambassador)"} เพื่อขัดขวางได้
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => onBlock("Captain")} className="px-5 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-white text-xs">
                    <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                      <img src="/cards/captain.jpg" alt="Captain" className="w-full h-full object-cover" />
                    </div>
                    <span>ขัดด้วยกัปตัน</span>
                  </button>
                  {isInquisitor ? (
                    <button onClick={() => onBlock("Inquisitor")} className="px-5 py-3 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-white text-xs">
                      <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                        <img src="/cards/inquisitor.jpg" alt="Inquisitor" className="w-full h-full object-cover" />
                      </div>
                      <span>ขัดด้วยผู้ตรวจการ</span>
                    </button>
                  ) : (
                    <button onClick={() => onBlock("Ambassador")} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-white text-xs">
                      <div className="w-5 h-5 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                        <img src="/cards/ambassador.jpg" alt="Ambassador" className="w-full h-full object-cover" />
                      </div>
                      <span>ขัดด้วยทูต</span>
                    </button>
                  )}
                  <button onClick={onPass} className="px-5 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-medium transition-colors text-white text-xs">
                    ยอมให้ขโมย (ไม่ขัดขวาง)
                  </button>
                </div>
              </div>
            );
          }
        }

        if (isActor) {
          return (
            <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
              <h3 className="text-xl font-bold text-zinc-300 mb-2">
                คุณกำลัง{act.actionType === "Assassinate" ? "สั่งสังหาร" : "ขโมยเหรียญจาก"} {targetPlayer?.name}
              </h3>
              <p className="text-zinc-400 text-sm">กำลังรอให้ {targetPlayer?.name} ตัดสินใจว่าจะขัดขวางหรือไม่...</p>
            </div>
          );
        }

        // Third-party players: cannot block targeted actions
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
            <h3 className="text-lg font-bold text-zinc-300 mb-2">
              {actorPlayer?.name} กำลัง{act.actionType === "Assassinate" ? "สั่งสังหาร" : "ขโมยเหรียญจาก"} {targetPlayer?.name}
            </h3>
            <p className="text-zinc-400 text-sm">กำลังรอให้ {targetPlayer?.name} ตัดสินใจว่าจะขัดขวางหรือไม่...</p>
          </div>
        );
      }

      // Untargeted action: Foreign Aid -> Anyone except actor can block with Duke
      if (act.actionType === "ForeignAid") {
        if (isActor) {
          return (
            <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
              <h3 className="text-xl font-bold text-amber-400 mb-2">คุณกำลังขอเงินสนับสนุน (Foreign Aid 2 เหรียญ)</h3>
              <p className="text-zinc-400 text-sm">
                กำลังรอผู้เล่นคนอื่นตัดสินใจว่าจะขัดขวาง (ดยุค) หรือไม่... ({passCount}/{aliveOthersExceptActor.length} คนเลือกปล่อยผ่าน)
              </p>
            </div>
          );
        }

        if (hasIPassed) {
          return (
            <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
              <h3 className="text-lg font-bold text-zinc-300 mb-2">{actorPlayer?.name} ขอเงินสนับสนุน (Foreign Aid)</h3>
              <p className="text-emerald-400 font-bold">✓ คุณเลือกปล่อยผ่านแล้ว (ไม่ขัดขวาง)</p>
              <p className="text-xs text-zinc-500 mt-2">
                กำลังรอผู้เล่นคนอื่น... ({passCount}/{aliveOthersExceptActor.length} คนเลือกปล่อยผ่าน)
              </p>
            </div>
          );
        }

        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold">{actorPlayer?.name} ขอเงินสนับสนุน (Foreign Aid)!</h3>
            <p className="text-xs text-zinc-400">ผ่านแล้ว {passCount}/{aliveOthersExceptActor.length} คน</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button onClick={() => onBlock("Duke")} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-colors shadow-lg text-white">
                <div className="w-6 h-6 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
                  <img src="/cards/duke.jpg" alt="Duke" className="w-full h-full object-cover" />
                </div>
                <span>ขัดขวาง (อ้างตัวเป็นดยุค)</span>
              </button>
              <button onClick={onPass} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-medium transition-colors text-white">
                ปล่อยให้เล่น (ไม่ขัดขวาง)
              </button>
            </div>
          </div>
        );
      }
    }

    // Phase 3: WAITING_FOR_BLOCK_CHALLENGE
    if (act.phase === "WAITING_FOR_BLOCK_CHALLENGE") {
      const blockerPlayer = gameState.players.find(p => p.id === act.blockerId);
      const eligibleChallengers = gameState.players.filter(p => p.isAlive && p.id !== act.blockerId);

      if (act.blockerId === me.id) {
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-blue-500/50 shadow-xl text-center">
            <h3 className="text-xl font-bold text-blue-400 mb-2">คุณขัดขวางโดยอ้างตัวเป็น {act.claimedRole}</h3>
            <p className="text-zinc-400 text-sm">
              กำลังรอผู้เล่นคนอื่นตัดสินใจว่าจะจับโกหกการขัดขวางหรือไม่... ({passCount}/{eligibleChallengers.length} คนเลือกปล่อยผ่าน)
            </p>
          </div>
        );
      }

      if (hasIPassed) {
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl text-center">
            <h3 className="text-lg font-bold text-zinc-300 mb-2">
              {blockerPlayer?.name} อ้างตัวเป็น {act.claimedRole} เพื่อขัดขวาง!
            </h3>
            <p className="text-emerald-400 font-bold">✓ คุณเลือกปล่อยผ่านแล้ว (ไม่จับโกหกการขัดขวาง)</p>
            <p className="text-xs text-zinc-500 mt-2">
              กำลังรอผู้เล่นคนอื่น... ({passCount}/{eligibleChallengers.length} คนเลือกปล่อยผ่าน)
            </p>
          </div>
        );
      }

      return (
        <ReactionPanel 
          title={`${blockerPlayer?.name} อ้างตัวเป็น ${act.claimedRole} เพื่อขัดขวาง!`}
          subtitle={`ผ่านแล้ว: ${passCount}/${eligibleChallengers.length} คน`}
          onPass={onPass}
          passLabel="ปล่อยให้ขัดขวาง (ไม่จับโกหก)"
          primaryAction={onChallengeBlock}
          primaryLabel={`จับโกหก ${act.claimedRole}`}
          primaryIcon={
            act.claimedRole && roleArtMap[act.claimedRole] ? (
              <div className="w-5 h-5 rounded-full border border-white/60 overflow-hidden shadow bg-black/60 shrink-0">
                <img src={roleArtMap[act.claimedRole]} alt={act.claimedRole} className="w-full h-full object-cover" />
              </div>
            ) : (
              <XCircle size={18} />
            )
          }
          primaryColor="red"
        />
      );
    }
    
    // Fallback: waiting for others
    return (
      <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 text-center animate-pulse">
        <p className="text-zinc-400">กำลังรอผู้เล่นคนอื่นตอบสนอง...</p>
      </div>
    );
  }

  // Not my turn
  return (
    <div className="bg-zinc-800/30 p-6 rounded-2xl border border-zinc-800 text-center">
      <h3 className="text-lg font-medium text-zinc-400">กำลังให้ {turnPlayer?.name} ทำการเล่นในตานี้...</h3>
    </div>
  );
}

function ActionButton({ title, desc, roleArt, icon, onClick, disabled }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className="relative min-h-[4rem] bg-zinc-900 border border-zinc-700 hover:border-zinc-400 rounded-xl hover:bg-zinc-800/90 disabled:bg-zinc-950 disabled:opacity-50 p-2.5 flex items-center gap-2.5 pointer-events-auto group cursor-pointer text-left shadow-md btn-micro shimmer-on-hover"
    >
      {roleArt ? (
        <div className="w-9 h-9 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0 group-hover:scale-105 transition-transform">
          <img src={roleArt} alt="Role" className="w-full h-full object-cover" />
        </div>
      ) : icon ? (
        <div className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold uppercase tracking-wider text-zinc-200 truncate">{title}</div>
        <div className="text-sm text-zinc-400 truncate">{desc}</div>
      </div>
    </button>
  );
}

function TargetedAction({ title, desc, cost, claim, roleArt, icon, onClick, targets, selected, onSelect, disabled }: any) {
  return (
    <div className={`min-h-[4rem] bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col justify-between p-2 ${disabled ? 'opacity-50 pointer-events-none' : 'hover:border-zinc-500'} shadow-md`}>
      <div className="flex justify-between items-center w-full gap-1.5 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {roleArt ? (
            <div className="w-6 h-6 rounded-full border border-white/40 overflow-hidden shadow bg-black/60 shrink-0">
              <img src={roleArt} alt={claim} className="w-full h-full object-cover" />
            </div>
          ) : icon ? (
            <div className="shrink-0">{icon}</div>
          ) : null}
          <span className="text-base font-bold uppercase tracking-wider text-zinc-200 truncate">
            {title} {cost && <span className="text-amber-500 font-mono font-black">{cost}C</span>}
          </span>
        </div>
        <div className="text-sm text-zinc-400 uppercase font-mono shrink-0">{claim ? claim : ''}</div>
      </div>
      <div className="flex gap-1.5 w-full shrink-0">
        <select 
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 flex-1 text-sm appearance-none outline-none text-zinc-300"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">- เลือกเป้าหมาย -</option>
          {targets.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button 
          onClick={onClick}
          disabled={disabled || !selected}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-bold px-3 py-1 rounded-lg transition-colors text-sm uppercase tracking-wider cursor-pointer"
        >
          ทำ
        </button>
      </div>
    </div>
  );
}

function ReactionPanel({ title, subtitle, onPass, passLabel, primaryAction, primaryLabel, primaryIcon, primaryColor }: any) {
  const colorMap: any = {
    red: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20",
    blue: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
  };

  return (
    <div className="col-span-2 mt-4 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center p-5 animate-slide-up">
      <div className="text-lg font-bold text-zinc-200 mb-1 text-center">{title}</div>
      {subtitle && <div className="text-sm text-zinc-400 mb-3 text-center">{subtitle}</div>}
      <div className="flex gap-3">
        <button onClick={primaryAction} className={`relative px-5 py-2 rounded-xl font-bold uppercase text-sm tracking-wider flex items-center gap-2 cursor-pointer btn-micro shimmer-on-hover ${colorMap[primaryColor]}`}>
          {primaryIcon} {primaryLabel}
        </button>
        <button onClick={onPass} className="relative px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-bold uppercase text-sm tracking-wider shadow-lg cursor-pointer btn-micro shimmer-on-hover">
          {passLabel}
        </button>
      </div>
    </div>
  );
}
