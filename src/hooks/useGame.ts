import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { GameState, ClientToServerEvents, ServerToClientEvents } from "../shared/types";

export function useGame() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string>(() => localStorage.getItem("coup_uid") || "");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    let currentUid = localStorage.getItem("coup_uid");
    if (!currentUid) {
      currentUid = Math.random().toString(36).substring(2, 12);
      localStorage.setItem("coup_uid", currentUid);
    }
    setUid(currentUid);

    const s = io({
      transports: ["websocket"],
      reconnectionAttempts: Infinity,
      query: { uid: currentUid }
    });

    s.on("connect", () => {
      setSocket(s);
    });

    s.on("gameStateUpdate", (state) => {
      setGameState(state);
      setIsInitialized(true);
    });

    s.on("error", (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, gameState, error, uid, isInitialized };
}
