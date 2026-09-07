export type Role = "Duke" | "Assassin" | "Captain" | "Ambassador" | "Contessa" | "Inquisitor" | "Unknown";

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
  | "Exchange" // Ambassador draw 2, return 2; Inquisitor draw 1, return 1
  | "Examine"; // Inquisitor inspect 1 opponent card, decide return or force exchange

export type CounterActionType = 
  | "BlockForeignAid" // Duke
  | "BlockAssassination" // Contessa
  | "BlockSteal"; // Captain, Ambassador, or Inquisitor

export interface Player {
  id: string;
  name: string;
  coins: number;
  influences: Card[]; // cards in hand
  revealedInfluences: Card[]; // dead cards
  isReady: boolean;
  isAlive: boolean;
  isBot?: boolean;
}

export interface RoomSettings {
  timerEnabled: boolean;
  turnDuration: number; // in seconds, default 30
  roleSet?: "classic" | "inquisitor"; // classic = Ambassador, inquisitor = Inquisitor
}

export interface GameState {
  roomId: string;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  players: Player[];
  deck: Card[];
  turnIndex: number;
  turnCounter: number;
  actionCounter: number;
  winnerId?: string;
  // Complex action state
  currentAction: ActionState | null;
  logs: string[];
  settings: RoomSettings;
}

export interface ActionState {
  playerId: string;
  actionType: ActionType;
  targetId?: string | null;
  phase: "WAITING_FOR_CHALLENGE" | "WAITING_FOR_BLOCK" | "WAITING_FOR_BLOCK_CHALLENGE" | "EXCHANGING" | "EXAMINING" | "RESOLVING_ASSASSINATION" | "RESOLVING_COUP" | "RESOLVING_CHALLENGE_LOSS";
  passCount: number; // How many alive players have passed on challenging/blocking
  passedPlayerIds: string[]; // Specific player IDs who have already chosen to pass
  // Information about block
  blockerId?: string;
  claimedRole?: Role; // Role claimed for the action or block
  
  // Loss resolution
  losingPlayerId?: string; // Player who lost a challenge and must pick a card to lose
  nextStepAfterLoss?: "NEXT_TURN" | "RESOLVE_ACTION" | "WAITING_FOR_BLOCK";

  // Specific required states
  exchangeCards?: Card[]; // Cards drawn by ambassador or inquisitor
  examinedCard?: Card; // Card inspected by inquisitor
}

export interface RoomInfo {
  roomId: string;
  playersCount: number;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  settings?: RoomSettings;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// Server -> Client
export interface ServerToClientEvents {
  "gameStateUpdate": (gameState: GameState | null) => void;
  "error": (message: string) => void;
  "playerEmote": (playerId: string, emoji: string) => void;
  "availableRooms": (rooms: RoomInfo[]) => void;
  "chatHistory": (messages: ChatMessage[]) => void;
  "newChatMessage": (message: ChatMessage) => void;
}

// Client -> Server
export interface ClientToServerEvents {
  "joinRoom": (roomId: string, name: string, settings?: RoomSettings) => void;
  "updateSettings": (settings: RoomSettings) => void;
  "leaveRoom": () => void;
  "returnToLobby": () => void;
  "requestRooms": () => void;
  "toggleReady": () => void;
  "startGame": () => void;
  "emote": (emoji: string) => void;
  "sendChatMessage": (text: string) => void;
  "addBot": () => void;
  "removeBot": (botId: string) => void;
  
  "takeAction": (actionType: ActionType, targetId?: string) => void;
  "challengeAction": () => void;
  "passAction": () => void; // Pass on challenging the action
  
  "blockAction": (claimRole: Role) => void; // Duke, Contessa, Captain, Ambassador, Inquisitor
  "challengeBlock": () => void;
  "passBlock": () => void; // Pass on challenging the block
  
  "resolveReveal": (cardId: string) => void; // After losing an influence or losing a challenge
  "resolveExchange": (keptCardIds: string[]) => void;
  "resolveExamine": (decision: "keep" | "exchange") => void; // Inquisitor examine decision
}

