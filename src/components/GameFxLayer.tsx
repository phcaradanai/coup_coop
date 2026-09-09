import { useEffect, useRef } from "react";
import type { ActionState, GameState, Role } from "../shared/types";

type Point = { x: number; y: number };

type TransientFxKind =
  | "assassinSlash"
  | "stealRaid"
  | "fleetClash"
  | "dukeGate"
  | "contessaShield"
  | "caravanTravel"
  | "inquisitorHammer"
  | "influenceBreak"
  | "taxTransfer"
  | "foreignAid";

interface TransientFx {
  id: string;
  kind: TransientFxKind;
  startedAt: number;
  duration: number;
  actorId?: string;
  targetId?: string;
  blockerId?: string;
  role?: Role;
}

interface Props {
  gameState: GameState;
  enabled: boolean;
}

const BLOCK_STEAL_ROLES: Role[] = ["Captain", "Ambassador", "Inquisitor"];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(value: number) {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function mix(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function anchorForPlayer(playerId?: string): Point | null {
  if (!playerId) return null;
  const nodes = document.querySelectorAll<HTMLElement>("[data-fx-player-id]");
  for (const node of nodes) {
    if (node.dataset.fxPlayerId === playerId) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }
  }
  return null;
}

function fallbackAnchor(playerId: string | undefined, state: GameState): Point {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const index = state.players.findIndex((player) => player.id === playerId);
  const safeIndex = Math.max(0, index);
  const cols = Math.min(3, Math.max(1, state.players.length));
  const col = safeIndex % cols;
  const row = Math.floor(safeIndex / cols);
  return {
    x: width * (0.2 + (col / Math.max(1, cols - 1)) * 0.55),
    y: height * (0.25 + row * 0.22),
  };
}

function getAnchor(playerId: string | undefined, state: GameState): Point {
  return anchorForPlayer(playerId) ?? fallbackAnchor(playerId, state);
}

function setStroke(ctx: CanvasRenderingContext2D, color: string, width = 2, blur = 12) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function setFill(ctx: CanvasRenderingContext2D, color: string, blur = 12) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  point: Point,
  angle: number,
  scale: number,
  color: string,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  setStroke(ctx, color, 1.8, 10);
  setFill(ctx, color, 8);

  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-11, -8);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-11, 8);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-13, -2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.lineTo(-16, 8);
  ctx.lineTo(-13, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D, point: Point, radius: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  setStroke(ctx, "#fbbf24", 2, 10);
  setFill(ctx, "rgba(251,191,36,0.18)", 8);
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - radius * 0.55);
  ctx.lineTo(point.x, point.y + radius * 0.55);
  ctx.stroke();
  ctx.restore();
}

