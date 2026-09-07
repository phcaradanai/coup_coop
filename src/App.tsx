import { useState, useEffect } from "react";
import { useGame } from "./hooks/useGame";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import Game from "./components/Game";
import { audioFeedback } from "./utils/audio";

export default function App() {
  const { socket, gameState, error } = useGame();
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (error) {
      audioFeedback.init();
      audioFeedback.playError();
    }
  }, [error]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      audioFeedback.init();
      document.removeEventListener("click", handleFirstInteraction);
    };
    document.addEventListener("click", handleFirstInteraction);
    return () => document.removeEventListener("click", handleFirstInteraction);
  }, []);

  if (!socket) {
    return <div className="flex h-screen items-center justify-center bg-zinc-900 text-white font-sans">Connecting to server...</div>;
  }

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden flex flex-col relative font-medium">
      {/* Deep Atmospheric Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,24,24,0.15),rgba(24,24,27,0))]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-amber-900/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[100px] rounded-full mix-blend-screen"></div>
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
      </div>

      <div className="w-full h-full flex flex-col items-center z-10 relative">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded shadow-2xl z-50">
            {error}
          </div>
        )}

        {!gameState || gameState.status === "LOBBY" && !gameState.players.find(p => p.id === localStorage.getItem("coup_uid")) ? (
          <Home socket={socket} onJoin={(name) => setPlayerName(name)} />
        ) : gameState.status === "LOBBY" ? (
          <Lobby socket={socket} gameState={gameState} playerName={playerName} />
        ) : (
          <Game socket={socket} gameState={gameState} playerName={playerName} />
        )}
      </div>
    </div>
  );
}
