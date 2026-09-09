import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { BotBrain } from "./src/server/ai";
import { GameRoom } from "./src/server/game";
import { ActionType, ChatMessage, ClientToServerEvents, GameState, Role, ServerToClientEvents } from "./src/shared/types";

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, {}>(server);

// In-memory store for rooms
const rooms = new Map<string, GameRoom>();
const userRooms = new Map<string, string>(); // uid -> roomId
const userSockets = new Map<string, Set<string>>(); // uid -> Set of socket IDs
const disconnectTimeouts = new Map<string, NodeJS.Timeout>(); // uid -> timeout
const roomChats = new Map<string, ChatMessage[]>(); // roomId -> recent chat messages

const turnTimeouts = new Map<string, NodeJS.Timeout>();
const botTimeouts = new Map<string, NodeJS.Timeout[]>();

/** Returns true only if the room has at least one non-bot player. */
function hasHumanPlayers(room: GameRoom): boolean {
  return room.state.players.some(p => !p.isBot);
}

/** Fully tears down a room: clears all timers, removes maps, notifies sockets. */
function cleanupRoom(roomId: string) {
  if (turnTimeouts.has(roomId)) {
    clearTimeout(turnTimeouts.get(roomId)!);
    turnTimeouts.delete(roomId);
  }
  const bots = botTimeouts.get(roomId);
  if (bots) {
    for (const t of bots) clearTimeout(t);
    botTimeouts.delete(roomId);
  }
  rooms.delete(roomId);
  roomChats.delete(roomId);

  // Clean up any userRooms entries pointing to this roomId
  for (const [userId, rId] of Array.from(userRooms.entries())) {
    if (rId === roomId) {
      userRooms.delete(userId);
    }
  }

  // Notify any remaining sockets in the room that the room has been closed
  io.to(roomId).emit("gameStateUpdate", null);
  io.in(roomId).socketsLeave(roomId);

  console.log(`Room ${roomId} cleaned up (no human players remaining).`);
}

// Periodic cleanup: guarantee any room without human players is cleaned up
setInterval(() => {
  for (const [roomId, room] of Array.from(rooms.entries())) {
    if (!hasHumanPlayers(room)) {
      console.log(`[Periodic Sweeper] Cleaning room ${roomId} (no human players).`);
      cleanupRoom(roomId);
    }
  }
}, 30000);


function getMaskedStateForPlayer(state: GameState, recipientUid: string): GameState {
  return {
    ...state,
    // Mask deck cards so no one can cheat by inspecting upcoming deck cards
    deck: state.deck.map((c, i) => ({
      id: `deck_card_${i}`,
      role: "Unknown" as Role
    })),
    // Mask players' private cards (influences)
    players: state.players.map(p => {
      if (p.id === recipientUid) {
        return p; // Recipient sees their own cards
      }
      return {
        ...p,
        influences: p.influences.map(c => ({
          id: c.id,
          role: "Unknown" as Role
        }))
      };
    }),
    // Mask exchange cards in currentAction if recipient is not the exchanging player
    currentAction: state.currentAction ? {
      ...state.currentAction,
      exchangeCards: state.currentAction.exchangeCards ? (
        state.currentAction.playerId === recipientUid
          ? state.currentAction.exchangeCards
          : state.currentAction.exchangeCards.map(c => ({ id: c.id, role: "Unknown" as Role }))
      ) : undefined,
      // Mask examined card: only the Inquisitor (actor) sees the card's real role
      examinedCard: state.currentAction.examinedCard ? (
        state.currentAction.playerId === recipientUid
          ? state.currentAction.examinedCard
          : { id: state.currentAction.examinedCard.id, role: "Unknown" as Role }
      ) : undefined
    } : null
  };
}

