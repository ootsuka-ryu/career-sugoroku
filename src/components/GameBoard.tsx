"use client";
import { useEffect, useRef } from "react";
import { BOARD_CELLS } from "@/data/board";

interface Props { displayPosition: number; }

const W = 1600;
const H = 900;
const CELL = 13;

// ── Cell positions: 5 rows × 13 = 65 cells, snake pattern ────────────────────
const ROW_Y   = [830, 665, 500, 335, 170];
const ROW_SX  = [1510, 195, 1510, 195, 1510];
const ROW_DX  = [-110,  110, -110,  110, -110];
const CELLS_PER_ROW = 13;

function buildCP(): readonly [number, number][] {
  const pts: [number, number][] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < CELLS_PER_ROW; col++) {
      pts.push([ROW_SX[row] + ROW_DX[row] * col, ROW_Y[row]]);
    }
  }
  return pts;
}
const CP = buildCP();

// Cell index → zone index
const C2Z: number[] = [
  ...Array(13).fill(4),
  ...Array(12).fill(3),
  ...Array(14).fill(2),
  ...Array(13).fill(1),
  ...Array(13).fill(0),
];

// ── Zone definitions ──────────────────────────────────────────────────────────
type Ico  = { e: string; x: number; y: number; s: number };
type Zone = {
  yTop: number; yBot: number;
  bright: string; mid: string; dark: string;
  borderCol: string;
  chapter: string; title: string; rgb: string;
  icons: Ico[];
};

const ZONES: Zone[] = [
  {
    yTop: 60, yBot: 252,
    bright:"#B02828", mid:"#882020", dark:"#601414",
    borderCol:"#E05050",
    chapter:"05", title:"店長・キャリア分岐編", rgb:"255,150,130",
    icons:[
      {e:"🏆", x:100, y:105, s:68},{e:"👔", x:290, y:70, s:56},
      {e:"🏬", x:480, y:82, s:72},{e:"🎯", x:680, y:68, s:58},
      {e:"🌟", x:870, y:110, s:62},{e:"🚗", x:1060, y:72, s:64},
      {e:"💼", x:1260, y:80, s:60},{e:"🎊", x:1430, y:105, s:66},
      {e:"🏅", x:180, y:130, s:44},{e:"📊", x:760, y:138, s:42},
      {e:"🏆", x:1150, y:132, s:46},
    ],
  },
  {
    yTop: 252, yBot: 418,
    bright:"#C07818", mid:"#985010", dark:"#602C08",
    borderCol:"#F09830",
    chapter:"04", title:"成長・挑戦編", rgb:"255,210,110",
    icons:[
      {e:"💡", x:102, y:375, s:66},{e:"🌍", x:310, y:258, s:64},
      {e:"📚", x:510, y:372, s:58},{e:"⚡", x:700, y:260, s:60},
      {e:"💻", x:900, y:374, s:62},{e:"🧠", x:1100, y:258, s:56},
      {e:"🔬", x:1300, y:372, s:62},{e:"🎓", x:1480, y:262, s:64},
      {e:"🔑", x:200, y:288, s:44},{e:"🌱", x:800, y:290, s:42},
      {e:"🏋️", x:1200, y:290, s:46},
    ],
  },
  {
    yTop: 418, yBot: 584,
    bright:"#207A38", mid:"#145228", dark:"#0C3018",
    borderCol:"#38C058",
    chapter:"03", title:"新入社員編", rgb:"120,255,160",
    icons:[
      {e:"🧑‍⚕️", x:90, y:540, s:70},{e:"🏥", x:290, y:426, s:68},
      {e:"💊", x:490, y:538, s:60},{e:"🩺", x:690, y:428, s:64},
      {e:"📋", x:890, y:540, s:60},{e:"🧪", x:1090, y:428, s:62},
      {e:"💉", x:1290, y:540, s:62},{e:"🌿", x:1490, y:430, s:64},
      {e:"🚑", x:190, y:460, s:46},{e:"🏃", x:780, y:458, s:44},
    ],
  },
  {
    yTop: 584, yBot: 750,
    bright:"#1060A8", mid:"#0C4080", dark:"#082858",
    borderCol:"#28A0E0",
    chapter:"02", title:"内定者期間編", rgb:"100,200,255",
    icons:[
      {e:"📚", x:100, y:706, s:66},{e:"🎓", x:300, y:592, s:66},
      {e:"✈️", x:500, y:704, s:62},{e:"🎉", x:700, y:594, s:66},
      {e:"🌸", x:900, y:706, s:62},{e:"📖", x:1100, y:594, s:60},
      {e:"💌", x:1300, y:706, s:64},{e:"🏠", x:1490, y:596, s:66},
      {e:"🗓️", x:200, y:628, s:44},{e:"🎵", x:800, y:628, s:44},
    ],
  },
  {
    yTop: 750, yBot: 900,
    bright:"#5828B0", mid:"#3C1888", dark:"#240E60",
    borderCol:"#9060E0",
    chapter:"01", title:"就活・選考編", rgb:"200,160,255",
    icons:[
      {e:"🏫", x:88,  y:780, s:58},{e:"😰", x:280, y:778, s:54},
      {e:"📝", x:480, y:782, s:56},{e:"🎙️", x:680, y:778, s:58},
      {e:"👔", x:880, y:780, s:56},{e:"💭", x:1080, y:778, s:58},
      {e:"💪", x:1280, y:780, s:56},{e:"✨", x:1480, y:780, s:60},
      {e:"👀", x:185, y:862, s:44},{e:"🌟", x:1380, y:862, s:44},
    ],
  },
];

