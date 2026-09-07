import { ActionState, ActionType, Card, GameState, Player, Role, RoomSettings } from "../shared/types";

export const BASE_DECK: Role[] = [
  "Duke", "Duke", "Duke",
  "Assassin", "Assassin", "Assassin",
  "Captain", "Captain", "Captain",
  "Ambassador", "Ambassador", "Ambassador",
  "Contessa", "Contessa", "Contessa"
];

export const INQUISITOR_DECK: Role[] = [
  "Duke", "Duke", "Duke",
  "Assassin", "Assassin", "Assassin",
  "Captain", "Captain", "Captain",
  "Inquisitor", "Inquisitor", "Inquisitor",
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

export function createInitialDeck(roleSet?: "classic" | "inquisitor"): Card[] {
  const deckRoles = roleSet === "inquisitor" ? INQUISITOR_DECK : BASE_DECK;
  return shuffle(deckRoles).map((role, i) => ({
    id: `card_${i}_${Date.now()}`,
    role
  }));
}

export class GameRoom {
  state: GameState;

  constructor(roomId: string, settings?: RoomSettings) {
    this.state = {
      roomId,
      status: "LOBBY",
      players: [],
      deck: [],
      turnIndex: 0,
      turnCounter: 0,
      actionCounter: 0,
      currentAction: null,
      logs: [],
      settings: {
        timerEnabled: settings?.timerEnabled ?? true,
        turnDuration: settings?.turnDuration ? Math.max(10, Math.min(120, settings.turnDuration)) : 30,
        roleSet: settings?.roleSet ?? "classic"
      }
    };
  }

  updateSettings(settings: RoomSettings) {
    if (this.state.status !== "LOBBY") return false;
    this.state.settings = {
      timerEnabled: settings.timerEnabled ?? true,
      turnDuration: Math.max(10, Math.min(120, settings.turnDuration || 30)),
      roleSet: settings.roleSet ?? this.state.settings.roleSet ?? "classic"
    };
    const roleSetName = this.state.settings.roleSet === "inquisitor" ? "ผู้ตรวจการ (Inquisitor)" : "ทูต (Ambassador)";
    this.log(`อัปเดตการตั้งค่า: ${this.state.settings.timerEnabled ? `จับเวลา ${this.state.settings.turnDuration}s` : "ปิดจับเวลา"} | โหมดการ์ด: ${roleSetName}`);
    return true;
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

  addPlayer(id: string, name: string, isBot?: boolean) {
    if (this.state.status !== "LOBBY") return false;
    if (this.state.players.length >= 6) return false;
    if (this.getPlayer(id)) return false;
    
    this.state.players.push({
      id,
      name,
      coins: 2,
      influences: [],
      revealedInfluences: [],
      isReady: isBot ? true : false,
      isAlive: true,
      isBot: isBot ?? false
    });
    this.log(`${name} ${isBot ? "(AI Bot) " : ""}เข้าร่วมห้อง`);
    return true;
  }

  addBot(): string | null {
    if (this.state.status !== "LOBBY" || this.state.players.length >= 6) return null;
    const botNames = ["Cyber-Atlas", "Nexus-7", "Valkyrie-AI", "Zero-One", "Vector-9", "Aegis-X"];
    const usedNames = new Set(this.state.players.map(p => p.name));
    const availableName = botNames.find(n => !usedNames.has(n)) || `Bot-${Math.floor(100 + Math.random() * 900)}`;
    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.addPlayer(botId, availableName, true)) {
      return botId;
    }
    return null;
  }

  removeBot(botId: string): boolean {
    if (this.state.status !== "LOBBY") return false;
    const p = this.getPlayer(botId);
    if (!p || !p.isBot) return false;
    this.removePlayer(botId);
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
    
    this.state.deck = createInitialDeck(this.state.settings.roleSet);
    this.state.status = "PLAYING";
    this.state.players.forEach(p => {
      p.coins = 2;
      p.influences = [this.state.deck.pop()!, this.state.deck.pop()!];
      p.revealedInfluences = [];
      p.isAlive = true;
    });
    
    this.state.turnIndex = Math.floor(Math.random() * this.state.players.length);
    this.log(`เริ่มเกม! โหมด: ${this.state.settings.roleSet === "inquisitor" ? "ผู้ตรวจการ (Inquisitor)" : "คลาสสิก (Ambassador)"}`);
    
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
      Exchange: this.state.settings.roleSet === "inquisitor" ? "แลกไพ่ 1 ใบ (Inquisitor Exchange)" : "เปลี่ยนไพ่ (Exchange)",
      Examine: "ส่องไพ่ฝ่ายตรงข้าม (Examine)",
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
      this.state.currentAction = { playerId, actionType, targetId, phase: "RESOLVING_COUP", passCount: 0, passedPlayerIds: [] };
      this.log(`${player.name} ${actionNames[actionType]} ใส่ ${this.getPlayer(targetId)?.name}!`);
    } else if (actionType === "ForeignAid") {
      this.state.currentAction = { playerId, actionType, targetId: null, phase: "WAITING_FOR_BLOCK", passCount: 0, passedPlayerIds: [] };
      this.log(`${player.name} แจ้งเพื่อ ${actionNames[actionType]}.`);
    } else {
      let claimedRole: Role | undefined;
      if (actionType === "Tax") claimedRole = "Duke";
      else if (actionType === "Assassinate") {
        if (player.coins < 3) return false;
        if (!targetId || targetId === playerId || !this.getPlayer(targetId)?.isAlive) return false;
        player.coins -= 3; // Official Coup rule: 3 coins paid to treasury immediately upon declaration
        claimedRole = "Assassin";
      } else if (actionType === "Steal") {
        if (!targetId || targetId === playerId || !this.getPlayer(targetId)?.isAlive) return false;
        const target = this.getPlayer(targetId);
        if (!target || target.coins <= 0) return false; // Official Coup rule: cannot steal from someone with 0 coins
        claimedRole = "Captain";
      } else if (actionType === "Exchange") {
        claimedRole = this.state.settings.roleSet === "inquisitor" ? "Inquisitor" : "Ambassador";
      } else if (actionType === "Examine") {
        if (!targetId || targetId === playerId || !this.getPlayer(targetId)?.isAlive) return false;
        claimedRole = "Inquisitor";
      }

      if (claimedRole) {
        this.state.currentAction = { playerId, actionType, targetId, phase: "WAITING_FOR_CHALLENGE", claimedRole, passCount: 0, passedPlayerIds: [] };
        this.log(`${player.name} แจ้งเพื่อ ${actionNames[actionType]}${targetId ? ` ใส่ ${this.getPlayer(targetId)?.name}` : ""} (อ้างตัวเป็น ${claimedRole})`);
      }
    }
    return true;
  }

  passAction(playerId: string) {
    if (!this.state.currentAction) return false;
    const act = this.state.currentAction;
    const player = this.getPlayer(playerId);
    if (!player || !player.isAlive) return false;

    if (!act.passedPlayerIds) {
      act.passedPlayerIds = [];
    }

    // Phase 1: WAITING_FOR_CHALLENGE (Tax, Exchange, Steal, Assassinate)
    if (act.phase === "WAITING_FOR_CHALLENGE") {
      // Actor cannot pass on their own action
      if (act.playerId === playerId) return false;
      // Cannot pass twice
      if (act.passedPlayerIds.includes(playerId)) return false;

      act.passedPlayerIds.push(playerId);
      act.passCount = act.passedPlayerIds.length;

      // Eligible challengers are all other alive players
      const eligibleChallengers = this.getAlivePlayers().filter(p => p.id !== act.playerId);
      const allPassed = eligibleChallengers.every(p => act.passedPlayerIds.includes(p.id));

      if (allPassed) {
        this.resolveUnchallengedAction();
      }
      return true;
    }

    // Phase 2: WAITING_FOR_BLOCK
    if (act.phase === "WAITING_FOR_BLOCK") {
      // Targeted actions: Assassinate, Steal -> ONLY target can block or pass!
      if (act.actionType === "Assassinate" || act.actionType === "Steal") {
        if (playerId !== act.targetId) {
          return false; // Only target can pass or block!
        }
        // Target chose not to block, action executes immediately
        this.log(`${player.name} เลือกไม่ขัดขวางการ ${act.actionType}`);
        this.executeAction();
        return true;
      }

      // Untargeted action: Foreign Aid -> Anyone except actor can block
      if (act.actionType === "ForeignAid") {
        if (playerId === act.playerId) return false;
        if (act.passedPlayerIds.includes(playerId)) return false;

        act.passedPlayerIds.push(playerId);
        act.passCount = act.passedPlayerIds.length;

        const eligibleBlockers = this.getAlivePlayers().filter(p => p.id !== act.playerId);
        const allPassed = eligibleBlockers.every(p => act.passedPlayerIds.includes(p.id));

        if (allPassed) {
          this.executeAction();
        }
        return true;
      }

      return false;
    }

    // Phase 3: WAITING_FOR_BLOCK_CHALLENGE
    if (act.phase === "WAITING_FOR_BLOCK_CHALLENGE") {
      // Blocker cannot challenge own block
      if (act.blockerId === playerId) return false;
      if (act.passedPlayerIds.includes(playerId)) return false;

      act.passedPlayerIds.push(playerId);
      act.passCount = act.passedPlayerIds.length;

      const eligibleChallengers = this.getAlivePlayers().filter(p => p.id !== act.blockerId);
      const allPassed = eligibleChallengers.every(p => act.passedPlayerIds.includes(p.id));

      if (allPassed) {
        this.log(`การขัดขวางสำเร็จ! การกระทำถูกยกเลิก`);
        this.nextTurn();
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
      const drawCount = this.state.settings.roleSet === "inquisitor" ? 1 : 2;
      const drawn: Card[] = [];
      for (let i = 0; i < drawCount; i++) {
        if (this.state.deck.length > 0) {
          drawn.push(this.state.deck.pop()!);
        }
      }
      act.exchangeCards = drawn;
      act.phase = "EXCHANGING";
    } else if (act.actionType === "Examine") {
      const target = act.targetId ? this.getPlayer(act.targetId) : null;
      if (target && target.influences.length > 0) {
        // Fair random selection of one card from target's hand
        const randomIdx = Math.floor(Math.random() * target.influences.length);
        act.examinedCard = target.influences[randomIdx];
        act.phase = "EXAMINING";
        this.log(`${this.getPlayer(act.playerId)?.name} กำลังส่องไพ่ 1 ใบของ ${target.name}...`);
      } else {
        this.nextTurn();
      }
    } else if (act.actionType === "Assassinate" || act.actionType === "Steal") {
      act.phase = "WAITING_FOR_BLOCK";
      act.passCount = 0;
      act.passedPlayerIds = [];
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
      // Coins were already deducted at action declaration
      if (!target || !target.isAlive || target.influences.length === 0) {
        this.log(`${target?.name || "เป้าหมาย"} ถูกกำจัดไปแล้ว การสังหารสิ้นสุด`);
        this.nextTurn();
      } else {
        act.phase = "RESOLVING_ASSASSINATION";
        this.log(`${p!.name} สังหาร ${target.name}!`);
      }
    } else if (act.actionType === "Steal") {
      const stolen = Math.min(2, target ? target.coins : 0);
      if (target) target.coins -= stolen;
      p!.coins += stolen;
      this.log(`${p!.name} ขโมย ${stolen} เหรียญจาก ${target?.name}!`);
      this.nextTurn();
    }
  }

  triggerInfluenceLoss(loser: Player, nextStep: "NEXT_TURN" | "RESOLVE_ACTION" | "WAITING_FOR_BLOCK") {
    const act = this.state.currentAction!;
    if (loser.influences.length <= 1) {
      // Only 1 card left, must reveal this only card and die
      const card = loser.influences.pop();
      if (card) {
        loser.revealedInfluences.push(card);
        this.log(`${loser.name} ต้องเปิดเผยไพ่ใบสุดท้าย ${card.role}!`);
        this.handlePlayerDeath(loser);
      }
      this.resumeAfterLoss(nextStep);
    } else {
      // Has multiple cards, player chooses which one to discard
      act.phase = "RESOLVING_CHALLENGE_LOSS";
      act.losingPlayerId = loser.id;
      act.nextStepAfterLoss = nextStep;
      this.log(`${loser.name} แพ้การท้าทาย ต้องเลือกเปิดเผยไพ่ 1 ใบเพื่อสละทิ้ง`);
    }
  }

  resumeAfterLoss(nextStep: "NEXT_TURN" | "RESOLVE_ACTION" | "WAITING_FOR_BLOCK") {
    const act = this.state.currentAction!;
    if (nextStep === "NEXT_TURN") {
      this.nextTurn();
    } else if (nextStep === "RESOLVE_ACTION") {
      if (act.actionType === "Tax") {
        const actor = this.getPlayer(act.playerId);
        if (actor && actor.isAlive) {
          actor.coins += 3;
          this.log(`${actor.name} เก็บภาษีสำเร็จ ได้รับ 3 เหรียญ`);
        }
        this.nextTurn();
      } else if (act.actionType === "Exchange") {
        const actor = this.getPlayer(act.playerId);
        if (actor && actor.isAlive) {
          const drawCount = this.state.settings.roleSet === "inquisitor" ? 1 : 2;
          const drawn: Card[] = [];
          for (let i = 0; i < drawCount; i++) {
            if (this.state.deck.length > 0) {
              drawn.push(this.state.deck.pop()!);
            }
          }
          act.exchangeCards = drawn;
          act.phase = "EXCHANGING";
        } else {
          this.nextTurn();
        }
      } else if (act.actionType === "Examine") {
        const actor = this.getPlayer(act.playerId);
        const target = act.targetId ? this.getPlayer(act.targetId) : null;
        if (actor && actor.isAlive && target && target.influences.length > 0) {
          const randomIdx = Math.floor(Math.random() * target.influences.length);
          act.examinedCard = target.influences[randomIdx];
          act.phase = "EXAMINING";
          this.log(`${actor.name} กำลังส่องไพ่ 1 ใบของ ${target.name}...`);
        } else {
          this.nextTurn();
        }
      } else {
        this.executeAction();
      }
    } else if (nextStep === "WAITING_FOR_BLOCK") {
      const actor = this.getPlayer(act.playerId);
      if (!actor || !actor.isAlive) {
        this.nextTurn();
      } else {
        act.phase = "WAITING_FOR_BLOCK";
        act.passCount = 0;
        act.passedPlayerIds = [];
      }
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
      
      let nextStep: "NEXT_TURN" | "RESOLVE_ACTION" | "WAITING_FOR_BLOCK" = "RESOLVE_ACTION";
      if (act.actionType === "Assassinate" || act.actionType === "Steal") {
        nextStep = "WAITING_FOR_BLOCK";
      }
      this.triggerInfluenceLoss(challenger, nextStep);
    } else {
      this.log(`${actor.name} โกหก! การจับโกหกสำเร็จ ตัวปลอมถูกเปิดเผย`);
      this.triggerInfluenceLoss(actor, "NEXT_TURN");
    }
    
    return true;
  }

  blockAction(playerId: string, claimRole: Role) {
    const act = this.state.currentAction;
    if (!act || act.phase !== "WAITING_FOR_BLOCK") return false;
    
    const blocker = this.getPlayer(playerId);
    if (!blocker || !blocker.isAlive) return false;

    // Check if this action can be blocked, and who can block it
    let valid = false;
    if (act.actionType === "ForeignAid") {
      if (claimRole === "Duke" && playerId !== act.playerId) valid = true;
    } else if (act.actionType === "Assassinate") {
      if (claimRole === "Contessa" && playerId === act.targetId) valid = true;
    } else if (act.actionType === "Steal") {
      if ((claimRole === "Captain" || claimRole === "Ambassador" || claimRole === "Inquisitor") && playerId === act.targetId) valid = true;
    }

    if (!valid) return false;

    act.phase = "WAITING_FOR_BLOCK_CHALLENGE";
    act.blockerId = playerId;
    act.claimedRole = claimRole;
    act.passCount = 0;
    act.passedPlayerIds = [];

    this.log(`${blocker.name} ขอขัดขวางการ ${act.actionType} โดยอ้างตัวเป็น ${claimRole}!`);
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
      
      this.log(`การขัดขวางเป็นผลสำเร็จ, การกระทำถูกยกเลิก`);
      this.triggerInfluenceLoss(challenger, "NEXT_TURN");
    } else {
      this.log(`${blocker.name} โกหก! การจับโกหกสำเร็จ`);
      this.log(`การขัดขวางล้มเหลว, ทำการกระทำต่อ`);
      this.triggerInfluenceLoss(blocker, "RESOLVE_ACTION");
    }
    return true;
  }

  resolveReveal(playerId: string, cardId: string) {
    const act = this.state.currentAction;
    if (!act) return false;

    if (act.phase === "RESOLVING_CHALLENGE_LOSS" && act.losingPlayerId === playerId) {
      const p = this.getPlayer(playerId);
      const cardIdx = p?.influences.findIndex(c => c.id === cardId);
      if (p && cardIdx !== undefined && cardIdx !== -1) {
        const card = p.influences[cardIdx];
        p.influences.splice(cardIdx, 1);
        p.revealedInfluences.push(card);
        this.log(`${p.name} เผยไพ่และเสีย ${card.role} จากการแพ้การท้าทาย`);
        if (p.influences.length === 0) this.handlePlayerDeath(p);
        
        const nextStep = act.nextStepAfterLoss || "NEXT_TURN";
        this.resumeAfterLoss(nextStep);
        return true;
      }
    } else if (act.phase === "RESOLVING_COUP" && act.targetId === playerId) {
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

  resolveExamine(playerId: string, decision: "keep" | "exchange") {
    const act = this.state.currentAction;
    if (!act || act.phase !== "EXAMINING" || act.playerId !== playerId) return false;

    const actor = this.getPlayer(playerId);
    const target = act.targetId ? this.getPlayer(act.targetId) : null;
    if (!actor || !target) return false;

    const examinedCard = act.examinedCard;
    if (!examinedCard) return false;

    if (decision === "keep") {
      this.log(`${actor.name} ส่องไพ่ของ ${target.name} แล้วอนุญาตให้เก็บไพ่ใบเดิมไว้`);
    } else {
      // Force exchange: target returns examinedCard to deck, deck shuffles, target draws 1 new card
      target.influences = target.influences.filter(c => c.id !== examinedCard.id);
      this.state.deck.push(examinedCard);
      this.state.deck = shuffle(this.state.deck);
      if (this.state.deck.length > 0) {
        target.influences.push(this.state.deck.pop()!);
      }
      this.log(`${actor.name} ส่องไพ่ของ ${target.name} แล้วสั่งบังคับให้สับเข้ากองกลางเพื่อจั่วใหม่!`);
    }

    this.nextTurn();
    return true;
  }
}