function broadcastGameState(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const player of room.state.players) {
    const sockets = userSockets.get(player.id);
    if (sockets && sockets.size > 0) {
      const maskedState = getMaskedStateForPlayer(room.state, player.id);
      for (const socketId of sockets) {
        io.to(socketId).emit("gameStateUpdate", maskedState);
      }
    }
  }

  // Also broadcast to any spectators / non-player sockets in this room
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  if (roomSockets) {
    for (const socketId of roomSockets) {
      const socket = io.sockets.sockets.get(socketId);
      const uid = socket ? (socket.handshake.query.uid as string) || socket.id : null;
      if (uid && !room.state.players.some(p => p.id === uid)) {
        const spectatorState = getMaskedStateForPlayer(room.state, "");
        socket.emit("gameStateUpdate", spectatorState);
      }
    }
  }
}

function checkTimeouts(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (turnTimeouts.has(roomId)) {
    clearTimeout(turnTimeouts.get(roomId)!);
    turnTimeouts.delete(roomId);
  }

  // If timer is disabled in room settings or game not active, do not set timeout
  if ((room.state.settings && !room.state.settings.timerEnabled) || room.state.status !== "PLAYING") {
    return;
  }

  const durationMs = (room.state.settings?.turnDuration || 30) * 1000;
  const startTurnCounter = room.state.turnCounter;
  const startActionCounter = room.state.actionCounter;
  const startPhase = room.state.currentAction?.phase;

  // 1. Regular turn: choosing action
  if (room.state.currentAction === null) {
    const timeout = setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom && currentRoom.state.status === "PLAYING" && currentRoom.state.currentAction === null && currentRoom.state.turnCounter === startTurnCounter) {
        const turnPlayer = currentRoom.state.players[currentRoom.state.turnIndex];
        if (turnPlayer && turnPlayer.isAlive) {
          if (turnPlayer.coins >= 10) {
            const tempOpponents = currentRoom.state.players.filter(p => p.id !== turnPlayer.id && p.isAlive);
            if (tempOpponents.length > 0) {
              const target = tempOpponents[Math.floor(Math.random() * tempOpponents.length)];
              currentRoom.takeAction(turnPlayer.id, "Coup", target.id);
            }
          } else {
            currentRoom.takeAction(turnPlayer.id, "Income");
          }
          currentRoom.state.actionCounter++;
          broadcastGameState(roomId);
          checkTimeouts(roomId);
        }
      }
    }, durationMs);
    turnTimeouts.set(roomId, timeout);
    return;
  }

  // 2. Active Reaction / Resolution phases
  const act = room.state.currentAction;
  const timeout = setTimeout(() => {
    const currentRoom = rooms.get(roomId);
    if (!currentRoom || currentRoom.state.status !== "PLAYING" || !currentRoom.state.currentAction) return;
    if (currentRoom.state.turnCounter !== startTurnCounter || currentRoom.state.actionCounter !== startActionCounter || currentRoom.state.currentAction.phase !== startPhase) {
      return; // Phase or action changed before timeout
    }

    const currentAct = currentRoom.state.currentAction;

    // WAITING_FOR_CHALLENGE: auto-pass all eligible players who haven't passed
    if (currentAct.phase === "WAITING_FOR_CHALLENGE") {
      const eligible = currentRoom.getAlivePlayers().filter(p => p.id !== currentAct.playerId);
      for (const p of eligible) {
        if (!currentAct.passedPlayerIds.includes(p.id)) {
          currentRoom.passAction(p.id);
        }
      }
    }
    // WAITING_FOR_BLOCK
    else if (currentAct.phase === "WAITING_FOR_BLOCK") {
      if (currentAct.actionType === "ForeignAid") {
        const eligible = currentRoom.getAlivePlayers().filter(p => p.id !== currentAct.playerId);
        for (const p of eligible) {
          if (!currentAct.passedPlayerIds.includes(p.id)) {
            currentRoom.passAction(p.id);
          }
        }
      } else if (currentAct.targetId) {
        // Target didn't respond in time -> auto pass or nextTurn if target is dead
        const target = currentRoom.getPlayer(currentAct.targetId);
        if (!target || !target.isAlive) {
          currentRoom.nextTurn();
        } else {
          currentRoom.passAction(currentAct.targetId);
        }
      }
    }
    // WAITING_FOR_BLOCK_CHALLENGE: auto-pass all eligible players
    else if (currentAct.phase === "WAITING_FOR_BLOCK_CHALLENGE") {
      const eligible = currentRoom.getAlivePlayers().filter(p => p.id !== currentAct.blockerId);
      for (const p of eligible) {
        if (!currentAct.passedPlayerIds.includes(p.id)) {
          currentRoom.passAction(p.id);
        }
      }
    }
    // RESOLVING_CHALLENGE_LOSS: auto reveal first card
    else if (currentAct.phase === "RESOLVING_CHALLENGE_LOSS" && currentAct.losingPlayerId) {
      const loser = currentRoom.getPlayer(currentAct.losingPlayerId);
      if (!loser || !loser.isAlive || loser.influences.length === 0) {
        currentRoom.nextTurn();
      } else {
        currentRoom.resolveReveal(loser.id, loser.influences[0].id);
      }
    }
    // RESOLVING_COUP / RESOLVING_ASSASSINATION: auto reveal target's first card
    else if ((currentAct.phase === "RESOLVING_COUP" || currentAct.phase === "RESOLVING_ASSASSINATION") && currentAct.targetId) {
      const target = currentRoom.getPlayer(currentAct.targetId);
      if (!target || !target.isAlive || target.influences.length === 0) {
        currentRoom.nextTurn();
      } else {
        currentRoom.resolveReveal(target.id, target.influences[0].id);
      }
    }
    // EXCHANGING: auto-keep first N cards
    else if (currentAct.phase === "EXCHANGING") {
      const exchanger = currentRoom.getPlayer(currentAct.playerId);
      if (exchanger) {
        const allAvailable = [...exchanger.influences, ...(currentAct.exchangeCards || [])];
        const keepIds = allAvailable.slice(0, exchanger.influences.length).map(c => c.id);
        currentRoom.resolveExchange(exchanger.id, keepIds);
      }
    }
    // EXAMINING: auto-choose "keep" if Inquisitor fails to respond
    else if (currentAct.phase === "EXAMINING") {
      currentRoom.resolveExamine(currentAct.playerId, "keep");
    }

    currentRoom.state.actionCounter++;
    broadcastGameState(roomId);
    checkTimeouts(roomId);
    scheduleBotActions(roomId);
  }, durationMs);

  turnTimeouts.set(roomId, timeout);
}

