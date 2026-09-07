import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { GameRoom } from "./src/server/game";
import { ActionType, ClientToServerEvents, Role, ServerToClientEvents } from "./src/shared/types";

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, {}>(server);

// In-memory store for rooms
const rooms = new Map<string, GameRoom>();
const userRooms = new Map<string, string>(); // uid -> roomId

const turnTimeouts = new Map<string, NodeJS.Timeout>();

function checkTimeouts(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (turnTimeouts.has(roomId)) {
    clearTimeout(turnTimeouts.get(roomId)!);
    turnTimeouts.delete(roomId);
  }

  if (room.state.status === "PLAYING" && room.state.currentAction === null) {
    const startCounter = room.state.turnCounter;
    
    const timeout = setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (currentRoom && currentRoom.state.status === "PLAYING" && currentRoom.state.currentAction === null && currentRoom.state.turnCounter === startCounter) {
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
          io.to(roomId).emit("gameStateUpdate", currentRoom.state);
          checkTimeouts(roomId);
        }
      }
    }, 30000);
    turnTimeouts.set(roomId, timeout);
  }
}

io.on("connection", (socket) => {
  const uid = socket.handshake.query.uid as string || socket.id;
  console.log("Client connected", uid);

  // If a user reconnects, check if they are in a room
  const existingRoomId = userRooms.get(uid);
  if (existingRoomId) {
    socket.join(existingRoomId);
    const room = rooms.get(existingRoomId);
    if (room && room.state.players.find(p => p.id === uid)) {
       socket.emit("gameStateUpdate", room.state);
    } else {
       // Stale room
       userRooms.delete(uid);
    }
  }

  socket.on("requestRooms", () => {
    const availableRooms = Array.from(rooms.values()).map(r => ({
      roomId: r.state.roomId,
      playersCount: r.state.players.length,
      status: r.state.status
    }));
    socket.emit("availableRooms", availableRooms);
  });

  socket.on("joinRoom", (roomId, name) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = new GameRoom(roomId);
      rooms.set(roomId, room);
    }
    
    // Check if player is already in this room (rejoin)
    const existingPlayer = room.getPlayer(uid);
    if (existingPlayer) {
      socket.join(roomId);
      userRooms.set(uid, roomId);
      existingPlayer.name = name; // Update name just in case
      io.to(roomId).emit("gameStateUpdate", room.state);
      return;
    }

    if (room.addPlayer(uid, name)) {
      socket.join(roomId);
      userRooms.set(uid, roomId);
      io.to(roomId).emit("gameStateUpdate", room.state);
    } else {
      socket.emit("error", "Cannot join room. Game in progress or full.");
    }
  });

  socket.on("startGame", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      if (room.startGame()) {
        io.to(roomId).emit("gameStateUpdate", room.state);
        checkTimeouts(roomId);
      }
    }
  });

  socket.on("returnToLobby", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      if (room.returnToLobby()) {
        io.to(roomId).emit("gameStateUpdate", room.state);
      }
    }
  });

  socket.on("takeAction", (actionType, targetId) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.takeAction(uid, actionType, targetId)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("challengeAction", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.challengeAction(uid)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("passAction", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.passAction(uid)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("blockAction", (claimRole) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.blockAction(uid, claimRole)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("challengeBlock", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.challengeBlock(uid)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("passBlock", () => {
    // Treat passBlock same as passAction (they share logic structurally)
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.passAction(uid)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("resolveReveal", (cardId) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.resolveReveal(uid, cardId)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("resolveExchange", (keptCardIds) => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room && room.resolveExchange(uid, keptCardIds)) {
      io.to(roomId).emit("gameStateUpdate", room.state);
      checkTimeouts(roomId);
    }
  });

  socket.on("leaveRoom", () => {
    const roomId = userRooms.get(uid);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.removePlayer(uid);
      userRooms.delete(uid);
      socket.leave(roomId);
      socket.emit("gameStateUpdate", null);
      if (room.state.players.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit("gameStateUpdate", room.state);
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
    // Remove the explicit leave-on-disconnect behavior to allow rejoins.
    // In a production app, we would use a timeout or heartbeat before removing players.
    // But for this prototype, we'll let them stay in the state.
    // Optionally, if the room is still in LOBBY phase, it's safe to remove them:
    const roomId = userRooms.get(uid);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room && room.state.status === "LOBBY") {
        room.removePlayer(uid);
        userRooms.delete(uid);
        if (room.state.players.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit("gameStateUpdate", room.state);
        }
      }
    }
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