// ── Road path ─────────────────────────────────────────────────────────────────
function pathShape(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(1510, 830);
  ctx.lineTo(195, 830);
  ctx.bezierCurveTo(80, 830, 80, 665, 195, 665);
  ctx.lineTo(1510, 665);
  ctx.bezierCurveTo(1570, 665, 1570, 500, 1510, 500);
  ctx.lineTo(195, 500);
  ctx.bezierCurveTo(80, 500, 80, 335, 195, 335);
  ctx.lineTo(1510, 335);
  ctx.bezierCurveTo(1570, 335, 1570, 170, 1510, 170);
  ctx.lineTo(195, 170);
}

// ── Branch fork decorations ───────────────────────────────────────────────────
function drawBranchFork(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: number) {
  ctx.save();
  ctx.setLineDash([8, 14]);
  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(255,220,60,0.42)";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx + dir*40, cy-60, cx + dir*100, cy-80, cx + dir*130, cy-40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(cx + dir*40, cy+60, cx + dir*100, cy+80, cx + dir*130, cy+40);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Rounded rect ──────────────────────────────────────────────────────────────
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y, x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h, x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h, x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y, x+r,y);
  ctx.closePath();
}

// ── 3D cell tile ──────────────────────────────────────────────────────────────
function drawCell3D(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  fill: string, border: string, glow: string | null,
  labelMain: string, labelSub: string,
  colMain: string, colSub: string,
) {
  const R = CELL;
  ctx.save();
  ctx.shadowBlur  = glow ? 22 : 4;
  ctx.shadowColor = glow ?? "rgba(0,0,0,0.50)";
  ctx.shadowOffsetX = glow ? 0 : 1;
  ctx.shadowOffsetY = glow ? 0 : 2;
  rr(ctx, cx-R, cy-R, R*2, R*2, 5);
  ctx.fillStyle = fill; ctx.fill();
  ctx.restore();

  ctx.save();
  rr(ctx, cx-R, cy-R, R*2, R*2, 5);
  ctx.clip();
  const bv = ctx.createLinearGradient(cx-R, cy-R, cx+R, cy+R);
  bv.addColorStop(0,    "rgba(255,255,255,0.26)");
  bv.addColorStop(0.35, "rgba(255,255,255,0.06)");
  bv.addColorStop(0.65, "rgba(0,0,0,0.04)");
  bv.addColorStop(1,    "rgba(0,0,0,0.22)");
  ctx.fillStyle = bv;
  ctx.fillRect(cx-R, cy-R, R*2, R*2);
  ctx.restore();

  rr(ctx, cx-R, cy-R, R*2, R*2, 5);
  ctx.strokeStyle = border;
  ctx.lineWidth = glow ? 1.8 : 1;
  ctx.stroke();

  ctx.textAlign = "center";
  if (labelMain) {
    ctx.save();
    if (glow) { ctx.shadowBlur = 8; ctx.shadowColor = glow; }
    ctx.fillStyle = colMain;
    ctx.font = `bold ${labelMain.length > 5 ? 5 : 6.5}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(labelMain, cx, cy - 2);
    ctx.restore();
  }
  if (labelSub) {
    ctx.fillStyle = colSub;
    ctx.font = "5px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(labelSub, cx, cy + 5);
    ctx.textBaseline = "alphabetic";
  }
}

// ── Event cards ───────────────────────────────────────────────────────────────
type Card = { x:number; y:number; w:number; h:number; title:string; emoji:string; bg:string };
const EVENT_CARDS: Card[] = [
  { x:580,  y:752, w:120, h:52, title:"エントリー開始！",   emoji:"📝", bg:"rgba(88,40,176,0.72)"  },
  { x:1050, y:756, w:118, h:50, title:"面接に合格！",       emoji:"🎉", bg:"rgba(88,40,176,0.72)"  },
  { x:310,  y:596, w:118, h:50, title:"国家試験合格！",     emoji:"🎓", bg:"rgba(16,64,168,0.74)"  },
  { x:850,  y:598, w:118, h:50, title:"内定研修スタート",   emoji:"✈️", bg:"rgba(16,64,168,0.74)"  },
  { x:1370, y:598, w:118, h:50, title:"入社前準備完了",     emoji:"🏠", bg:"rgba(16,64,168,0.74)"  },
  { x:580,  y:428, w:118, h:50, title:"服薬指導デビュー",   emoji:"💊", bg:"rgba(20,82,40,0.74)"   },
  { x:1100, y:430, w:120, h:50, title:"在宅医療同行！",     emoji:"🚑", bg:"rgba(20,82,40,0.74)"   },
  { x:310,  y:262, w:118, h:50, title:"資格取得チャンス",   emoji:"🏅", bg:"rgba(152,80,16,0.74)"  },
  { x:840,  y:264, w:120, h:50, title:"学会発表！",         emoji:"🎤", bg:"rgba(152,80,16,0.74)"  },
  { x:1370, y:264, w:118, h:50, title:"海外視察研修",       emoji:"🌍", bg:"rgba(152,80,16,0.74)"  },
  { x:580,  y:96,  w:118, h:50, title:"店長に就任！",       emoji:"👔", bg:"rgba(176,40,40,0.74)"  },
  { x:1050, y:96,  w:120, h:50, title:"本部プロジェクト",   emoji:"🚀", bg:"rgba(176,40,40,0.74)"  },
];

// ── Player piece ──────────────────────────────────────────────────────────────
function drawPiece(ctx: CanvasRenderingContext2D, px: number, py: number, bounce: number) {
  // bounce: 0-1, sin wave for subtle bob effect
  const bOff = Math.sin(bounce * Math.PI * 2) * 3;
  const pieceY = py - CELL - 22 + bOff;

  // Road shadow
  ctx.save();
  ctx.globalAlpha = 0.32;
  const se = ctx.createRadialGradient(px, py-CELL+3, 1, px, py-CELL+3, 16);
  se.addColorStop(0, "rgba(0,0,0,0.70)");
  se.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = se;
  ctx.scale(1, 0.35);
  ctx.beginPath();
  ctx.arc(px, (py-CELL+3)/0.35, 16, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // Outer aura
  ctx.save();
  ctx.shadowBlur = 36; ctx.shadowColor = "#FFE060";
  ctx.beginPath(); ctx.arc(px, pieceY, 18, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,224,64,0.18)"; ctx.fill();
  ctx.restore();

  // Body
  ctx.save();
  ctx.shadowBlur = 20; ctx.shadowColor = "#FFD040";
  ctx.beginPath(); ctx.arc(px, pieceY, 14, 0, Math.PI*2);
  ctx.fillStyle = "#FFD040"; ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();

  // Emoji
  ctx.font = "16px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🧑‍⚕️", px, pieceY);

  // Connecting pin
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.beginPath();
  ctx.moveTo(px-2, pieceY+14); ctx.lineTo(px+2, pieceY+14);
  ctx.lineTo(px+2, py-CELL);   ctx.lineTo(px-2, py-CELL);
  ctx.closePath();
  const pg = ctx.createLinearGradient(px, pieceY+14, px, py-CELL);
  pg.addColorStop(0, "#FFD040"); pg.addColorStop(1, "rgba(255,208,64,0)");
  ctx.fillStyle = pg; ctx.fill();
  ctx.restore();
}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, logicalPos: number, pieceX: number, pieceY: number, bounce: number) {
  ctx.clearRect(0, 0, W, H);

  // 1. Zone backgrounds
  for (let zi = 0; zi < ZONES.length; zi++) {
    const z = ZONES[zi];
    const h = z.yBot - z.yTop;

    const bg = ctx.createLinearGradient(0, z.yTop, 0, z.yBot);
    bg.addColorStop(0, z.bright); bg.addColorStop(0.5, z.mid); bg.addColorStop(1, z.dark);
    ctx.fillStyle = bg; ctx.fillRect(0, z.yTop, W, h);

    const my = z.yTop + h * 0.4;
    const rg = ctx.createRadialGradient(W*0.5, my, 0, W*0.5, my, W*0.55);
    rg.addColorStop(0, `rgba(${z.rgb},0.18)`); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, z.yTop, W, h);

    const vig = ctx.createRadialGradient(W/2, z.yTop+h*0.5, h*0.1, W/2, z.yTop+h*0.5, W*0.7);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vig; ctx.fillRect(0, z.yTop, W, h);

    if (zi > 0) {
      const ts = ctx.createLinearGradient(0, z.yTop, 0, z.yTop+30);
      ts.addColorStop(0, "rgba(0,0,0,0.40)"); ts.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ts; ctx.fillRect(0, z.yTop, W, 30);
    }

    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = "#fff";
    ctx.font = "bold 130px serif"; ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText(z.chapter, W-8, z.yTop+4);
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 5; ctx.shadowColor = "rgba(0,0,0,0.80)";
    ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`${z.chapter} ${z.title}`, 12, z.yTop+8);
    ctx.restore();

    ctx.strokeStyle = z.borderCol+"44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, z.yTop); ctx.lineTo(W, z.yTop); ctx.stroke();

    ctx.save();
    for (const ic of z.icons) {
      ctx.globalAlpha = 0.82;
      ctx.shadowBlur = 18; ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
      ctx.font = `${ic.s}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ic.e, ic.x, ic.y);
    }
    ctx.restore();
  }

  // 2. Event cards
  for (const card of EVENT_CARDS) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.60)";
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    rr(ctx, card.x, card.y, card.w, card.h, 6);
    ctx.fillStyle = card.bg; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 1;
    ctx.fillText(card.emoji, card.x+16, card.y+card.h/2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 9px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(card.title, card.x+30, card.y+card.h/2);
    ctx.restore();
  }

  // 3. Road
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  ctx.shadowBlur = 28; ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 90;
  pathShape(ctx); ctx.stroke(); ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(70,52,22,0.97)";  ctx.lineWidth = 78; pathShape(ctx); ctx.stroke();
  ctx.strokeStyle = "rgba(138,114,74,0.96)"; ctx.lineWidth = 70; pathShape(ctx); ctx.stroke();
  ctx.strokeStyle = "rgba(178,158,118,0.95)";ctx.lineWidth = 62; pathShape(ctx); ctx.stroke();
  ctx.strokeStyle = "rgba(222,208,174,0.97)";ctx.lineWidth = 55; pathShape(ctx); ctx.stroke();
  ctx.strokeStyle = "rgba(242,232,204,0.55)";ctx.lineWidth = 42; pathShape(ctx); ctx.stroke();
  ctx.strokeStyle = "rgba(230,218,190,0.65)";ctx.lineWidth = 30; pathShape(ctx); ctx.stroke();

  ctx.strokeStyle = "rgba(175,132,28,0.68)"; ctx.lineWidth = 2;
  ctx.setLineDash([12, 24]); pathShape(ctx); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 4. Branch fork visuals
  drawBranchFork(ctx, CP[10][0], CP[10][1], -1);
  drawBranchFork(ctx, CP[33][0], CP[33][1],  1);
  drawBranchFork(ctx, CP[52][0], CP[52][1], -1);

  // 5. Cells
  for (let i = 0; i < CP.length; i++) {
    const [cx, cy] = CP[i];
    const cell = BOARD_CELLS[i];
    const isCur    = i === logicalPos;
    const isPast   = i < logicalPos;
    const isBranch = cell.cellType === "branch";
    const isRest   = cell.cellType === "rest";
    const z = ZONES[C2Z[i]];

    let fill: string, border: string, glow: string | null = null;
    let colMain = "rgba(255,255,255,0.92)";
    let colSub  = "rgba(255,255,255,0.50)";

    if (isCur) {
      fill = "rgba(255,220,48,0.40)"; border = "#FFD040"; glow = "#FFD040"; colMain = "#FFE060";
    } else if (cell.isGoal) {
      fill = "rgba(255,220,48,0.28)"; border = "#FFD040"; glow = "#FFD040"; colMain = "#FFE060";
    } else if (isBranch) {
      fill = "rgba(255,200,40,0.25)"; border = "rgba(255,200,40,0.88)"; glow = "rgba(255,200,40,0.55)"; colMain = "#FFC828";
    } else if (isRest) {
      fill = "rgba(60,220,100,0.24)"; border = "rgba(60,220,100,0.84)"; glow = "rgba(60,220,100,0.50)"; colMain = "#3CDC68";
    } else if (isPast) {
      fill = "rgba(0,0,0,0.62)"; border = "rgba(255,255,255,0.10)";
      colMain = "rgba(255,255,255,0.28)"; colSub = "rgba(255,255,255,0.14)";
    } else if (cell.isStart) {
      fill = "rgba(255,220,48,0.32)"; border = "#FFD040"; glow = "#FFD040"; colMain = "#FFE060";
    } else {
      fill = z.dark + "e8"; border = z.borderCol + "70";
    }

    let labelMain = "";
    let labelSub  = "";
    if (cell.isStart)   { labelMain = "START"; }
    else if (cell.isGoal)   { labelMain = "🏁GOAL"; }
    else if (isBranch)  { labelMain = "⚡分岐"; }
    else if (isRest)    { labelMain = "★休憩"; }
    else {
      const h = cell.hint ?? "";
      labelMain = h.length > 5 ? h.slice(0,5) : h;
      labelSub  = String(i);
    }

    drawCell3D(ctx, cx, cy, fill, border, glow, labelMain, labelSub, colMain, colSub);
  }

  // 6. Player piece (at interpolated position)
  drawPiece(ctx, pieceX, pieceY, bounce);

  // 7. HUD
  ctx.save();
  ctx.globalAlpha = 0.84;
  rr(ctx, 10, 10, 148, 38, 6);
  ctx.fillStyle = "rgba(10,8,22,0.90)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,220,60,0.42)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,220,60,0.92)"; ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(`マス ${logicalPos} / 64`, 18, 22);
  ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.font = "8px sans-serif";
  ctx.fillText(BOARD_CELLS[logicalPos]?.hint ?? "", 18, 38);
  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GameBoard({ displayPosition }: Props) {
  const ref   = useRef<HTMLCanvasElement>(null);
  const rafId = useRef(0);

  // Animation state (mutable ref, not React state — updated every frame)
  const anim = useRef({
    fromX: CP[0][0], fromY: CP[0][1],
    toX:   CP[0][0], toY:   CP[0][1],
    t:     1.0,           // 0→1, eased progress from "from" to "to"
    logicalPos: 0,
    bounce: 0,            // continuous time for idle bob
  });

  // When displayPosition changes, record new target
  useEffect(() => {
    const s = anim.current;
    // Snap "from" to wherever the piece currently is
    const e = easeOut(Math.min(s.t, 1));
    s.fromX = s.fromX + (s.toX - s.fromX) * e;
    s.fromY = s.fromY + (s.toY - s.fromY) * e;
    // New target
    s.toX   = CP[displayPosition][0];
    s.toY   = CP[displayPosition][1];
    s.t     = 0;
    s.logicalPos = displayPosition;
  }, [displayPosition]);

  // Start RAF loop once on mount
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;

    const STEP_MS  = 180; // ms to travel one cell hop
    const IDLE_SPD = 0.5; // bounce cycles per second
    let   prevTime = performance.now();

    const loop = (now: number) => {
      const dt   = (now - prevTime) / 1000; // seconds
      prevTime   = now;
      const s    = anim.current;

      // Advance hop progress (dt is in seconds, STEP_MS in ms)
      s.t      = Math.min(1, s.t + (dt * 1000) / STEP_MS);
      s.bounce += dt * IDLE_SPD;

      const e  = easeOut(Math.min(s.t, 1));
      const px = s.fromX + (s.toX - s.fromX) * e;
      const py = s.fromY + (s.toY - s.fromY) * e;

      draw(ctx, s.logicalPos, px, py, s.bounce);
      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="薬剤師キャリアすごろくボード"
    />
  );
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3); // cubic ease-out
}
