import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HackoPixelLogo
 * - Uses a 5x7 pixel font map per character (uppercase-style 5x7)
 * - Builds the word "hackosquad" on mount (pixel-by-pixel)
 * - Hover => glitch mode with sound and jitter
 *
 * Requirements: framer-motion installed.
 */

const PIXEL = {
  size: 10, // px size of each pixel (change to scale)
  gap: 2,   // gap between pixels
  rows: 7,
  cols: 5,
};

const WORD = "hackosquad";

const SOUND_SRC = "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3"; // replace if desired

// 5x7 font maps (strings of '1' and '0', 7 rows each, 5 columns).
// Using classic 5x7 style patterns (uppercase-like) — tailored to form a readable word.
const FONT_5x7 = {
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  // fallback blank
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};

// map lowercase to these uppercase glyphs
const charToGlyph = (ch) => {
  const map = {
    h: "H", a: "A", c: "C", k: "K", o: "O",
    s: "S", q: "Q", u: "U", d: "D",
  };
  return FONT_5x7[ map[ch] || " " ] || FONT_5x7[" "];
};

export default function HackoPixelLogo({
  pixelSize = PIXEL.size,
  gap = PIXEL.gap,
  glowColor = "#ff2222",
  speed = 18, // build speed (ms per pixel index)
}) {
  const [assembled, setAssembled] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [hovered, setHovered] = useState(false);
  const audioRef = useRef(null);

  // Build a flat pixel grid representation for the whole word,
  // with small spacing between letters (1 column)
  const pixelGrid = useMemo(() => {
    const letters = WORD.split("");
    // For each letter, we'll reserve cols = 5, plus 1 column gap
    const letterGap = 1;
    const totalCols = letters.length * (PIXEL.cols + letterGap) - letterGap;
    const rows = PIXEL.rows;
    // create grid of rows x cols with meta objects
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = new Array(totalCols).fill(0).map(() => ({ on: false }));
    }

    letters.forEach((ch, li) => {
      const glyph = charToGlyph(ch);
      const baseCol = li * (PIXEL.cols + letterGap);
      for (let r = 0; r < PIXEL.rows; r++) {
        const rowPattern = glyph[r] || "00000";
        for (let c = 0; c < PIXEL.cols; c++) {
          const bit = rowPattern[c] === "1";
          grid[r][baseCol + c] = { on: bit, letterIndex: li, r, c };
        }
      }
    });
    return { grid, rows, cols: grid[0].length, lettersCount: letters.length };
  }, []);

  // order of activation: progressively reveal pixels by letter & position
  useEffect(() => {
    const tasks = [];
    const { grid, rows, cols } = pixelGrid;
    // produce an array of pixel coordinates we will turn on (only where on==true)
    const pixelsToActivate = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].on) {
          // weight by letter index then by row+col to get nice forming order
          pixelsToActivate.push({ r, c, li: grid[r][c].letterIndex });
        }
      }
    }
    // sort: first by letterIndex, then by (r + c) to make blocks form per letter
    pixelsToActivate.sort((a,b) => {
      if (a.li !== b.li) return a.li - b.li;
      const pa = a.r + a.c * 0.5;
      const pb = b.r + b.c * 0.5;
      return pa - pb;
    });

    // schedule activation with timeouts
    pixelsToActivate.forEach((p, idx) => {
      const t = setTimeout(() => {
        // flip on for that cell in the grid (immutable-friendly)
        pixelGrid.grid[p.r][p.c] = { ...pixelGrid.grid[p.r][p.c], active: true, activatedAt: Date.now() };
        // force update by changing state (toggle assembled false->true trick)
        // but better to use state to indicate progress; we can just check when done
        // We'll keep a simple approach: if last pixel activated => set assembled true
        if (idx === pixelsToActivate.length - 1) {
          setTimeout(() => setAssembled(true), 250);
        }
      }, idx * speed);
      tasks.push(t);
    });

    return () => tasks.forEach(t => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelGrid]);

  // audio setup
  useEffect(() => {
    audioRef.current = new Audio(SOUND_SRC);
    audioRef.current.volume = 0.35;
  }, []);

  // hover handlers
  const enter = () => {
    setHovered(true);
    // play sound once per enter
    if (audioRef.current) {
      try { audioRef.current.currentTime = 0; audioRef.current.play(); } catch (e) {}
    }
    // trigger glitch for a short burst
    setGlitch(true);
    // sustain glitch while hovered
    // stop glitch after a bit if still hovered (keeps it lively)
    const stop = setTimeout(() => {
      if (!hovered) setGlitch(false);
    }, 900);
    // nothing to cleanup here
    return () => clearTimeout(stop);
  };
  const leave = () => {
    setHovered(false);
    // quick glitch out
    setTimeout(() => setGlitch(false), 250);
  };

  // styling helpers
  const containerWidth = pixelGrid.cols * (pixelSize + gap) - gap;
  const containerHeight = pixelGrid.rows * (pixelSize + gap) - gap;

  // utility: random color from palette (for glitch)
  const palette = ["#ff2222", "#ff7777", "#ff0044", "#ff9955", "#ff55aa", "#ffffff"];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={enter}
      onMouseLeave={leave}
      style={{ width: containerWidth, height: containerHeight, cursor: "pointer", display: "inline-block" }}
      aria-hidden={false}
      role="img"
      aria-label="hackosquad pixel logo"
    >
      {/* inner grid */}
      <div style={{ position: "relative", width: containerWidth, height: containerHeight }}>
        {pixelGrid.grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            const key = `p-${rIdx}-${cIdx}`;
            const isOn = cell.on;
            const active = cell.active; // will be true after activation
            // compute a small random offset for natural feel but deterministic by position
            const seed = ((rIdx + 1) * 131 + (cIdx + 1) * 17) % 97;
            const jitterX = (seed % 3) - 1; // -1..1 px
            const jitterY = ((seed + 5) % 3) - 1;
            // glitch randomness
            const glitchNow = glitch && Math.random() < 0.28;
            const color = glitchNow
              ? palette[Math.floor(Math.random() * palette.length)]
              : glowColor;

            const boxShadow = active || assembled
              ? `0 0 ${active || assembled ? 10 : 4}px ${color}70, 0 0 ${active || assembled ? 26 : 8}px ${color}30`
              : "none";

            // framer-motion variants
            const variants = {
              hidden: { opacity: 0, scale: 0.6, rotate: 0 },
              show: {
                opacity: 1,
                scale: 1,
                rotate: 0,
                transition: { type: "spring", stiffness: 400, damping: 20, mass: 0.6 }
              },
              glitch: {
                opacity: [1, 0.6, 1],
                x: [0, (Math.random() - 0.5) * 6, 0],
                y: [0, (Math.random() - 0.5) * 6, 0],
                rotate: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 16, 0],
                transition: { duration: 0.25, times: [0, 0.6, 1] }
              }
            };

            // decide which animation state to show
            const animateState = () => {
              if (!isOn) return "hidden";
              if (!active && !assembled) return "hidden";
              if (glitchNow || glitch) return "glitch";
              return "show";
            };

            // delay based on activation time for nice staggering
            const activationDelay = (cell.activatedAt ? 0 : (cell.letterIndex || 0) * 60 + (rIdx + cIdx) * 6) / 1000;

            return (
              <motion.div
                key={key}
                initial="hidden"
                animate={animateState()}
                variants={variants}
                style={{
                  position: "absolute",
                  left: cIdx * (pixelSize + gap),
                  top: rIdx * (pixelSize + gap),
                  width: pixelSize,
                  height: pixelSize,
                  borderRadius: 2,
                  background: isOn ? (active ? color : (assembled ? glowColor : "transparent")) : "transparent",
                  boxShadow,
                  transformOrigin: "center center",
                  pointerEvents: "none",
                }}
                transition={{ delay: activationDelay }}
              />
            );
          })
        )}
      </div>

      {/* subtle stabilized glow overlay when assembled */}
      <AnimatePresence>
        {assembled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: 0,
              boxShadow: `0 0 40px ${glowColor}55 inset, 0 0 80px ${glowColor}33`,
              borderRadius: 4,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
