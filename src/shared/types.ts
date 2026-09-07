export type Role = "Duke" | "Assassin" | "Captain" | "Ambassador" | "Contessa";

export interface Card {
  id: string; // unique id per card instance
  role: Role;
}

export type ActionType = 
  // Standard Actions
  | "Income" // +1 coin
  | "ForeignAid" // +2 coins
  | "Coup" // -7 coins, -1 influence target
  | "Tax" // Duke +3 coins
  | "Assassinate" // Assassin -3 coins, -1 influence target
  | "Steal" // Captain steal 2 coins
  | "Exchange"; // Ambassador draw 2, return 2

export type CounterActionType = 
  | "BlockForeignAid" // Duke
  | "BlockAssassination" // Contessa
  | "BlockSteal"; // Captain or Ambassador

export interface Player {
  id: string;
  name: string;
  coins: number;
  influences: Card[]; // cards in hand
  revealedInfluences: Card[]; // dead cards
  isReady: boolean;
  isAlive: boolean;
}

export interface GameState {
  roomId: string;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  players: Player[];
  deck: Card[];
  turnIndex: number;
  turnCounter: number;
  winnerId?: string;
  // Complex action state
  currentAction: ActionState | null;
  logs: string[];
}

export interface ActionState {
  playerId: string;
  actionType: ActionType;
  targetId?: string | null;
  phase: "WAITING_FOR_CHALLENGE" | "WAITING_FOR_BLOCK" | "WAITING_FOR_BLOCK_CHALLENGE" | "EXCHANGING" | "RESOLVING_ASSASSINATION" | "RESOLVING_COUP";
  passCount: number; // How many alive players have passed on challenging/blocking
  // Information about block
  blockerId?: string;
  claimedRole?: Role; // Role claimed for the action or block
  
  // Specific required states
  exchangeCards?: Card[]; // Cards drawn by ambassador
}

export interface RoomInfo {
  roomId: string;
  playersCount: number;
  status: "LOBBY" | "PLAYING" | "FINISHED";
}

// Server -> Client
export interface ServerToClientEvents {
  "gameStateUpdate": (gameState: GameState | null) => void;
  "error": (message: string) => void;
  "playerEmote": (playerId: string, emoji: string) => void;
  "availableRooms": (rooms: RoomInfo[]) => void;
}

// Client -> Server
export interface ClientToServerEvents {
  "joinRoom": (roomId: string, name: string) => void;
  "leaveRoom": () => void;
  "returnToLobby": () => void;
  "requestRooms": () => void;
  "toggleReady": () => void;
  "startGame": () => void;
  "emote": (emoji: string) => void;
  
  "takeAction": (actionType: ActionType, targetId?: string) => void;
  "challengeAction": () => void;
  "passAction": () => void; // Pass on challenging the action
  
  "blockAction": (claimRole: Role) => void; // Duke, Contessa, Captain, Ambassador
  "challengeBlock": () => void;
  "passBlock": () => void; // Pass on challenging the block
  
  "resolveReveal": (cardId: string) => void; // After losing an influence or losing a challenge
  "resolveExchange": (keptCardIds: string[]) => void;
}
