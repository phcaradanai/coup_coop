import { ActionState, ActionType, Card, GameState, Player, Role } from "../shared/types";

export const BASE_DECK: Role[] = [
  "Duke", "Duke", "Duke",
  "Assassin", "Assassin", "Assassin",
  "Captain", "Captain", "Captain",
  "Ambassador", "Ambassador", "Ambassador",
  "Contessa", "Contessa", "Contessa"
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialDeck(): Card[] {
  return shuffle(BASE_DECK).map((role, i) => ({
    id: `card_${i}_${Date.now()}`,
    role
  }));
}

export class GameRoom {
  state: GameState;

  constructor(roomId: string) {
    this.state = {
      roomId,
      status: "LOBBY",
      players: [],
      deck: [],
      turnIndex: 0,
      turnCounter: 0,
      currentAction: null,
      logs: []
    };
  }

  log(msg: string) {
    this.state.logs.push(`[${new Date().toLocaleTimeString('th-TH')}] ${msg}`);
    if (this.state.logs.length > 50) this.state.logs.shift();
  }

  getPlayer(id: string) {
    return this.state.players.find(p => p.id === id);
  }
  
  getAlivePlayers() {
    return this.state.players.filter(p => p.isAlive);
  }

  addPlayer(id: string, name: string) {
    if (this.state.status !== "LOBBY") return false;
    if (this.state.players.length >= 6) return false;
    if (this.getPlayer(id)) return false;
    
    this.state.players.push({
      id,
      name,
      coins: 2,
      influences: [],
      revealedInfluences: [],
      isReady: false,
      isAlive: true
    });
    this.log(`${name} เข้าร่วมห้อง`);
    return true;
  }

  removePlayer(id: string) {
    const idx = this.state.players.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.log(`${this.state.players[idx].name} ออกจากห้อง`);
      this.state.players.splice(idx, 1);
      
      // If game is playing, handle removal logic (they die)
      if (this.state.status === "PLAYING") {
        this.checkWinCondition();
      } else if (this.state.status === "LOBBY" && this.state.players.length === 0) {
        // Room empty
      }
    }
  }

  startGame() {
    if (this.state.status !== "LOBBY" || this.state.players.length < 2) return false;
    
    this.state.deck = createInitialDeck();
    this.state.status = "PLAYING";
    this.state.players.forEach(p => {
      p.coins = 2;
      p.influences = [this.state.deck.pop()!, this.state.deck.pop()!];
      p.revealedInfluences = [];
      p.isAlive = true;
    });
    
    this.state.turnIndex = Math.floor(Math.random() * this.state.players.length);
    this.log("เริ่มเกม!");
    
    return true;
  }

  returnToLobby() {
    if (this.state.status !== "FINISHED") return false;
    
    this.state.status = "LOBBY";
    this.state.winnerId = undefined;
    this.state.currentAction = null;
    this.state.logs = [];
    this.log("กลับสู่ล็อบบี้ พร้อมเริ่มเกมใหม่");
    
    return true;
  }
  
  nextTurn() {
    this.state.currentAction = null;
    this.state.turnCounter++;
    let nextIndex = (this.state.turnIndex + 1) % this.state.players.length;
    while (!this.state.players[nextIndex].isAlive) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }
    this.state.turnIndex = nextIndex;
    const player = this.state.players[this.state.turnIndex];
    this.log(`ตาของ ${player.name}`);
  }

  checkWinCondition() {
    const alive = this.getAlivePlayers();
    if (alive.length === 1) {
      this.state.status = "FINISHED";
      this.state.winnerId = alive[0].id;
      this.log(`${alive[0].name} ชนะเกมนี้!`);
    } else if (alive.length === 0) {
      this.state.status = "FINISHED";
      this.log("ทุกคนตายหมด!"); // Shouldn't happen
    }
  }

  handlePlayerDeath(p: Player) {
    p.isAlive = false;
    this.log(`${p.name} ถูกกำจัด!`);
    this.checkWinCondition();
  }

  takeAction(playerId: string, actionType: ActionType, targetId?: string) {
    const player = this.getPlayer(playerId);
    if (!player || !player.isAlive || this.state.players[this.state.turnIndex].id !== playerId) return false;
    if (this.state.status !== "PLAYING" || this.state.currentAction !== null) return false;

    if (player.coins >= 10 && actionType !== "Coup") {
      this.log(`${player.name} มีเหรียญ 10 เหรียญขึ้นไป ต้องทำรัฐประหารเท่านั้น`);
      return false; // must Coup
    }

    const actionNames: Record<string, string> = {
      Income: "รับรายได้ (Income)",
      ForeignAid: "ขอเงินสนับสนุน (Foreign Aid)",
      Tax: "เก็บภาษี (Tax)",
      Assassinate: "สังหาร (Assassinate)",
      Steal: "ขโมย (Steal)",
      Exchange: "เปลี่ยนไพ่ (Exchange)",
      Coup: "ทำรัฐประหาร (Coup)"
    };

    if (actionType === "Income") {
      player.coins += 1;
      this.log(`${player.name} ${actionNames[actionType]}`);
      this.nextTurn();
    } else if (actionType === "Coup") {
      if (player.coins < 7) return false;
      if (!targetId || targetId === playerId || !this.getPlayer(targetId)?.isAlive) return false;
      player.coins -= 7;
      this.state.currentAction = { playerId, actionType, targetId, phase: "RESOLVING_COUP", passCount: 0 };
      this.log(`${player.name} ${actionNames[actionType]} ใส่ ${this.getPlayer(targetId)?.name}!`);
    } else if (actionType === "ForeignAid") {
      this.state.currentAction = { playerId, actionType, targetId: null, phase: "WAITING_FOR_BLOCK", passCount: 0 };
      this.log(`${player.name} แจ้งเพื่อ ${actionNames[actionType]}.`);
    } else {
      let claimedRole: Role | undefined;
      if (actionType === "Tax") claimedRole = "Duke";
      else if (actionType === "Assassinate") {
        if (player.coins < 3) return false;
        if (!targetId || targetId === playerId || !this.getPlayer(targetId)?.isAlive) return false;
        claimedRole = "Assassin";
      } else if (actionType === "Steal") {
        if (!targetId || targetId === playerId || !this.getPlayer(targetId)?.isAlive) return false;
        claimedRole = "Captain";
      } else if (actionType === "Exchange") claimedRole = "Ambassador";

      if (claimedRole) {
        this.state.currentAction = { playerId, actionType, targetId, phase: "WAITING_FOR_CHALLENGE", claimedRole, passCount: 0 };
        this.log(`${player.name} แจ้งเพื่อ ${actionNames[actionType]}${targetId ? ` ใส่ ${this.getPlayer(targetId)?.name}` : ""} (อ้างตัวเป็น ${claimedRole})`);
      }
    }
    return true;
  }

  passAction(playerId: string) {
    if (!this.state.currentAction) return false;
    const act = this.state.currentAction;
    
    // Cannot pass on own action
    if (act.playerId === playerId) return false;
    
    if (act.phase === "WAITING_FOR_CHALLENGE" || act.phase === "WAITING_FOR_BLOCK_CHALLENGE" || act.phase === "WAITING_FOR_BLOCK") {
      act.passCount++;
      const aliveCount = this.getAlivePlayers().length;
      if (act.passCount >= aliveCount - 1) {
        if (act.phase === "WAITING_FOR_CHALLENGE") {
          this.resolveUnchallengedAction();
        } else if (act.phase === "WAITING_FOR_BLOCK") {
          this.executeAction();
        } else if (act.phase === "WAITING_FOR_BLOCK_CHALLENGE") {
           // Block unchallenged, action fails
           this.log(`ป้องกันสำเร็จ! การกระทำถูกยกเลิก`);
           this.nextTurn();
        }
      }
      return true;
    }
    return false;
  }

  resolveUnchallengedAction() {
    const act = this.state.currentAction!;
    
    if (act.actionType === "Tax") {
      this.getPlayer(act.playerId)!.coins += 3;
      this.log(`${this.getPlayer(act.playerId)!.name} เก็บภาษีสำเร็จ ได้รับ 3 เหรียญ`);
      this.nextTurn();
    } else if (act.actionType === "Exchange") {
      act.exchangeCards = [this.state.deck.pop()!, this.state.deck.pop()!];
      act.phase = "EXCHANGING";
    } else if (act.actionType === "Assassinate" || act.actionType === "Steal") {
      act.phase = "WAITING_FOR_BLOCK";
      act.passCount = 0;
    }
  }

  executeAction() {
    const act = this.state.currentAction!;
    const p = this.getPlayer(act.playerId);
    const target = act.targetId ? this.getPlayer(act.targetId) : null;

    if (act.actionType === "ForeignAid") {
      p!.coins += 2;
      this.log(`${p!.name} ได้รับเงินสนับสนุน 2 เหรียญ`);
      this.nextTurn();
    } else if (act.actionType === "Assassinate") {
      p!.coins -= 3;
      act.phase = "RESOLVING_ASSASSINATION";
      this.log(`${p!.name} สังหาร ${target!.name}!`);
    } else if (act.actionType === "Steal") {
      const stolen = Math.min(2, target!.coins);
      target!.coins -= stolen;
      p!.coins += stolen;
      this.log(`${p!.name} ขโมย ${stolen} เหรียญจาก ${target!.name}!`);
      this.nextTurn();
    }
  }

  challengeAction(playerId: string) {
    const act = this.state.currentAction;
    if (!act || act.phase !== "WAITING_FOR_CHALLENGE" || act.playerId === playerId) return false;
    
    const challenger = this.getPlayer(playerId);
    const actor = this.getPlayer(act.playerId);
    if (!challenger || !actor) return false;

    this.log(`${challenger.name} จับโกหกการเป็น ${act.claimedRole} ของ ${actor.name}!`);
    
    const hasRole = actor.influences.find(c => c.role === act.claimedRole);
    if (hasRole) {
      this.log(`${actor.name} หงายไพ่โชว์การเป็น ${act.claimedRole}! ผู้จับโกหกหน้าแตกล้มเหลว`);
      actor.influences = actor.influences.filter(c => c.id !== hasRole.id);
      this.state.deck.push(hasRole);
      this.state.deck = shuffle(this.state.deck);
      actor.influences.push(this.state.deck.pop()!);
      
      this.autoKillInfluence(challenger);
      
      if (act.actionType === "Tax") {
        actor.coins += 3;
        this.nextTurn();
      } else if (act.actionType === "Exchange") {
        act.exchangeCards = [this.state.deck.pop()!, this.state.deck.pop()!];
        act.phase = "EXCHANGING";
      } else if (act.actionType === "Assassinate" || act.actionType === "Steal") {
        act.phase = "WAITING_FOR_BLOCK";
        act.passCount = 0;
      }
    } else {
      this.log(`${actor.name} โกหก! การจับโกหกสำเร็จ ตัวปลอมถูกเปิดเผย`);
      this.autoKillInfluence(actor);
      this.nextTurn();
    }
    
    return true;
  }

  autoKillInfluence(p: Player) {
    const card = p.influences.pop();
    if (card) {
      p.revealedInfluences.push(card);
      this.log(`${p.name} เสียไพ่ ${card.role}!`);
      if (p.influences.length === 0) {
        this.handlePlayerDeath(p);
      }
    }
  }

  blockAction(playerId: string, claimRole: Role) {
    const act = this.state.currentAction;
    if (!act || act.phase !== "WAITING_FOR_BLOCK") return false;
    
    const blocker = this.getPlayer(playerId);
    if (!blocker) return false;
    
    this.log(`${blocker.name} อ้างตัวเป็น ${claimRole} เพื่อขัดขวางการ ${act.actionType}!`);
    act.phase = "WAITING_FOR_BLOCK_CHALLENGE";
    act.passCount = 0;
    act.blockerId = playerId;
    act.claimedRole = claimRole;
    return true;
  }

  challengeBlock(playerId: string) {
    const act = this.state.currentAction;
    if (!act || act.phase !== "WAITING_FOR_BLOCK_CHALLENGE" || act.blockerId === playerId) return false;
    
    const challenger = this.getPlayer(playerId);
    const blocker = this.getPlayer(act.blockerId!);
    if (!challenger || !blocker) return false;

    this.log(`${challenger.name} จับโกหกการขัดขวางของ ${blocker.name}!`);
    
    const hasRole = blocker.influences.find(c => c.role === act.claimedRole);
    if (hasRole) {
      this.log(`${blocker.name} หงายไพ่โชว์การเป็น ${act.claimedRole}! ตัวจริงเสียงจริง`);
      blocker.influences = blocker.influences.filter(c => c.id !== hasRole.id);
      this.state.deck.push(hasRole);
      this.state.deck = shuffle(this.state.deck);
      blocker.influences.push(this.state.deck.pop()!);
      
      this.autoKillInfluence(challenger);
      this.log(`การขัดขวางเป็นผลสำเร็จ, การกระทำถูกยกเลิก`);
      this.nextTurn();
    } else {
      this.log(`${blocker.name} โกหก! การจับโกหกสำเร็จ`);
      this.autoKillInfluence(blocker);
      this.log(`การขัดขวางล้มเหลว, ทำการกระทำต่อ`);
      this.executeAction();
    }
    return true;
  }

  resolveReveal(playerId: string, cardId: string) {
    const act = this.state.currentAction;
    if (!act) return false;
    if (act.phase === "RESOLVING_COUP" && act.targetId === playerId) {
      const p = this.getPlayer(playerId);
      const cardIdx = p?.influences.findIndex(c => c.id === cardId);
      if (p && cardIdx !== undefined && cardIdx !== -1) {
        const card = p.influences[cardIdx];
        p.influences.splice(cardIdx, 1);
        p.revealedInfluences.push(card);
        this.log(`${p.name} เผยไพ่และเสีย ${card.role} จากผลของการรัฐประหาร`);
        if (p.influences.length === 0) this.handlePlayerDeath(p);
        this.nextTurn();
        return true;
      }
    } else if (act.phase === "RESOLVING_ASSASSINATION" && act.targetId === playerId) {
      const p = this.getPlayer(playerId);
      const cardIdx = p?.influences.findIndex(c => c.id === cardId);
      if (p && cardIdx !== undefined && cardIdx !== -1) {
        const card = p.influences[cardIdx];
        p.influences.splice(cardIdx, 1);
        p.revealedInfluences.push(card);
        this.log(`${p.name} เผยไพ่และเสีย ${card.role} จากผลของการถูกสังหาร`);
        if (p.influences.length === 0) this.handlePlayerDeath(p);
        this.nextTurn();
        return true;
      }
    }
    return false;
  }

  resolveExchange(playerId: string, keptCardIds: string[]) {
    const act = this.state.currentAction;
    if (!act || act.phase !== "EXCHANGING" || act.playerId !== playerId) return false;
    
    const p = this.getPlayer(playerId);
    if (!p) return false;

    const allOptions = [...p.influences, ...(act.exchangeCards || [])];
    const newHand: Card[] = [];
    const returned: Card[] = [];

    // Verify
    if (keptCardIds.length !== p.influences.length) return false;

    allOptions.forEach(c => {
      if (keptCardIds.includes(c.id) && newHand.length < p.influences.length) {
        newHand.push(c);
      } else {
        returned.push(c);
      }
    });

    p.influences = newHand;
    this.state.deck.push(...returned);
    this.state.deck = shuffle(this.state.deck);
    
    this.log(`${p.name} ตัดสินใจเปลี่ยนไพ่เรียบร้อยแล้ว`);
    this.nextTurn();
    return true;
  }
}