function drawAssassinMark(ctx: CanvasRenderingContext2D, target: Point, now: number) {
  const pulse = 1 + Math.sin(now / 160) * 0.08;
  const radius = 33 * pulse;
  ctx.save();
  ctx.globalAlpha = 0.82;
  setStroke(ctx, "#ef4444", 2, 18);
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const [dx, dy] of [
    [0, -48],
    [48, 0],
    [0, 48],
    [-48, 0],
  ]) {
    ctx.beginPath();
    ctx.moveTo(target.x + dx * 0.72, target.y + dy * 0.72);
    ctx.lineTo(target.x + dx, target.y + dy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFleetStaging(ctx: CanvasRenderingContext2D, actor: Point, target: Point, now: number) {
  const angle = Math.atan2(target.y - actor.y, target.x - actor.x);
  const drift = Math.sin(now / 220) * 4;
  const offsets = [-18, 0, 18];
  offsets.forEach((offset, index) => {
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    const point = {
      x: actor.x + Math.cos(angle) * (32 + index * 7 + drift) + normal.x * offset,
      y: actor.y + Math.sin(angle) * (32 + index * 7 + drift) + normal.y * offset,
    };
    drawShip(ctx, point, angle, 0.8, "#38bdf8", 0.82);
  });

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.setLineDash([5, 9]);
  setStroke(ctx, "#38bdf8", 1.5, 5);
  ctx.beginPath();
  ctx.moveTo(actor.x, actor.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.restore();
}

function drawCaravanStaging(ctx: CanvasRenderingContext2D, actor: Point, now: number) {
  const phase = now / 420;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const x = actor.x - 30 + i * 30;
    const y = actor.y + 42 + Math.sin(phase + i) * 4;
    setStroke(ctx, "#22d3ee", 1.5, 8);
    ctx.strokeRect(x - 9, y - 6, 18, 12);
    ctx.beginPath();
    ctx.arc(x - 5, y + 8, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 5, y + 8, 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTribunal(ctx: CanvasRenderingContext2D, actor: Point, target: Point, now: number) {
  const center = midpoint(actor, target);
  const pulse = 0.75 + Math.sin(now / 180) * 0.12;
  ctx.save();
  ctx.globalAlpha = pulse;
  setStroke(ctx, "#a78bfa", 2, 14);
  ctx.beginPath();
  ctx.moveTo(center.x - 30, center.y + 26);
  ctx.lineTo(center.x - 30, center.y - 8);
  ctx.quadraticCurveTo(center.x, center.y - 42, center.x + 30, center.y - 8);
  ctx.lineTo(center.x + 30, center.y + 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center.x - 40, center.y + 26);
  ctx.lineTo(center.x + 40, center.y + 26);
  ctx.stroke();
  ctx.restore();
}

function drawForeignAidBeacon(ctx: CanvasRenderingContext2D, actor: Point, now: number) {
  const radius = 18 + (Math.sin(now / 180) + 1) * 5;
  ctx.save();
  ctx.globalAlpha = 0.6;
  setStroke(ctx, "#60a5fa", 2, 10);
  ctx.beginPath();
  ctx.arc(actor.x, actor.y - 44, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(actor.x - 18, actor.y - 44);
  ctx.lineTo(actor.x + 18, actor.y - 44);
  ctx.moveTo(actor.x, actor.y - 62);
  ctx.lineTo(actor.x, actor.y - 26);
  ctx.stroke();
  ctx.restore();
}

function drawTaxSeal(ctx: CanvasRenderingContext2D, actor: Point, now: number) {
  const rotation = now / 900;
  ctx.save();
  ctx.translate(actor.x, actor.y - 44);
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.58;
  setStroke(ctx, "#f59e0b", 2, 10);
  ctx.strokeRect(-18, -18, 36, 36);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-13, -13, 26, 26);
  ctx.restore();
}

function drawPersistentAction(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  action: ActionState | null,
  now: number,
) {
  if (!action) return;
  const actor = getAnchor(action.playerId, state);
  const target = getAnchor(action.targetId ?? undefined, state);

  if (action.actionType === "Assassinate" && action.targetId && action.phase !== "RESOLVING_ASSASSINATION") {
    drawAssassinMark(ctx, target, now);
  }

  if (
    action.actionType === "Steal" &&
    action.targetId &&
    (action.phase === "WAITING_FOR_CHALLENGE" || action.phase === "WAITING_FOR_BLOCK")
  ) {
    drawFleetStaging(ctx, actor, target, now);
  }

  if (action.actionType === "Exchange" && action.phase === "WAITING_FOR_CHALLENGE") {
    drawCaravanStaging(ctx, actor, now);
  }

  if (action.actionType === "Examine" && action.targetId && action.phase === "WAITING_FOR_CHALLENGE") {
    drawTribunal(ctx, actor, target, now);
  }

  if (action.actionType === "ForeignAid" && action.phase === "WAITING_FOR_BLOCK") {
    drawForeignAidBeacon(ctx, actor, now);
  }

  if (action.actionType === "Tax" && action.phase === "WAITING_FOR_CHALLENGE") {
    drawTaxSeal(ctx, actor, now);
  }
}

function drawSlash(ctx: CanvasRenderingContext2D, target: Point, progress: number) {
  const t = easeOutCubic(progress);
  const alpha = 1 - clamp01((progress - 0.45) / 0.55);
  const length = 95 * t;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  setStroke(ctx, "#e879f9", 5, 24);
  ctx.beginPath();
  ctx.moveTo(target.x - length, target.y - length * 0.55);
  ctx.lineTo(target.x + length, target.y + length * 0.55);
  ctx.stroke();
  setStroke(ctx, "#ffffff", 1.5, 10);
  ctx.beginPath();
  ctx.moveTo(target.x + length * 0.72, target.y - length * 0.72);
  ctx.lineTo(target.x - length * 0.72, target.y + length * 0.72);
  ctx.stroke();
  ctx.restore();
}

function drawStealRaid(ctx: CanvasRenderingContext2D, actor: Point, target: Point, progress: number) {
  const t = easeInOutCubic(progress);
  const angle = Math.atan2(target.y - actor.y, target.x - actor.x);
  const current = mix(actor, target, Math.min(1, t * 1.12));
  [-14, 0, 14].forEach((offset, index) => {
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    drawShip(
      ctx,
      { x: current.x + normal.x * offset - Math.cos(angle) * index * 8, y: current.y + normal.y * offset - Math.sin(angle) * index * 8 },
      angle,
      0.95,
      "#38bdf8",
      1 - clamp01((progress - 0.82) / 0.18),
    );
  });

  if (progress > 0.55) {
    const coinProgress = clamp01((progress - 0.55) / 0.45);
    for (let i = 0; i < 2; i++) {
      const p = mix(target, actor, clamp01(coinProgress - i * 0.12));
      drawCoin(ctx, { x: p.x, y: p.y - 10 - i * 8 }, 7, 1 - coinProgress * 0.4);
    }
  }
}

function drawFleetClash(
  ctx: CanvasRenderingContext2D,
  actor: Point,
  blocker: Point,
  progress: number,
  role?: Role,
) {
  const center = midpoint(actor, blocker);
  const t = easeInOutCubic(Math.min(1, progress * 1.25));
  const left = mix(actor, center, t);
  const right = mix(blocker, center, t);
  const angleA = Math.atan2(center.y - actor.y, center.x - actor.x);
  const angleB = Math.atan2(center.y - blocker.y, center.x - blocker.x);
  const defenderColor = role === "Ambassador" ? "#2dd4bf" : role === "Inquisitor" ? "#a78bfa" : "#f59e0b";

  [-11, 11].forEach((offset) => {
    drawShip(ctx, { x: left.x, y: left.y + offset }, angleA, 0.9, "#38bdf8", 0.95);
    drawShip(ctx, { x: right.x, y: right.y + offset }, angleB, 0.9, defenderColor, 0.95);
  });

  if (progress > 0.48) {
    const spark = clamp01((progress - 0.48) / 0.35);
    ctx.save();
    ctx.globalAlpha = 1 - spark * 0.45;
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + progress * 4;
      const length = 12 + spark * 32;
      setStroke(ctx, i % 2 === 0 ? "#ffffff" : defenderColor, 1.5, 10);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + Math.cos(angle) * length, center.y + Math.sin(angle) * length);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawDukeGate(ctx: CanvasRenderingContext2D, actor: Point, blocker: Point, progress: number) {
  const direction = Math.atan2(actor.y - blocker.y, actor.x - blocker.x);
  const gate = mix(blocker, actor, 0.7);
  const approach = mix(blocker, gate, Math.min(0.92, easeOutCubic(progress)));
  drawShip(ctx, approach, direction, 1, "#60a5fa", 0.9);

  const rise = easeOutCubic(Math.min(1, progress * 1.5));
  ctx.save();
  ctx.globalAlpha = 0.9;
  setStroke(ctx, "#f59e0b", 3, 16);
  const half = 34;
  const height = 54 * rise;
  ctx.beginPath();
  ctx.moveTo(gate.x - half, gate.y + 24);
  ctx.lineTo(gate.x - half, gate.y + 24 - height);
  ctx.moveTo(gate.x + half, gate.y + 24);
  ctx.lineTo(gate.x + half, gate.y + 24 - height);
  ctx.moveTo(gate.x - half, gate.y + 24 - height);
  ctx.lineTo(gate.x + half, gate.y + 24 - height);
  ctx.stroke();
  for (let x = -24; x <= 24; x += 12) {
    ctx.beginPath();
    ctx.moveTo(gate.x + x, gate.y + 24);
    ctx.lineTo(gate.x + x, gate.y + 24 - height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, target: Point, progress: number) {
  const t = easeOutCubic(Math.min(1, progress * 1.8));
  const alpha = 1 - clamp01((progress - 0.68) / 0.32) * 0.55;
  ctx.save();
  ctx.globalAlpha = alpha;
  setStroke(ctx, "#fb7185", 3, 20);
  ctx.beginPath();
  ctx.arc(target.x, target.y, 48 * t, Math.PI, 0);
  ctx.lineTo(target.x + 48 * t, target.y + 18);
  ctx.quadraticCurveTo(target.x, target.y + 48, target.x - 48 * t, target.y + 18);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawCaravanTravel(ctx: CanvasRenderingContext2D, actor: Point, target: Point, progress: number) {
  const t = easeInOutCubic(progress);
  const start = target;
  const end = actor;
  for (let i = 0; i < 3; i++) {
    const delayed = clamp01(t - i * 0.08);
    const point = mix(start, end, delayed);
    ctx.save();
    ctx.globalAlpha = 0.92 - i * 0.12;
    setStroke(ctx, "#22d3ee", 1.8, 10);
    ctx.strokeRect(point.x - 10, point.y - 7, 20, 14);
    ctx.beginPath();
    ctx.arc(point.x - 6, point.y + 9, 2.5, 0, Math.PI * 2);
    ctx.arc(point.x + 6, point.y + 9, 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHammer(ctx: CanvasRenderingContext2D, target: Point, progress: number) {
  const t = easeOutCubic(Math.min(1, progress * 1.5));
  const rotation = -1.05 + t * 1.15;
  ctx.save();
  ctx.translate(target.x, target.y - 18);
  ctx.rotate(rotation);
  ctx.globalAlpha = 1 - clamp01((progress - 0.78) / 0.22) * 0.7;
  setStroke(ctx, "#c4b5fd", 4, 18);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(42, 42);
  ctx.stroke();
  setFill(ctx, "#a78bfa", 14);
  ctx.fillRect(-13, -9, 34, 18);
  ctx.restore();

  if (progress > 0.55) {
    const impact = clamp01((progress - 0.55) / 0.45);
    ctx.save();
    ctx.globalAlpha = 1 - impact;
    setStroke(ctx, "#ffffff", 2, 12);
    ctx.beginPath();
    ctx.arc(target.x, target.y + 16, 12 + impact * 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawInfluenceBreak(ctx: CanvasRenderingContext2D, target: Point, progress: number) {
  const approach = easeOutCubic(Math.min(1, progress / 0.52));
  const fadeOut = 1 - clamp01((progress - 0.66) / 0.34);
  const tip = {
    x: target.x,
    y: target.y - 82 + approach * 76,
  };

  ctx.save();
  ctx.globalAlpha = fadeOut;
  setStroke(ctx, "#f8fafc", 3, 18);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x, tip.y - 58);
  ctx.stroke();
  setStroke(ctx, "#ef4444", 7, 26);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y - 8);
  ctx.lineTo(tip.x, tip.y - 42);
  ctx.stroke();
  setFill(ctx, "#f87171", 16);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y + 8);
  ctx.lineTo(tip.x - 9, tip.y - 12);
  ctx.lineTo(tip.x + 9, tip.y - 12);
  ctx.closePath();
  ctx.fill();

  if (progress > 0.42) {
    const impact = clamp01((progress - 0.42) / 0.42);
    ctx.globalAlpha = 1 - impact;
    setStroke(ctx, "#fecaca", 2, 16);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 12 + impact * 42, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoinTransfer(ctx: CanvasRenderingContext2D, target: Point, progress: number, count: number) {
  const origin = { x: window.innerWidth * 0.5, y: 52 };
  for (let i = 0; i < count; i++) {
    const delayed = clamp01(progress * 1.25 - i * 0.12);
    const t = easeInOutCubic(delayed);
    const base = mix(origin, target, t);
    const arc = Math.sin(Math.PI * t) * (45 + i * 9);
    drawCoin(ctx, { x: base.x, y: base.y - arc }, 8, clamp01(delayed * 1.4));
  }
}

function drawTransient(ctx: CanvasRenderingContext2D, state: GameState, fx: TransientFx, now: number) {
  const progress = clamp01((now - fx.startedAt) / fx.duration);
  const actor = getAnchor(fx.actorId, state);
  const target = getAnchor(fx.targetId, state);
  const blocker = getAnchor(fx.blockerId, state);

  switch (fx.kind) {
    case "assassinSlash":
      drawSlash(ctx, target, progress);
      break;
    case "stealRaid":
      drawStealRaid(ctx, actor, target, progress);
      break;
    case "fleetClash":
      drawFleetClash(ctx, actor, blocker, progress, fx.role);
      break;
    case "dukeGate":
      drawDukeGate(ctx, actor, blocker, progress);
      break;
    case "contessaShield":
      drawShield(ctx, target, progress);
      break;
    case "caravanTravel":
      drawCaravanTravel(ctx, actor, target, progress);
      break;
    case "inquisitorHammer":
      drawHammer(ctx, target, progress);
      break;
    case "influenceBreak":
      drawInfluenceBreak(ctx, target, progress);
      break;
    case "taxTransfer":
      drawCoinTransfer(ctx, actor, progress, 3);
      break;
    case "foreignAid":
      drawCoinTransfer(ctx, actor, progress, 2);
      break;
  }
}

function latestLog(state: GameState) {
  return state.logs[state.logs.length - 1] ?? "";
}

function hasPersistentFx(action: ActionState | null) {
  if (!action) return false;
  if (action.actionType === "Assassinate" && action.phase !== "RESOLVING_ASSASSINATION") return true;
  if (action.actionType === "Steal" && (action.phase === "WAITING_FOR_CHALLENGE" || action.phase === "WAITING_FOR_BLOCK")) return true;
  if (action.actionType === "Exchange" && action.phase === "WAITING_FOR_CHALLENGE") return true;
  if (action.actionType === "Examine" && action.phase === "WAITING_FOR_CHALLENGE") return true;
  if (action.actionType === "ForeignAid" && action.phase === "WAITING_FOR_BLOCK") return true;
  if (action.actionType === "Tax" && action.phase === "WAITING_FOR_CHALLENGE") return true;
  return false;
}

export default function GameFxLayer({ gameState, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousStateRef = useRef<GameState | null>(null);
  const currentStateRef = useRef(gameState);
  const transientFxRef = useRef<TransientFx[]>([]);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  const ensureAnimationLoop = () => {
    if (!enabled || rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(renderFrame);
  };

  const enqueue = (fx: Omit<TransientFx, "id" | "startedAt">) => {
    if (!enabled) return;
    transientFxRef.current.push({
      ...fx,
      id: `${fx.kind}-${performance.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startedAt: performance.now(),
    });
    ensureAnimationLoop();
  };

  const renderFrame = (now: number) => {
    rafRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);

    const state = currentStateRef.current;
    if (!reducedMotionRef.current) {
      drawPersistentAction(ctx, state, state.currentAction, now);
    }

    transientFxRef.current = transientFxRef.current.filter((fx) => now - fx.startedAt < fx.duration);
    for (const fx of transientFxRef.current) {
      drawTransient(ctx, state, fx, now);
    }

    if (transientFxRef.current.length > 0 || (!reducedMotionRef.current && hasPersistentFx(state.currentAction))) {
      rafRef.current = requestAnimationFrame(renderFrame);
    }
  };

  useEffect(() => {
    currentStateRef.current = gameState;
    const previous = previousStateRef.current;
    const currentAction = gameState.currentAction;
    const previousAction = previous?.currentAction ?? null;

    if (enabled && previous) {
      const log = latestLog(gameState);

      if (
        currentAction?.actionType === "Assassinate" &&
        currentAction.phase === "RESOLVING_ASSASSINATION" &&
        previousAction?.phase !== "RESOLVING_ASSASSINATION"
      ) {
        enqueue({
          kind: "assassinSlash",
          duration: 720,
          actorId: currentAction.playerId,
          targetId: currentAction.targetId ?? undefined,
        });
      }

      if (previousAction?.actionType === "Steal" && !currentAction && log.includes("ขโมย")) {
        enqueue({
          kind: "stealRaid",
          duration: 1050,
          actorId: previousAction.playerId,
          targetId: previousAction.targetId ?? undefined,
        });
      }

      if (
        currentAction?.phase === "WAITING_FOR_BLOCK_CHALLENGE" &&
        previousAction?.phase !== "WAITING_FOR_BLOCK_CHALLENGE"
      ) {
        if (currentAction.actionType === "Steal" && BLOCK_STEAL_ROLES.includes(currentAction.claimedRole ?? "Unknown")) {
          enqueue({
            kind: "fleetClash",
            duration: 1050,
            actorId: currentAction.playerId,
            blockerId: currentAction.blockerId,
            role: currentAction.claimedRole,
          });
        } else if (currentAction.actionType === "ForeignAid" && currentAction.claimedRole === "Duke") {
          enqueue({
            kind: "dukeGate",
            duration: 1250,
            actorId: currentAction.playerId,
            blockerId: currentAction.blockerId,
          });
        } else if (currentAction.actionType === "Assassinate" && currentAction.claimedRole === "Contessa") {
          enqueue({
            kind: "contessaShield",
            duration: 1100,
            targetId: currentAction.targetId ?? currentAction.blockerId,
          });
        }
      }

      if (currentAction?.actionType === "Exchange" && currentAction.phase === "EXCHANGING" && previousAction?.phase !== "EXCHANGING") {
        const deckPointId = gameState.players.find((player) => player.id !== currentAction.playerId)?.id;
        enqueue({
          kind: "caravanTravel",
          duration: 1150,
          actorId: currentAction.playerId,
          targetId: deckPointId,
        });
      }

      if (currentAction?.actionType === "Examine" && currentAction.phase === "EXAMINING" && previousAction?.phase !== "EXAMINING") {
        enqueue({
          kind: "inquisitorHammer",
          duration: 860,
          actorId: currentAction.playerId,
          targetId: currentAction.targetId ?? undefined,
        });
      }

      if (previousAction?.actionType === "Examine" && previousAction.phase === "EXAMINING" && !currentAction && (log.includes("จั่วใหม่") || log.includes("สับเข้ากองกลาง"))) {
        enqueue({
          kind: "caravanTravel",
          duration: 1150,
          actorId: previousAction.targetId ?? undefined,
          targetId: previousAction.playerId,
        });
      }

      if (previousAction?.actionType === "Tax" && !currentAction && log.includes("เก็บภาษีสำเร็จ")) {
        enqueue({ kind: "taxTransfer", duration: 900, actorId: previousAction.playerId });
      }

      if (previousAction?.actionType === "ForeignAid" && !currentAction && log.includes("ได้รับเงินสนับสนุน")) {
        enqueue({ kind: "foreignAid", duration: 900, actorId: previousAction.playerId });
      }

      for (const player of gameState.players) {
        const oldPlayer = previous.players.find((candidate) => candidate.id === player.id);
        if (oldPlayer && player.revealedInfluences.length > oldPlayer.revealedInfluences.length) {
          enqueue({ kind: "influenceBreak", duration: 820, targetId: player.id });
        }
      }
    }

    previousStateRef.current = gameState;
    if (enabled && hasPersistentFx(gameState.currentAction)) ensureAnimationLoop();
  }, [gameState, enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (enabled && (transientFxRef.current.length > 0 || hasPersistentFx(currentStateRef.current.currentAction))) {
        ensureAnimationLoop();
      }
    };

    reducedMotionRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      transientFxRef.current = [];
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[55] pointer-events-none"
    />
  );
}
