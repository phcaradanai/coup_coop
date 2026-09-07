import { ActionType, Card, GameState, Player, Role } from "../shared/types";
import { GameRoom } from "./game";

export class BotBrain {
  /**
   * Decide what action the bot should take on its turn
   */
  static decideTurnAction(room: GameRoom, bot: Player): { actionType: ActionType; targetId?: string } {
    const aliveOpponents = room.getAlivePlayers().filter(p => p.id !== bot.id);
    if (aliveOpponents.length === 0) {
      return { actionType: "Income" };
    }

    // Sort opponents by danger level (most coins first)
    const dangerousOpponents = [...aliveOpponents].sort((a, b) => b.coins - a.coins);
    const topThreat = dangerousOpponents[0];

    // Rule 1: Mandatory Coup if 10+ coins
    if (bot.coins >= 10) {
      return { actionType: "Coup", targetId: topThreat.id };
    }

    // Rule 2: High chance of Coup if 7+ coins (80% coup, 20% tactical hold/action)
    if (bot.coins >= 7 && Math.random() < 0.8) {
      return { actionType: "Coup", targetId: topThreat.id };
    }

    const hasDuke = bot.influences.some(c => c.role === "Duke");
    const hasAssassin = bot.influences.some(c => c.role === "Assassin");
    const hasCaptain = bot.influences.some(c => c.role === "Captain");
    const hasInquisitor = bot.influences.some(c => c.role === "Inquisitor");
    const hasAmbassador = bot.influences.some(c => c.role === "Ambassador");

    const targetsWithCoins = aliveOpponents.filter(p => p.coins > 0).sort((a, b) => b.coins - a.coins);

    // Rule 3: Legitimate or Bluff Assassinate
    if (bot.coins >= 3) {
      // 80% if holds Assassin, 15% bluff if doesn't
      const willAssassinate = hasAssassin ? Math.random() < 0.85 : Math.random() < 0.15;
      if (willAssassinate) {
        return { actionType: "Assassinate", targetId: topThreat.id };
      }
    }

    // Rule 4: Legitimate or Bluff Steal
    if (targetsWithCoins.length > 0) {
      const bestStealTarget = targetsWithCoins[0];
      const willSteal = hasCaptain ? Math.random() < 0.8 : Math.random() < 0.2;
      if (willSteal) {
        return { actionType: "Steal", targetId: bestStealTarget.id };
      }
    }

    // Rule 5: Duke Tax (Legitimate or Bluff)
    const willTax = hasDuke ? Math.random() < 0.85 : Math.random() < 0.25;
    if (willTax) {
      return { actionType: "Tax" };
    }

    // Rule 6: Inquisitor Examine or Exchange
    if (room.state.settings.roleSet === "inquisitor") {
      if (hasInquisitor || Math.random() < 0.15) {
        // 50% examine, 50% exchange
        if (Math.random() < 0.5) {
          return { actionType: "Examine", targetId: topThreat.id };
        } else {
          return { actionType: "Exchange" };
        }
      }
    } else {
      // Ambassador Exchange
      if (hasAmbassador || Math.random() < 0.1) {
        return { actionType: "Exchange" };
      }
    }

    // Rule 7: Foreign Aid vs Income
    // If opponents are less likely to have Duke, try Foreign Aid
    if (Math.random() < 0.6) {
      return { actionType: "ForeignAid" };
    }

    return { actionType: "Income" };
  }

  /**
   * Decide whether the bot should challenge an action
   */
  static decideChallengeAction(room: GameRoom, bot: Player): boolean {
    const act = room.state.currentAction;
    if (!act || !act.claimedRole) return false;

    const claimedRole = act.claimedRole;
    
    // Count how many copies of claimedRole are visibly known to the bot
    let knownCopies = 0;
    // 1. In bot's own hand
    knownCopies += bot.influences.filter(c => c.role === claimedRole).length;
    // 2. In public revealed dead cards
    for (const p of room.state.players) {
      knownCopies += p.revealedInfluences.filter(c => c.role === claimedRole).length;
    }

    // 3 copies exist in total deck.
    // If bot knows all 3 copies are accounted for, 100% mathematically proven bluff!
    if (knownCopies >= 3) {
      return true;
    }

    // If 2 copies are already accounted for, only 1 copy left in the game -> 60% challenge
    if (knownCopies === 2) {
      return Math.random() < 0.65;
    }

    // If 1 copy accounted for, 15% challenge
    if (knownCopies === 1) {
      // Be more suspicious of dangerous actions (Assassinate, Steal)
      if (act.actionType === "Assassinate" && act.targetId === bot.id) {
        return Math.random() < 0.35;
      }
      return Math.random() < 0.12;
    }

    // If 0 copies known, small random bluff-calling chance (8%)
    if (act.actionType === "Assassinate" && act.targetId === bot.id) {
      return Math.random() < 0.25;
    }
    return Math.random() < 0.08;
  }