function clearBotTimeouts(roomId: string) {
  const existing = botTimeouts.get(roomId);
  if (existing) {
    for (const t of existing) {
      clearTimeout(t);
    }
    botTimeouts.delete(roomId);
  }
}

function addBotTimeout(roomId: string, timeout: NodeJS.Timeout) {
  if (!botTimeouts.has(roomId)) {
    botTimeouts.set(roomId, []);
  }
  botTimeouts.get(roomId)!.push(timeout);
}

function getRandomDelay(minMs = 1200, maxMs = 2200): number {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

function scheduleBotActions(roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.state.status !== "PLAYING") {
    clearBotTimeouts(roomId);
    return;
  }

  clearBotTimeouts(roomId);

  const startTurnCounter = room.state.turnCounter;
  const startActionCounter = room.state.actionCounter;
  const currentAct = room.state.currentAction;
  const startPhase = currentAct?.phase;

  // Helper guard to ensure the room hasn't changed state
  const isStateStillValid = (): boolean => {
    const currentRoom = rooms.get(roomId);
    if (!currentRoom || currentRoom.state.status !== "PLAYING") return false;
    if (currentRoom.state.turnCounter !== startTurnCounter || currentRoom.state.actionCounter !== startActionCounter) {
      return false;
    }
    if (startPhase !== currentRoom.state.currentAction?.phase) {
      return false;
    }
    return true;
  };

  // Case 1: Bot's turn to declare an action (no active action)
  if (currentAct === null) {
    const turnPlayer = room.state.players[room.state.turnIndex];
    if (turnPlayer && turnPlayer.isAlive && turnPlayer.isBot) {
      const delay = getRandomDelay(1300, 2200);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const bot = currentRoom.getPlayer(turnPlayer.id);
        if (!bot || !bot.isAlive) return;

        const decision = BotBrain.decideTurnAction(currentRoom, bot);
        if (currentRoom.takeAction(bot.id, decision.actionType, decision.targetId)) {
          currentRoom.state.actionCounter++;
          broadcastGameState(roomId);
          checkTimeouts(roomId);
          scheduleBotActions(roomId);
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    }
    return;
  }

  // Case 2: Reaction phases
  // 2.1 WAITING_FOR_CHALLENGE
  if (currentAct.phase === "WAITING_FOR_CHALLENGE") {
    const eligibleBots = room.getAlivePlayers().filter(
      p => p.isBot && p.id !== currentAct.playerId && !currentAct.passedPlayerIds.includes(p.id)
    );

    eligibleBots.forEach((bot, index) => {
      // Stagger slightly so multiple bots don't react at the exact same millisecond
      const delay = getRandomDelay(1200 + index * 300, 2000 + index * 300);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const currentBot = currentRoom.getPlayer(bot.id);
        if (!currentBot || !currentBot.isAlive) return;

        const willChallenge = BotBrain.decideChallengeAction(currentRoom, currentBot);
        if (willChallenge) {
          if (currentRoom.challengeAction(currentBot.id)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        } else {
          if (currentRoom.passAction(currentBot.id)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    });
    return;
  }

  // 2.2 WAITING_FOR_BLOCK
  if (currentAct.phase === "WAITING_FOR_BLOCK") {
    if (currentAct.actionType === "ForeignAid") {
      // Any player can block Foreign Aid with Duke
      const eligibleBots = room.getAlivePlayers().filter(
        p => p.isBot && p.id !== currentAct.playerId && !currentAct.passedPlayerIds.includes(p.id)
      );

      eligibleBots.forEach((bot, index) => {
        const delay = getRandomDelay(1200 + index * 300, 2000 + index * 300);
        const timeout = setTimeout(() => {
          if (!isStateStillValid()) return;
          const currentRoom = rooms.get(roomId)!;
          const currentBot = currentRoom.getPlayer(bot.id);
          if (!currentBot || !currentBot.isAlive) return;

          const decision = BotBrain.decideBlockOrPass(currentRoom, currentBot);
          if (decision.block && decision.claimRole) {
            if (currentRoom.blockAction(currentBot.id, decision.claimRole)) {
              currentRoom.state.actionCounter++;
              broadcastGameState(roomId);
              checkTimeouts(roomId);
              scheduleBotActions(roomId);
            }
          } else {
            if (currentRoom.passAction(currentBot.id)) {
              currentRoom.state.actionCounter++;
              broadcastGameState(roomId);
              checkTimeouts(roomId);
              scheduleBotActions(roomId);
            }
          }
        }, delay);
        addBotTimeout(roomId, timeout);
      });
    } else if (currentAct.targetId) {
      // Targeted block: only target can block or pass
      const target = room.getPlayer(currentAct.targetId);
      if (!target || !target.isAlive) {
        room.nextTurn();
        room.state.actionCounter++;
        broadcastGameState(roomId);
        checkTimeouts(roomId);
        scheduleBotActions(roomId);
        return;
      }
      if (target.isBot) {
        const delay = getRandomDelay(1200, 2000);
        const timeout = setTimeout(() => {
          if (!isStateStillValid()) return;
          const currentRoom = rooms.get(roomId)!;
          const currentBot = currentRoom.getPlayer(target.id);
          if (!currentBot || !currentBot.isAlive) return;

          const decision = BotBrain.decideBlockOrPass(currentRoom, currentBot);
          if (decision.block && decision.claimRole) {
            if (currentRoom.blockAction(currentBot.id, decision.claimRole)) {
              currentRoom.state.actionCounter++;
              broadcastGameState(roomId);
              checkTimeouts(roomId);
              scheduleBotActions(roomId);
            }
          } else {
            if (currentRoom.passAction(currentBot.id)) {
              currentRoom.state.actionCounter++;
              broadcastGameState(roomId);
              checkTimeouts(roomId);
              scheduleBotActions(roomId);
            }
          }
        }, delay);
        addBotTimeout(roomId, timeout);
      }
    }
    return;
  }

  // 2.3 WAITING_FOR_BLOCK_CHALLENGE
  if (currentAct.phase === "WAITING_FOR_BLOCK_CHALLENGE") {
    const eligibleBots = room.getAlivePlayers().filter(
      p => p.isBot && p.id !== currentAct.blockerId && !currentAct.passedPlayerIds.includes(p.id)
    );

    eligibleBots.forEach((bot, index) => {
      const delay = getRandomDelay(1200 + index * 300, 2000 + index * 300);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const currentBot = currentRoom.getPlayer(bot.id);
        if (!currentBot || !currentBot.isAlive) return;

        const willChallenge = BotBrain.decideChallengeBlock(currentRoom, currentBot);
        if (willChallenge) {
          if (currentRoom.challengeBlock(currentBot.id)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        } else {
          if (currentRoom.passAction(currentBot.id)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    });
    return;
  }

  // 2.4 RESOLVING_CHALLENGE_LOSS
  if (currentAct.phase === "RESOLVING_CHALLENGE_LOSS" && currentAct.losingPlayerId) {
    const loser = room.getPlayer(currentAct.losingPlayerId);
    if (loser && loser.isAlive && loser.isBot) {
      const delay = getRandomDelay(1100, 1800);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const currentBot = currentRoom.getPlayer(loser.id);
        if (!currentBot || !currentBot.isAlive) return;

        const cardToLose = BotBrain.decideCardToLose(currentBot);
        if (cardToLose) {
          if (currentRoom.resolveReveal(currentBot.id, cardToLose.id)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    }
    return;
  }

  // 2.5 RESOLVING_COUP or RESOLVING_ASSASSINATION
  if ((currentAct.phase === "RESOLVING_COUP" || currentAct.phase === "RESOLVING_ASSASSINATION") && currentAct.targetId) {
    const target = room.getPlayer(currentAct.targetId);
    if (!target || !target.isAlive) {
      room.nextTurn();
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
      return;
    }
    if (target.isBot) {
      const delay = getRandomDelay(1100, 1800);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const currentBot = currentRoom.getPlayer(target.id);
        if (!currentBot || !currentBot.isAlive) return;

        const cardToLose = BotBrain.decideCardToLose(currentBot);
        if (cardToLose) {
          if (currentRoom.resolveReveal(currentBot.id, cardToLose.id)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    }
    return;
  }

  // 2.6 EXCHANGING
  if (currentAct.phase === "EXCHANGING") {
    const exchanger = room.getPlayer(currentAct.playerId);
    if (exchanger && exchanger.isAlive && exchanger.isBot) {
      const delay = getRandomDelay(1500, 2400);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const currentBot = currentRoom.getPlayer(exchanger.id);
        if (!currentBot || !currentBot.isAlive) return;

        const allAvailable = [...currentBot.influences, ...(currentAct.exchangeCards || [])];
        const keptIds = BotBrain.decideExchangeCards(currentBot, allAvailable);
        if (currentRoom.resolveExchange(currentBot.id, keptIds)) {
          currentRoom.state.actionCounter++;
          broadcastGameState(roomId);
          checkTimeouts(roomId);
          scheduleBotActions(roomId);
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    }
    return;
  }

  // 2.7 EXAMINING
  if (currentAct.phase === "EXAMINING") {
    const inquisitor = room.getPlayer(currentAct.playerId);
    if (inquisitor && inquisitor.isAlive && inquisitor.isBot) {
      const delay = getRandomDelay(1500, 2400);
      const timeout = setTimeout(() => {
        if (!isStateStillValid()) return;
        const currentRoom = rooms.get(roomId)!;
        const currentBot = currentRoom.getPlayer(inquisitor.id);
        if (!currentBot || !currentBot.isAlive) return;

        if (currentAct.examinedCard) {
          const decision = BotBrain.decideExamine(currentAct.examinedCard);
          if (currentRoom.resolveExamine(currentBot.id, decision)) {
            currentRoom.state.actionCounter++;
            broadcastGameState(roomId);
            checkTimeouts(roomId);
            scheduleBotActions(roomId);
          }
        }
      }, delay);
      addBotTimeout(roomId, timeout);
    }
    return;
  }
}

io.on("connection", (socket) => {

  const uid = (socket.handshake.query.uid as string) || socket.id;
  console.log("Client connected", uid);

  // Clear any pending disconnect grace-period timeout for this user
  if (disconnectTimeouts.has(uid)) {
    clearTimeout(disconnectTimeouts.get(uid)!);
    disconnectTimeouts.delete(uid);
    console.log(`User ${uid} reconnected within grace period`);
  }

  // Register active socket for this uid
  if (!userSockets.has(uid)) {
    userSockets.set(uid, new Set());
  }
  userSockets.get(uid)!.add(socket.id);

  // If a user reconnects, check if they are in a room
  const existingRoomId = userRooms.get(uid);
  if (existingRoomId) {
    socket.join(existingRoomId);
    const room = rooms.get(existingRoomId);
    if (room && room.state.players.find(p => p.id === uid)) {
       socket.emit("gameStateUpdate", getMaskedStateForPlayer(room.state, uid));
       const history = roomChats.get(existingRoomId) || [];
       socket.emit("chatHistory", history);
    } else {
       // Stale room
       userRooms.delete(uid);
       socket.emit("gameStateUpdate", null);
    }
  } else {
    socket.emit("gameStateUpdate", null);
  }

  socket.on("requestRooms", () => {
    // Sweep any room with no human players
    for (const [rId, r] of Array.from(rooms.entries())) {
      if (!hasHumanPlayers(r)) {
        cleanupRoom(rId);
      }
    }

    const availableRooms = Array.from(rooms.values())
      .filter(r => hasHumanPlayers(r))
      .map(r => ({
        roomId: r.state.roomId,
        playersCount: r.state.players.length,
        status: r.state.status,
        settings: r.state.settings
      }));
    socket.emit("availableRooms", availableRooms);
  });

  socket.on("joinRoom", (roomId, name, settings) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = new GameRoom(roomId, settings);
      rooms.set(roomId, room);
    }
    
    // Check if player is already in this room (rejoin)
    const existingPlayer = room.getPlayer(uid);
    if (existingPlayer) {
      socket.join(roomId);
      userRooms.set(uid, roomId);
      existingPlayer.name = name; // Update name just in case
      broadcastGameState(roomId);
      // Send chat history to rejoining player
      const history = roomChats.get(roomId) || [];
      socket.emit("chatHistory", history);
      return;
    }

    if (room.addPlayer(uid, name)) {
      socket.join(roomId);
      userRooms.set(uid, roomId);
      broadcastGameState(roomId);
      // Send chat history to newly joined player
      const history = roomChats.get(roomId) || [];
      socket.emit("chatHistory", history);
    } else {
      if (!hasHumanPlayers(room)) {
        cleanupRoom(roomId);
      }
      socket.emit("error", "Cannot join room. Game in progress or full.");
    }
  });

  socket.on("sendChatMessage", (text) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const trimmed = (text || "").trim();
    if (!trimmed || trimmed.length > 200) return;

    const sender = room.getPlayer(uid);
    const senderName = sender ? sender.name : "ผู้เล่น";

    const chatMsg: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      senderId: uid,
      senderName,
      text: trimmed,
      timestamp: Date.now(),
    };

    if (!roomChats.has(roomId)) {
      roomChats.set(roomId, []);
    }
    const messages = roomChats.get(roomId)!;
    messages.push(chatMsg);
    if (messages.length > 100) {
      messages.shift();
    }

    io.to(roomId).emit("newChatMessage", chatMsg);
  });

  socket.on("updateSettings", (settings) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.state.status === "LOBBY") {
      // Only room host (first player) can change settings
      if (room.state.players[0]?.id === uid) {
        if (room.updateSettings(settings)) {
          broadcastGameState(roomId);
        }
      }
    }
  });

  socket.on("addBot", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.state.status === "LOBBY") {
      // Only host can add bots
      if (room.state.players[0]?.id === uid) {
        const botId = room.addBot();
        if (botId) {
          broadcastGameState(roomId);
        }
      }
    }
  });

  socket.on("removeBot", (botId) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.state.status === "LOBBY") {
      // Only host can remove bots
      if (room.state.players[0]?.id === uid) {
        if (room.removeBot(botId)) {
          broadcastGameState(roomId);
        }
      }
    }
  });

  socket.on("startGame", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      if (room.startGame()) {
        broadcastGameState(roomId);
        checkTimeouts(roomId);
        scheduleBotActions(roomId);
      }
    }
  });

  socket.on("returnToLobby", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      clearBotTimeouts(roomId);
      if (room.returnToLobby()) {
        broadcastGameState(roomId);
      }
    }
  });

  socket.on("takeAction", (actionType, targetId) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.takeAction(uid, actionType, targetId)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("challengeAction", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.challengeAction(uid)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("passAction", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.passAction(uid)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("blockAction", (claimRole) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.blockAction(uid, claimRole)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("challengeBlock", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.challengeBlock(uid)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("passBlock", () => {
    // Treat passBlock same as passAction (they share logic structurally)
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.passAction(uid)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("resolveReveal", (cardId) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.resolveReveal(uid, cardId)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("resolveExchange", (keptCardIds) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.resolveExchange(uid, keptCardIds)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("resolveExamine", (decision) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.resolveExamine(uid, decision)) {
      room.state.actionCounter++;
      broadcastGameState(roomId);
      checkTimeouts(roomId);
      scheduleBotActions(roomId);
    }
  });

  socket.on("leaveRoom", () => {
    if (disconnectTimeouts.has(uid)) {
      clearTimeout(disconnectTimeouts.get(uid)!);
      disconnectTimeouts.delete(uid);
    }
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.removePlayer(uid);
      userRooms.delete(uid);
      socket.leave(roomId);
      socket.emit("gameStateUpdate", null);
      // Delete the room if no human players remain (bots alone cannot sustain a room)
      if (!hasHumanPlayers(room)) {
        cleanupRoom(roomId);
      } else {
        room.state.actionCounter++;
        broadcastGameState(roomId);
        if (room.state.status === "PLAYING") {
          checkTimeouts(roomId);
          scheduleBotActions(roomId);
        }
      }
    }
  });

  socket.on("emote", (emoji) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    // Broadcast to everyone in the room
    io.to(roomId).emit("playerEmote", uid, emoji);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", uid);
    const sockets = userSockets.get(uid);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(uid);
      }
    }

    // If the user still has an active socket open (e.g. another tab or fast reconnect), don't schedule removal
    if (userSockets.has(uid) && userSockets.get(uid)!.size > 0) {
      return;
    }

    // Schedule removal with a 15-second grace period to allow refreshing or quick network reconnection
    if (disconnectTimeouts.has(uid)) {
      clearTimeout(disconnectTimeouts.get(uid)!);
    }

    const timeout = setTimeout(() => {
      disconnectTimeouts.delete(uid);
      const roomId = userRooms.get(uid);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.removePlayer(uid);
          userRooms.delete(uid);

          // Clear room if no human players remain (not including bots)
          if (!hasHumanPlayers(room)) {
            cleanupRoom(roomId);
          } else {
            room.state.actionCounter++;
            broadcastGameState(roomId);
            if (room.state.status === "PLAYING") {
              checkTimeouts(roomId);
              scheduleBotActions(roomId);
            }
          }
        } else {
          userRooms.delete(uid);
        }
      }
    }, 15000); // 15 seconds grace period
    disconnectTimeouts.set(uid, timeout);
  });
});

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
