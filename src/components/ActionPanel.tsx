import { ActionType, GameState, Player, Role } from "../shared/types";
import { Coins, Hand, Swords, Skull, RefreshCw, Shield, UserX, XCircle } from "lucide-react";
import { useState } from "react";

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
}

export default function ActionPanel({
  gameState, me, onTakeAction, onChallenge, onPass, onBlock, onChallengeBlock, onResolveReveal, onResolveExchange
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <ActionButton 
              title="รับรายได้" desc="1C" icon={<Coins size={16} />}
              onClick={() => onTakeAction("Income")}
            />
            <ActionButton 
              title="ขอเงินสนับสนุน" desc="2C (ดยุคขัดได้)" icon={<Coins className="text-amber-300" size={16} />}
              onClick={() => onTakeAction("ForeignAid")}
            />
            <ActionButton 
              title="เก็บภาษี" desc="3C (อ้างดยุค)" icon={<Coins className="text-purple-400" size={16} />}
              onClick={() => onTakeAction("Tax")}
            />
            <ActionButton 
              title="เปลี่ยนไพ่" desc="จั่ว 2/ส่ง 2 (ทูต)" icon={<RefreshCw className="text-green-400" size={16} />}
              onClick={() => onTakeAction("Exchange")}
            />
            
            <TargetedAction 
              targets={getAliveOthers()} selected={selectedTarget} onSelect={setSelectedTarget}
              title="สังหาร" cost={3} claim="มือสังหาร" icon={<Skull className="text-red-500" size={16} />}
              disabled={me.coins < 3}
              onClick={() => onTakeAction("Assassinate", selectedTarget)}
            />
            
            <TargetedAction 
              targets={getAliveOthers()} selected={selectedTarget} onSelect={setSelectedTarget}
              title="ขโมย" claim="กัปตัน" icon={<Hand className="text-blue-400" size={16} />}
              onClick={() => onTakeAction("Steal", selectedTarget)}
              disabled={false}
            />
            
            <TargetedAction 
              targets={getAliveOthers()} selected={selectedTarget} onSelect={setSelectedTarget}
              title="รัฐประหาร" cost={7} icon={<Swords className="text-amber-500" size={16} />}
              disabled={me.coins < 7}
              onClick={() => onTakeAction("Coup", selectedTarget)}
            />
          </div>
        )}
      </div>
    );
  }

  // Resolving generic Wait phases
  if (act) {
    if (act.phase === "RESOLVING_COUP" && act.targetId === me.id) {
       return (
         <div className="bg-red-900/30 border border-red-500 p-6 rounded-2xl shadow-xl text-center">
           <h3 className="text-2xl font-bold text-red-500 mb-2">คุณถูกรัฐประหาร!</h3>
           <p className="mb-6">เลือกไพ่ที่ต้องการหงายทิ้ง (สูญเสีย):</p>
           <div className="flex justify-center gap-4">
             {me.influences.map(c => (
               <button 
                 key={c.id} 
                 onClick={() => onResolveReveal(c.id)}
                 className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-red-500/50 rounded-xl font-bold transition-all"
               >
                 หงาย {c.role}
               </button>
             ))}
           </div>
         </div>
       )
    }

    if (act.phase === "RESOLVING_ASSASSINATION" && act.targetId === me.id) {
       return (
         <div className="bg-red-900/30 border border-red-500 p-6 rounded-2xl shadow-xl text-center">
           <h3 className="text-2xl font-bold text-red-500 mb-2">คุณถูกสังหาร!</h3>
           <p className="mb-6">เลือกไพ่ที่ต้องการหงายทิ้ง (สูญเสีย):</p>
           <div className="flex justify-center gap-4">
             {me.influences.map(c => (
               <button 
                 key={c.id} 
                 onClick={() => onResolveReveal(c.id)}
                 className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border-2 border-red-500/50 rounded-xl font-bold transition-all"
               >
                 หงาย {c.role}
               </button>
             ))}
           </div>
         </div>
       )
    }

    if (act.phase === "EXCHANGING" && act.playerId === me.id && act.exchangeCards) {
      const totalRequired = me.influences.length;
      return (
         <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-2xl shadow-xl text-center">
           <h3 className="text-2xl font-bold text-green-400 mb-2">เข้าพบทูต</h3>
           <p className="mb-6">โปรดเลือกไพ่ที่ต้องการเก็บไว้จำนวน {totalRequired} ใบ:</p>
           <div className="flex flex-wrap justify-center gap-4 mb-6">
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
                   className={`px-6 py-3 border-2 rounded-xl font-bold transition-all ${isSelected ? 'bg-green-600/30 border-green-500 text-white' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'}`}
                 >
                   {c.role}
                 </button>
               )
             })}
           </div>
           <button
             disabled={exchangeSelection.length !== totalRequired}
             onClick={() => onResolveExchange(exchangeSelection)}
             className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 px-8 py-3 rounded-xl font-bold transition-colors"
           >
             ยืนยันไพ่บนมือ
           </button>
         </div>
      );
    }

    // Interactive Reaction Phases (Challenge, Block)
    const isActor = act.playerId === me.id;
    const isTarget = act.targetId === me.id;
    
    if (act.phase === "WAITING_FOR_CHALLENGE" && !isActor) {
      return (
        <ReactionPanel 
          title={`${actorPlayer?.name} เล่น ${act.actionType} โดยอ้างตนเป็น ${act.claimedRole} ${act.targetId ? `ใส่ ${targetPlayer?.name}` : ''}`}
          onPass={onPass}
          passLabel="ปล่อยให้เล่น (ไม่จับโกหก)"
          primaryAction={onChallenge}
          primaryLabel={`จับโกหก ${act.claimedRole}`}
          primaryIcon={<XCircle size={18} />}
          primaryColor="red"
        />
      );
    }

    if (act.phase === "WAITING_FOR_BLOCK") {
      let canBlock = true;
      if ((act.actionType === "Assassinate" || act.actionType === "Steal") && !isTarget) {
        canBlock = false; // Only target can block these
      }
      
      if (!isActor && canBlock) {
        let defaultBlockRole: Role | undefined;
        if (act.actionType === "ForeignAid") defaultBlockRole = "Duke";
        if (act.actionType === "Assassinate") defaultBlockRole = "Contessa";
        // Captain/Ambassador for steal requires role picker, we'll hardcode 2 buttons
        
        return (
          <div className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 shadow-xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold">{actorPlayer?.name} กำลังเล่น {act.actionType}!</h3>
            <div className="flex gap-4 justify-center">
              <button onClick={onPass} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl font-medium transition-colors text-white">
                ปล่อยให้เล่น
              </button>
              
              {defaultBlockRole ? (
                <button onClick={() => onBlock(defaultBlockRole!)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-white">
                  <Shield size={18} />
                  ขัดขวาง (อ้างตัวเป็น {defaultBlockRole})
                </button>
              ) : (
                <>
                  {act.actionType === "Steal" && (
                    <>
                      <button onClick={() => onBlock("Captain")} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-white text-xs">
                        <Shield size={18} /> ขัดด้วยกัปตัน
                      </button>
                      <button onClick={() => onBlock("Ambassador")} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg text-white text-xs">
                        <Shield size={18} /> ขัดด้วยทูต
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }
    }

    if (act.phase === "WAITING_FOR_BLOCK_CHALLENGE" && act.blockerId !== me.id) {
       const blockerPlayer = gameState.players.find(p => p.id === act.blockerId);
       return (
        <ReactionPanel 
          title={`${blockerPlayer?.name} อ้างตัวเป็น ${act.claimedRole} เพื่อขัดขวาง!`}
          onPass={onPass}
          passLabel="ปล่อยให้ขัดขวาง"
          primaryAction={onChallengeBlock}
          primaryLabel={`จับโกหกการขัดขวาง`}
          primaryIcon={<XCircle size={18} />}
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

function ActionButton({ title, desc, icon, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className="h-12 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 disabled:bg-zinc-950 disabled:opacity-50 transition-colors flex flex-col justify-center items-center pointer-events-auto">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">{title}</div>
      <div className="text-[8px] text-zinc-500 uppercase">{desc}</div>
    </button>
  );
}

function TargetedAction({ title, desc, cost, claim, icon, onClick, targets, selected, onSelect, disabled }: any) {
  return (
    <div className={`h-12 bg-zinc-900 border border-zinc-700 rounded flex flex-col justify-between p-1 px-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center w-full">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
          {title} {cost && <span className="text-amber-500">{cost}C</span>}
        </div>
        <div className="text-[8px] text-zinc-500 uppercase">{claim ? claim : ''}</div>
      </div>
      <div className="flex gap-1 w-full shrink-0">
        <select 
          className="bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 flex-1 text-[9px] appearance-none outline-none text-zinc-300"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">- เลือก -</option>
          {targets.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button 
          onClick={onClick}
          disabled={disabled || !selected}
          className="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-100 font-bold px-2 rounded transition-colors text-[9px] uppercase tracking-widest"
        >
          ทำ
        </button>
      </div>
    </div>
  );
}

function ReactionPanel({ title, onPass, passLabel, primaryAction, primaryLabel, primaryIcon, primaryColor }: any) {
  const colorMap: any = {
    red: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20",
    blue: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
  };

  return (
    <div className="col-span-2 mt-4 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-lg font-bold text-zinc-300 mb-4">{title}</div>
      <div className="flex gap-4">
        <button onClick={primaryAction} className={`px-6 py-2 rounded font-bold uppercase text-[10px] tracking-widest transition-colors flex items-center gap-2 ${colorMap[primaryColor]}`}>
          {primaryIcon} {primaryLabel}
        </button>
        <button onClick={onPass} className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-bold uppercase text-[10px] tracking-widest transition-colors shadow-lg">
          {passLabel}
        </button>
      </div>
    </div>
  );
}