  /**
   * Decide whether to block a targeted or untargeted action
   */
  static decideBlockOrPass(room: GameRoom, bot: Player): { block: boolean; claimRole?: Role } {
    const act = room.state.currentAction;
    if (!act) return { block: false };

    // 1. Targeted Assassinate against bot
    if (act.actionType === "Assassinate" && act.targetId === bot.id) {
      const hasContessa = bot.influences.some(c => c.role === "Contessa");
      if (hasContessa) {
        return { block: true, claimRole: "Contessa" };
      }
      // If no Contessa, bluff block with 50% probability to save life
      if (Math.random() < 0.5) {
        return { block: true, claimRole: "Contessa" };
      }
      return { block: false };
    }

    // 2. Targeted Steal against bot
    if (act.actionType === "Steal" && act.targetId === bot.id) {
      const hasCaptain = bot.influences.some(c => c.role === "Captain");
      const hasInquisitor = bot.influences.some(c => c.role === "Inquisitor");
      const hasAmbassador = bot.influences.some(c => c.role === "Ambassador");

      if (hasCaptain) return { block: true, claimRole: "Captain" };
      if (room.state.settings.roleSet === "inquisitor" && hasInquisitor) {
        return { block: true, claimRole: "Inquisitor" };
      }
      if (hasAmbassador) return { block: true, claimRole: "Ambassador" };

      // Bluff block
      if (Math.random() < 0.35) {
        const claim: Role = room.state.settings.roleSet === "inquisitor"
          ? (Math.random() < 0.5 ? "Captain" : "Inquisitor")
          : (Math.random() < 0.5 ? "Captain" : "Ambassador");
        return { block: true, claimRole: claim };
      }
      return { block: false };
    }

    // 3. Foreign Aid
    if (act.actionType === "ForeignAid" && act.playerId !== bot.id) {
      const hasDuke = bot.influences.some(c => c.role === "Duke");
      if (hasDuke && Math.random() < 0.75) {
        return { block: true, claimRole: "Duke" };
      }
      if (!hasDuke && Math.random() < 0.15) {
        return { block: true, claimRole: "Duke" };
      }
      return { block: false };
    }

    return { block: false };
  }

  /**
   * Decide whether to challenge a block
   */
  static decideChallengeBlock(room: GameRoom, bot: Player): boolean {
    const act = room.state.currentAction;
    if (!act || !act.claimedRole) return false;

    const claimedRole = act.claimedRole;
    let knownCopies = bot.influences.filter(c => c.role === claimedRole).length;
    for (const p of room.state.players) {
      knownCopies += p.revealedInfluences.filter(c => c.role === claimedRole).length;
    }

    if (knownCopies >= 3) return true;
    if (knownCopies === 2) return Math.random() < 0.6;
    if (act.playerId === bot.id) {
      // Actor has more incentive to call bluff on blocks against them
      return Math.random() < 0.25;
    }
    return Math.random() < 0.08;
  }

  /**
   * Choose which card to sacrifice upon challenge loss or assassination/coup
   */
  static decideCardToLose(bot: Player): Card | null {
    if (bot.influences.length === 0) return null;
    if (bot.influences.length === 1) return bot.influences[0];

    // Priority ranking: Contessa > Duke > Assassin > Captain / Inquisitor > Ambassador
    const rolePriority: Record<Role, number> = {
      Contessa: 5,
      Duke: 4,
      Assassin: 4,
      Captain: 3,
      Inquisitor: 3,
      Ambassador: 2,
      Unknown: 0
    };

    // Sort so lowest priority card comes first
    const sorted = [...bot.influences].sort((a, b) => {
      const prioA = rolePriority[a.role] ?? 0;
      const prioB = rolePriority[b.role] ?? 0;
      return prioA - prioB;
    });

    return sorted[0];
  }

  /**
   * Choose which cards to keep in Exchange (Ambassador / Inquisitor)
   */
  static decideExchangeCards(bot: Player, availableCards: Card[]): string[] {
    const keepCount = bot.influences.length;
    const rolePriority: Record<Role, number> = {
      Contessa: 5,
      Duke: 4,
      Assassin: 4,
      Captain: 3,
      Inquisitor: 3,
      Ambassador: 2,
      Unknown: 0
    };

    // Sort descending by priority, avoid duplicates if possible
    const sorted = [...availableCards].sort((a, b) => {
      return (rolePriority[b.role] ?? 0) - (rolePriority[a.role] ?? 0);
    });

    return sorted.slice(0, keepCount).map(c => c.id);
  }

  /**
   * Decide whether Inquisitor keeps or forces exchange on inspected card
   */
  static decideExamine(examinedCard: Card): "keep" | "exchange" {
    // If examined card is high-threat (Duke, Assassin, Captain), force exchange to disrupt opponent
    if (examinedCard.role === "Assassin" || examinedCard.role === "Duke" || examinedCard.role === "Captain") {
      return "exchange";
    }
    return "keep";
  }
}
