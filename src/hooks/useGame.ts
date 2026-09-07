import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { GameState, ClientToServerEvents, ServerToClientEvents } from "../shared/types";

export function useGame() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let uid = localStorage.getItem("coup_uid");
    if (!uid) {
      uid = Math.random().toString(36).substring(2, 12);
      localStorage.setItem("coup_uid", uid);
    }

    const s = io({
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      query: { uid }
    });

    s.on("connect", () => {
      setSocket(s);
    });

    s.on("gameStateUpdate", (state) => {
      setGameState(state);
    });

    s.on("error", (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, gameState, error };
}
