"use client";
import { BOARD_CELLS } from "@/data/board";

interface Props { displayPosition: number; }

type El = { e: string; x: number; y: number; s: number; o?: number };

/**
 * 人生ゲーム風デザイン方針:
 * - ゾーン全体が「世界」。セルはその世界を貫く「道」。
 * - イラスト面積を大きく確保（190px）し、絵文字をシーンとして構成
 * - bgScene: 超大型の雰囲気要素（低透過、世界観を出す）
 * - fgScene: 物語の登場人物・物（大きく、高不透過）
 * - セルは世界の底辺を流れる「道路」として配置
 */
const ZONES = [
  {
    chapter: "05", title: "キャリアアップ編",
    caption: "選んだ道の先で、自分だけの未来を切り拓く",
    zoneBg:  "linear-gradient(180deg, #5A1010 0%, #3A0808 100%)",
    sceneBg: "linear-gradient(160deg, #A01818 0%, #780C0C 50%, #500808 100%)",
    trackBg: "#2A0404",
    cellBg: "rgba(160,24,24,0.40)", cellBorder: "#C04040",
    cellText: "#FFD0C0", cellNum: "#FF9880",
    chCol: "#FF8060", titleCol: "#FFF",
    // 背景: 夜景・都市 (超大型、薄)
    bgScene: [
      { e:"🌆", x:-4, y:-30, s:130, o:0.09 },
      { e:"✨", x:70, y:6,   s:22,  o:0.40 },
      { e:"✨", x:18, y:68,  s:16,  o:0.30 },
      { e:"⭐", x:48, y:4,   s:18,  o:0.25 },
    ] as El[],
    // フォアグラウンド: シーン構成
    fgScene: [
      { e:"🏆", x:2,  y:6,  s:62 },  // 左: 大きなトロフィー
      { e:"👑", x:22, y:60, s:44 },  // 左下: 王冠
      { e:"💻", x:42, y:8,  s:40 },  // 中央上: PC
      { e:"🚀", x:62, y:58, s:48 },  // 右下: ロケット
      { e:"🏢", x:77, y:0,  s:80 },  // 右: 大きなビル（縦長）
    ] as El[],
    cells: [29,28,27,26,25,24], conn: "right" as const,
  },
  {
    chapter: "04", title: "成長・挑戦編",
    caption: "一歩踏み出すたびに、自分が変わっていく",
    zoneBg:  "linear-gradient(180deg, #4A2800 0%, #2E1800 100%)",
    sceneBg: "linear-gradient(160deg, #A06018 0%, #785000 50%, #4A2E00 100%)",
    trackBg: "#1A0E00",
    cellBg: "rgba(160,96,24,0.40)", cellBorder: "#C88828",
    cellText: "#FFE8A0", cellNum: "#FFBB40",
    chCol: "#FFAA30", titleCol: "#FFF",
    bgScene: [
      { e:"🌅", x:-4, y:-25, s:120, o:0.09 },
      { e:"💫", x:30, y:8,   s:20,  o:0.35 },
      { e:"💫", x:75, y:60,  s:16,  o:0.28 },
    ] as El[],
    fgScene: [
      { e:"👨‍🏫", x:1,  y:5,  s:64 },  // 左: 先生キャラ（大）
      { e:"💡",   x:25, y:62, s:42 },  // 左下: 電球
      { e:"🌍",   x:44, y:6,  s:48 },  // 中央上: 地球
      { e:"🤝",   x:64, y:58, s:40 },  // 右下: 握手
      { e:"⚡",   x:82, y:4,  s:52 },  // 右: 稲妻
    ] as El[],
    cells: [18,19,20,21,22,23], conn: "left" as const,
  },
  {
    chapter: "03", title: "新入社員編",
    caption: "白衣を纏い、患者さんと向き合う毎日",
    zoneBg:  "linear-gradient(180deg, #0A3010 0%, #061E0A 100%)",
    sceneBg: "linear-gradient(160deg, #1A7838 0%, #0E5022 50%, #082E14 100%)",
    trackBg: "#041208",
    cellBg: "rgba(26,120,56,0.40)", cellBorder: "#28A84A",
    cellText: "#C0FFD0", cellNum: "#60F090",
    chCol: "#50E880", titleCol: "#FFF",
    bgScene: [
      { e:"🌿", x:-3, y:-20, s:110, o:0.11 },
      { e:"💊", x:72, y:60,  s:28,  o:0.22 },
      { e:"💊", x:14, y:68,  s:20,  o:0.18 },
    ] as El[],
    fgScene: [
      { e:"🧑‍⚕️", x:1,  y:4,  s:70 },  // 左: 薬剤師（大）
      { e:"💊",   x:26, y:60, s:38 },  // 左下: 薬
      { e:"🏥",   x:43, y:2,  s:60 },  // 中央: 病院
      { e:"📖",   x:66, y:58, s:34 },  // 右下: テキスト
      { e:"🩺",   x:82, y:6,  s:44 },  // 右上: 聴診器
    ] as El[],
    cells: [17,16,15,14,13,12], conn: "right" as const,
  },
  {
    chapter: "02", title: "内定者期間編",
    caption: "合格の喜びとともに、新たな旅支度が始まる",
    zoneBg:  "linear-gradient(180deg, #081A40 0%, #041028 100%)",
    sceneBg: "linear-gradient(160deg, #165898 0%, #0C3870 50%, #081E48 100%)",
    trackBg: "#030A18",
    cellBg: "rgba(22,88,152,0.40)", cellBorder: "#2882D0",
    cellText: "#C0E8FF", cellNum: "#70C8FF",
    chCol: "#60C0FF", titleCol: "#FFF",
    bgScene: [
      { e:"🌙", x:-2, y:-20, s:100, o:0.10 },
      { e:"⭐", x:42, y:6,   s:18,  o:0.30 },
      { e:"⭐", x:80, y:60,  s:14,  o:0.25 },
    ] as El[],
    fgScene: [
      { e:"📚", x:2,  y:6,  s:56 },  // 左: 教科書
      { e:"🎓", x:24, y:58, s:46 },  // 左下: 卒業帽
      { e:"🎉", x:43, y:3,  s:58 },  // 中央上: 祝い
      { e:"✈️", x:64, y:56, s:44 },  // 右下: 飛行機
      { e:"🌸", x:81, y:5,  s:46 },  // 右上: 桜
    ] as El[],
    cells: [6,7,8,9,10,11], conn: "left" as const,
  },
  {
    chapter: "01", title: "選考会編",
    caption: "夢に向かって、最初の扉を叩く",
    zoneBg:  "linear-gradient(180deg, #220C50 0%, #130830 100%)",
    sceneBg: "linear-gradient(160deg, #582898 0%, #381870 50%, #200E48 100%)",
    trackBg: "#0C0520",
    cellBg: "rgba(88,40,152,0.40)", cellBorder: "#8858D8",
    cellText: "#E0C8FF", cellNum: "#C898FF",
    chCol: "#B888FF", titleCol: "#FFF",
    bgScene: [
      { e:"🌠", x:-3, y:-22, s:100, o:0.09 },
      { e:"✨", x:50, y:5,   s:18,  o:0.30 },
      { e:"✨", x:84, y:62,  s:14,  o:0.25 },
    ] as El[],
    fgScene: [
      { e:"🏫", x:1,  y:4,  s:66 },  // 左: 大学
      { e:"💼", x:25, y:60, s:40 },  // 左下: カバン
      { e:"😰", x:43, y:5,  s:52 },  // 中央上: 緊張顔
      { e:"📝", x:65, y:58, s:36 },  // 右下: 履歴書
      { e:"🌟", x:81, y:6,  s:46 },  // 右上: 星
    ] as El[],
    cells: [5,4,3,2,1,0], conn: null,
  },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function Board({ displayPosition }: Props) {
  const cellMap = new Map(BOARD_CELLS.map((c) => [c.index, c]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {ZONES.map((zone, zi) => (
        <div key={zone.chapter}>

          {/* ═══════════ Zone World ═══════════ */}
          <div style={{
            background: zone.zoneBg,
            borderRadius: 5,
            overflow: "hidden",
            border: `1px solid ${zone.cellBorder}50`,
          }}>

            {/* Header (zone identity) */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "6px 12px 5px",
              background: "rgba(0,0,0,0.38)",
              borderBottom: `1px solid ${zone.cellBorder}38`,
            }}>
              <span style={{
                fontSize: 28, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em",
                color: zone.chCol, opacity: 0.55, fontFamily: "serif",
              }}>
                {zone.chapter}
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: zone.titleCol, lineHeight: 1.1 }}>
                  {zone.title}
                </div>
                <div style={{ fontSize: 9, color: `${zone.titleCol}55`, marginTop: 2 }}>
                  {zone.caption}
                </div>
              </div>
            </div>

            {/* ── Illustrated Scene (the "world") ── */}
            <div style={{
              position: "relative",
              height: 190,          // ← 人生ゲーム的な広いシーンエリア
              overflow: "hidden",
              background: zone.sceneBg,
            }}>
              {/* Background atmosphere layer */}
              {zone.bgScene.map((el, i) => (
                <span key={`b${i}`} style={{
                  position: "absolute",
                  left: `${el.x}%`, top: `${el.y}%`,
                  fontSize: el.s, lineHeight: 1,
                  opacity: el.o ?? 0.10,
                  pointerEvents: "none", userSelect: "none",
                }}>
                  {el.e}
                </span>
              ))}
              {/* Main scene elements (tell the story) */}
              {zone.fgScene.map((el, i) => (
                <span key={`f${i}`} style={{
                  position: "absolute",
                  left: `${el.x}%`, top: `${el.y}%`,
                  fontSize: el.s, lineHeight: 1,
                  opacity: 0.88,
                  pointerEvents: "none", userSelect: "none",
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.70))",
                }}>
                  {el.e}
                </span>
              ))}
              {/* Bottom gradient → blends into cell track */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.80))",
                pointerEvents: "none",
              }} />
            </div>

            {/* ── Cell Track (the "road" through the world) ── */}
            <div style={{
              background: zone.trackBg,
              padding: "6px 7px 8px",
              borderTop: `1px solid ${zone.cellBorder}28`,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {zone.cells.map((idx) => {
                  const cell = cellMap.get(idx);
                  if (!cell) return null;
                  const isCur    = idx === displayPosition;
                  const isPast   = idx < displayPosition;
                  const isBranch = cell.cellType === "branch";
                  const isRest   = cell.cellType === "rest";

                  return (
                    <div
                      key={idx}
                      className={isCur ? "cell-current" : ""}
                      style={{
                        aspectRatio: "1",
                        display: "flex", flexDirection: "column",
                        alignItems: "flex-start", justifyContent: "space-between",
                        padding: "3px 3px 3px 4px", borderRadius: 4,
                        background:
                          isCur    ? "rgba(228,184,74,0.28)"  :
                          isBranch ? "rgba(228,184,74,0.18)"  :
                          isRest   ? "rgba(80,210,120,0.18)"  :
                          isPast   ? "rgba(0,0,0,0.55)"       :
                                     zone.cellBg,
                        border: `1px solid ${
                          isCur    ? "var(--c-gold)"           :
                          isBranch ? "rgba(228,184,74,0.80)"   :
                          isRest   ? "rgba(80,210,120,0.65)"   :
                                     zone.cellBorder + "55"
                        }`,
                        borderBottom: `2px solid ${
                          isCur    ? "var(--c-gold)"       :
                          isBranch ? "var(--c-gold-bright)":
                          isRest   ? "#50D878"              :
                                     zone.cellBorder
                        }`,
                        opacity: isPast && !isCur ? 0.18 : 1,
                        position: "relative", overflow: "hidden",
                        transition: "opacity 0.4s, background 0.2s",
                        boxShadow: isCur    ? `0 0 14px rgba(228,184,74,0.55)` :
                                   isBranch ? `0 0 10px rgba(228,184,74,0.35)` :
                                   isRest   ? `0 0 8px  rgba(80,210,120,0.30)` :
                                              "inset 0 1px 0 rgba(255,255,255,0.07)",
                      }}
                    >
                      {/* Number (micro, top-right) */}
                      {!cell.isStart && !cell.isGoal && !isBranch && !isRest && (
                        <span style={{
                          fontSize: 7, alignSelf: "flex-end", lineHeight: 1, opacity: 0.70,
                          color: isCur ? "var(--c-gold)" : zone.cellNum,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {idx}
                        </span>
                      )}

                      {/* Bottom label */}
                      <div style={{ width: "100%", marginTop: "auto" }}>
                        {cell.isStart && (
                          <span style={{ fontSize: 7, fontWeight: 900, color: "#8080B0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block" }}>START</span>
                        )}
                        {cell.isGoal && (
                          <span style={{ fontSize: 7, fontWeight: 900, color: "var(--c-gold-bright)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block" }}>GOAL</span>
                        )}
                        {isBranch && (
                          <span style={{ fontSize: 8, fontWeight: 900, color: "var(--c-gold-bright)", display: "block", lineHeight: 1.2 }}>⚡BRANCH</span>
                        )}
                        {isRest && (
                          <span style={{ fontSize: 8, fontWeight: 900, color: "#50E878", display: "block", lineHeight: 1.2 }}>★ REST</span>
                        )}
                        {!cell.isStart && !cell.isGoal && !isBranch && !isRest && (
                          <span style={{
                            fontSize: 8, lineHeight: 1.2, display: "block",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            color: isCur ? "var(--c-gold)" : zone.cellText,
                          }}>
                            {cell.hint}
                          </span>
                        )}
                      </div>

                      {isCur && (
                        <div style={{
                          position: "absolute", inset: 0, borderRadius: 4,
                          boxShadow: "inset 0 0 0 1px rgba(228,184,74,0.50)",
                          pointerEvents: "none",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Path connector between zones */}
          {zone.conn && zi < ZONES.length - 1 && (
            <div style={{ height: 10, position: "relative" }}>
              <div style={{
                position: "absolute",
                left:  zone.conn === "left"  ? "8.5%" : undefined,
                right: zone.conn === "right" ? "8.5%" : undefined,
                top: 0, bottom: 0, width: 5,
                background: `linear-gradient(to bottom, ${zone.cellBorder}, ${ZONES[zi + 1].cellBorder})`,
                opacity: 0.60, borderRadius: "0 0 3px 3px",
              }} />
            </div>
          )}

        </div>
      ))}
    </div>
  );
}
