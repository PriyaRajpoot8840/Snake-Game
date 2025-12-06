import React, { JSX, useEffect, useRef, useState } from "react";

/**
 * SnakeGame.tsx — MODERN/NEON Style with Image Background and Mobile Optimization
 * React + TypeScript + Tailwind CSS
 *
 * MODIFIED: MAXIMUM COMPACT KEYPAD AND IMPROVED BACKGROUND VISIBILITY.
 */

/* ---------- Types ---------- */
type Pos = { r: number; c: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type DifficultyKey = "EASY" | "MEDIUM" | "HARD";

/* ---------- Difficulty Config (Fixed Grid Size) ---------- */
// Fixed grid size for a consistent look
const FIXED_ROWS = 18;
const FIXED_COLS = 18;

const DIFF_CONFIG: Record<
  DifficultyKey,
  { rows: number; cols: number; startSpeedMs: number; label: string }
> = {
  EASY:   { rows: FIXED_ROWS, cols: FIXED_COLS, startSpeedMs: 260, label: "EASY" },
  MEDIUM: { rows: FIXED_COLS, cols: FIXED_COLS, startSpeedMs: 150, label: "MEDIUM" },
  HARD:   { rows: FIXED_COLS, cols: FIXED_COLS, startSpeedMs: 80,  label: "HARD" },
};

// Global Style Constants for MODERN/NEON Look (Adjusted for better image overlay)
// *** CHANGED: Lowered opacity for better background image visibility ***
const BG_COLOR = "bg-gray-950/50"; // Slightly transparent deep black for image overlay (70% opacity)
const TEXT_COLOR = "text-lime-400"; // Neon Lime Green main text
const ACCENT_COLOR = "text-lime-600"; // Dimmer lime text
const BORDER_COLOR = "border-lime-900"; // Dark border color
const UI_BG = "bg-gray-900/70"; // UI Panel background with slight transparency (70% opacity)

// NEON GLOW SHADOW
const GLOW_SHADOW = "shadow-lg shadow-lime-900/50"; 
const BOARD_ELEVATION = "shadow-[0_8px_0_0_rgba(20,20,20,0.8)]"; // Deeper 3D-like shadow

// --- USER ACTION REQUIRED: Set your image URLs here ---
// NOTE: For React/Next.js, place images in the `public` folder and use path like /images/snake-bg.jpg

const BACKGROUND_IMAGE_URL = 'url(https://wallpapercave.com/wp/wp2409705.jpg)'; // <--- CHANGE THIS
const LEFT_SNAKE_IMAGE_URL = 'https://static.vecteezy.com/system/resources/previews/023/353/723/original/funny-cartoon-snake-free-png.png'; // <--- CHANGE THIS

// -----------------------------------------------------

/* ---------- Helpers ---------- */
function posKey(p: Pos) {
  return `${p.r},${p.c}`;
}
function posEq(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}
function randPos(rows: number, cols: number, exclude: Set<string>) {
  let tries = 0;
  while (tries < 2000) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = `${r},${c}`;
    if (!exclude.has(key)) return { r, c };
    tries++;
  }
  // fallback linear search
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      if (!exclude.has(key)) return { r, c };
    }
  }
  return { r: 0, c: 0 };
}

/* ---------- Component ---------- */
export default function SnakeGame(): JSX.Element {
  const [difficulty, setDifficulty] = useState<DifficultyKey>("MEDIUM");
  const cfg = DIFF_CONFIG[difficulty];

  // Grid size is fixed, but state is used for consistency
  const [rows] = useState<number>(FIXED_ROWS);
  const [cols] = useState<number>(FIXED_COLS);
  const [tickMs, setTickMs] = useState<number>(cfg.startSpeedMs);

  // snake state
  const [snake, setSnake] = useState<Pos[]>(() => [
    { r: Math.floor(FIXED_ROWS / 2), c: Math.floor(FIXED_COLS / 2) },
    { r: Math.floor(FIXED_ROWS / 2), c: Math.floor(FIXED_COLS / 2) - 1 },
  ]);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const dirRef = useRef<Dir>(dir);
  dirRef.current = dir;
  const moveQueueRef = useRef<Dir | null>(null);

  // food, score
  const [food, setFood] = useState<Pos>(() =>
    randPos(FIXED_ROWS, FIXED_COLS, new Set(snake.map(posKey)))
  );
  const [score, setScore] = useState<number>(0);
  const [best, setBest] = useState<number>(() => {
    const v = localStorage.getItem("snake_nokia_best");
    return v ? Number(v) : 0;
  });

  // running / game over
  const [running, setRunning] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // tick ref for interval
  const tickRef = useRef<number>(tickMs);
  tickRef.current = tickMs;

  // Update speed only when difficulty changes (Grid is now fixed)
  useEffect(() => {
    const newCfg = DIFF_CONFIG[difficulty];
    setTickMs(newCfg.startSpeedMs);

    // Reset game state for the new speed
    const start = [
      { r: Math.floor(FIXED_ROWS / 2), c: Math.floor(FIXED_COLS / 2) },
      { r: Math.floor(FIXED_ROWS / 2), c: Math.floor(FIXED_COLS / 2) - 1 },
    ];
    setSnake(start);
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setFood(randPos(FIXED_ROWS, FIXED_COLS, new Set(start.map(posKey))));
    setScore(0);
    setRunning(false);
    setGameOver(false);
    moveQueueRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  /* ---------- Keyboard Controls (Desktop/Physical) ---------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") queueDir("UP");
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") queueDir("DOWN");
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") queueDir("LEFT");
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") queueDir("RIGHT");
      if (e.key === " " || e.key === "Spacebar") togglePause();
      if (e.key === "Enter" && !running) startGame();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, gameOver, rows, cols]);

  function queueDir(next: Dir) {
    const cur = dirRef.current;
    if (
      (cur === "UP" && next === "DOWN") ||
      (cur === "DOWN" && next === "UP") ||
      (cur === "LEFT" && next === "RIGHT") ||
      (cur === "RIGHT" && next === "LEFT")
    ) {
      return;
    }
    moveQueueRef.current = next;
  }

  /* ---------- Game Loop (same as before) ---------- */
  useEffect(() => {
    if (!running) return;
    let mounted = true;

    const tick = () => {
      setSnake((prev) => {
        if (!mounted) return prev;
        const nextDir = moveQueueRef.current ?? dirRef.current;
        if (moveQueueRef.current) {
          setDir(moveQueueRef.current);
          dirRef.current = moveQueueRef.current;
          moveQueueRef.current = null;
        }

        const head = prev[0];
        const newHead: Pos = { r: head.r, c: head.c };
        if (nextDir === "UP") newHead.r -= 1;
        if (nextDir === "DOWN") newHead.r += 1;
        if (nextDir === "LEFT") newHead.c -= 1;
        if (nextDir === "RIGHT") newHead.c += 1;

        // wall collision -> game over
        if (newHead.r < 0 || newHead.c < 0 || newHead.r >= rows || newHead.c >= cols) {
          setRunning(false);
          setGameOver(true);
          return prev;
        }

        // self collision
        for (let i = 0; i < prev.length; i++) {
          if (posEq(prev[i], newHead)) {
            setRunning(false);
            setGameOver(true);
            return prev;
          }
        }

        const ate = posEq(newHead, food);
        const newSnake = [newHead, ...prev];
        if (!ate) newSnake.pop();
        else {
          // ate food
          setScore((s) => {
            const ns = s + 1;
            if (ns > best) {
              setBest(ns);
              localStorage.setItem("snake_nokia_best", String(ns));
            }
            return ns;
          });
          // spawn new food
          const exclude = new Set(newSnake.map(posKey));
          setFood(randPos(rows, cols, exclude));
          // speed up a touch (small)
          // Speed up only after every 5 points for better control on EASY/MEDIUM
          if (difficulty !== 'HARD' && (newSnake.length - 2) % 5 === 0) {
             setTickMs((ms) => Math.max(40, Math.floor(ms * 0.95)));
          }
          if (difficulty === 'HARD') {
             setTickMs((ms) => Math.max(40, Math.floor(ms * 0.95)));
          }
        }
        return newSnake;
      });
    };

    const id = window.setInterval(tick, tickRef.current);
    return () => {
      mounted = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, food, rows, cols, best]);

  useEffect(() => {
    if (gameOver) {
      const b = localStorage.getItem("snake_nokia_best");
      if (b) setBest(Number(b));
    }
  }, [gameOver]);

  /* ---------- Controls (same as before) ---------- */
  function resetGame() {
    const start = [
      { r: Math.floor(rows / 2), c: Math.floor(cols / 2) },
      { r: Math.floor(rows / 2), c: Math.floor(cols / 2) - 1 },
    ];
    setSnake(start);
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setFood(randPos(rows, cols, new Set(start.map(posKey))));
    setScore(0);
    setTickMs(DIFF_CONFIG[difficulty].startSpeedMs);
    setRunning(false);
    setGameOver(false);
    moveQueueRef.current = null;
  }

  function startGame() {
    if (gameOver) resetGame();
    setRunning(true);
  }

  function togglePause() {
    setRunning((r) => !r);
  }

  // touch controls for D-Pad
  function touchMove(d: Dir) {
    queueDir(d);
    if (!running) {
        startGame(); // Start game on first touch control for mobile UX
    }
  }

  /* ---------- Render helpers ---------- */
  const snakeSet = useRef<Set<string>>(new Set());
  snakeSet.current = new Set(snake.map(posKey));

  // Calculate board size: Max size on any screen for the fixed grid
  const MAX_SNAKE_BOARD_PX = 420; 
  
  // Calculate cell size based on the fixed max size (using 24px max for better look)
  const cellSize = Math.floor(Math.min(24, Math.floor(MAX_SNAKE_BOARD_PX / Math.max(rows, cols))));

  // Calculate actual board width/height
  const actualBoardSize = cellSize * cols;


  /* ---------- Keypad Component (Mobile Optimized Styling) ---------- */
  const KeypadButton = ({ direction, onClick }: { direction: Dir, onClick: () => void }) => {
    const symbols: Record<Dir, string> = {
      UP: "▲", DOWN: "▼", LEFT: "◀", RIGHT: "▶" // Changed symbols for better visibility
    };

    return (
      <button
        onTouchStart={onClick}
        onMouseDown={onClick} 
        // *** CHANGED: Smaller text and reduced padding for max compactness ***
        className="aspect-square bg-gray-800 text-lime-400 text-lg md:text-xl rounded-md border border-lime-800 active:bg-gray-700 active:translate-y-0.5 transition-transform duration-100 ease-out flex items-center justify-center shadow-md hover:shadow-lime-700/50 p-1 md:p-2" 
      >
        {symbols[direction]}
      </button>
    );
  };
  

  /* ---------- JSX ---------- */
  return (
    // FULL PAGE CONTAINER with Background Image
    <div 
      className={`min-h-screen ${TEXT_COLOR} antialiased flex flex-col items-center justify-start md:justify-center p-4 overflow-auto relative`} 
      style={{
        backgroundImage: BACKGROUND_IMAGE_URL,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed' // Optional: fixed background scroll
      }}
    >
        {/* Semi-transparent Overlay to ensure readability */}
        <div className={`absolute inset-0 ${BG_COLOR} z-0`}></div> 

        {/* Main Content Container (z-index 10 to be above the overlay) */}
        <div className="w-full max-w-5xl relative z-10"> 
            
            {/* -------------------- Header & Difficulty Selector -------------------- */}
            <div className={`flex flex-col md:flex-row items-center justify-between mb-8 p-3 rounded-xl ${UI_BG} ${GLOW_SHADOW} border border-lime-900`}> 
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-widest select-none text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-green-500 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]">
                        SNAKE GAME
                    </h1>
                    <div className={`text-sm ${ACCENT_COLOR} mt-1 select-none`}>A Reactive Retro Classic</div>
                </div>
                
                {/* Difficulty Selector */}
                <div className="flex items-center gap-2 mt-3 md:mt-0 p-2 rounded-lg bg-gray-800 border border-lime-900">
                    <div className={`text-sm ${ACCENT_COLOR} pr-2 border-r border-lime-800`}>Difficulty</div>
                    <div className="flex gap-1">
                      {(["EASY", "MEDIUM", "HARD"] as DifficultyKey[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`px-3 py-1 text-xs rounded-md font-semibold tracking-wider transition-colors duration-200
                            ${difficulty === d 
                                ? "bg-lime-500 text-gray-900 shadow-md shadow-lime-700/50" 
                                : "bg-gray-700 text-lime-400 hover:bg-gray-600 active:translate-y-0.5"}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
            </div>
            
            {/* -------------------- Game Board and Right Panel Container -------------------- */}
            <div className="flex flex-col items-center md:flex-row md:items-start gap-4 w-full relative"> {/* *** CHANGED: Reduced gap-8 to gap-4 *** */}
                
                {/* Decoration: Left Snake Image (Only on large screens) */}
                {/* <img 
                    src={LEFT_SNAKE_IMAGE_URL} // <--- Check this path
                    alt="Decorative snake"
                    className="hidden lg:block absolute left-[-150px] top-1/2 transform -translate-y-1/2 w-36 opacity-75 object-contain"
                /> */}

                {/* 1. Left/Center: Board Container */}
                <div className="mx-auto flex-shrink-0 md:order-1 -ml-10"> {/* mx-auto centers it slightly better on wide containers */}
                  <div
                    className={`flex-shrink-0 ${UI_BG} ${BORDER_COLOR} border p-3 rounded-xl ${BOARD_ELEVATION} ${GLOW_SHADOW}`} 
                    style={{
                      width: actualBoardSize + 24, 
                      height: actualBoardSize + 24,
                      maxWidth: '90vw', 
                    }}
                  >
                    <div
                      className={`relative bg-gray-900 border border-lime-900/50 rounded-lg overflow-hidden`}
                      style={{
                        width: actualBoardSize,
                        height: actualBoardSize,
                        display: "grid",
                        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                        gap: 0,
                      }}
                    >
                      {/* Cell Rendering Logic (Snake/Food) */}
                      {Array.from({ length: rows }).map((_, r) =>
                        Array.from({ length: cols }).map((_, c) => {
                          const key = posKey({ r, c });
                          const isHead = snake.length > 0 && posEq(snake[0], { r, c });
                          const isBody = snakeSet.current.has(key);
                          const isFood = posEq(food, { r, c });
          
                          const base = "w-full h-full flex items-center justify-center text-xs select-none";
                          let bg = "bg-gray-950"; 
                          let roundedClass = "";
          
                          if (isFood) {
                            bg = "bg-red-500"; 
                            roundedClass = "rounded-full scale-75 shadow-lg shadow-red-500/50"; 
                          } else if (isHead) {
                            bg = "bg-lime-300"; 
                            roundedClass = "rounded-md shadow-md shadow-lime-300/50"; 
                          } else if (isBody) {
                            bg = "bg-lime-600"; 
                            roundedClass = "rounded-md shadow-sm"; 
                          }
          
                          return (
                            <div
                              key={key}
                              className={`${base}`}
                              style={{ padding: isBody || isHead ? '2px' : '0px' }}
                              aria-hidden
                            >
                              <div
                                className={`w-full h-full ${bg} ${roundedClass}`}
                                style={{
                                  boxShadow: isHead ? "inset 0 0 0 2px rgba(0,0,0,0.2)" : "none",
                                }}
                              />
                            </div>
                          );
                        })
                      )}
          
                      {/* Start/Game Over Overlay */}
                      {(!running || gameOver) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm z-10">
                              <div className="text-center p-6 rounded-xl border border-lime-700 bg-gray-900/90 shadow-2xl shadow-lime-700/20">
                                  <div className="text-5xl font-bold mb-3 tracking-widest text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.8)]">
                                      {gameOver ? "GAME OVER" : "SNAKE"}
                                  </div>
                                  <div className={`text-xl ${ACCENT_COLOR} mb-4`}>
                                      {gameOver ? `SCORE: ${score}` : "Press START or D-Pad"}
                                  </div>
                                  
                                  <button
                                      onClick={startGame}
                                      className="bg-lime-500 text-gray-900 px-8 py-3 rounded-lg font-extrabold text-lg tracking-wider hover:brightness-110 active:translate-y-0.5 transition-transform duration-150 shadow-lg shadow-lime-500/40"
                                  >
                                      {gameOver ? "RESTART" : "START"}
                                  </button>
                              </div>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
        
                {/* 2. Right: Info Panel & Keypad (Stacked Vertically) */}
                {/* *** CHANGED: Reduced max-w-sm to max-w-xs to move it left and accommodate the snake image on the right better *** */}
               <div className="w-full max-w-xs flex-shrink-0 md:order-2 transform md:-translate-x-64">

                    {/* Info Panel */}
                    <div className={`${UI_BG} ${BORDER_COLOR} border p-4 rounded-xl mb-3 shadow-xl `}> {/* Decreased bottom margin */}
                      <div className="flex items-center justify-between border-b border-lime-900/50 pb-3 mb-3">
                        <div>
                          <div className={`text-xs ${ACCENT_COLOR} tracking-widest`}>SCORE</div>
                          <div className="text-4xl font-extrabold text-lime-400">{score}</div>
                        </div>
                        <div>
                          <div className={`text-xs ${ACCENT_COLOR} tracking-widest`}>BEST</div>
                          <div className="text-3xl font-extrabold text-lime-400">{best}</div>
                        </div>
                      </div>
        
                      {/* Grid/Speed Info is hidden to make Info Panel more compact for mobile */}
                      {/* <div className="grid grid-cols-2 gap-2">
                        <div className={`text-sm ${ACCENT_COLOR}`}>Grid Size</div>
                        <div className={`text-sm ${TEXT_COLOR} font-medium`}>{rows} × {cols}</div>
                        <div className={`text-sm ${ACCENT_COLOR}`}>Speed (T/S)</div>
                        <div className={`text-sm ${TEXT_COLOR} font-medium`}>{Math.round(1000 / tickMs)}</div>
                      </div> */}
                    </div>
                    
                    {/* Keypad (MOBILE OPTIMIZED) */}
                    <div className='w-full'>
                        <div className={`w-full ${UI_BG} ${BORDER_COLOR} border p-3 rounded-xl shadow-2xl`}> {/* Reduced padding */}
                            <div className={`text-xs ${ACCENT_COLOR} mb-2 text-center tracking-widest`}>CONTROL PANEL</div> {/* Reduced margin */}
                            
                            {/* D-Pad Grid */}
                            <div className="grid grid-cols-3 gap-1 items-center justify-center"> {/* Reduced gap */}
                                <div />
                                <KeypadButton direction="UP" onClick={() => touchMove("UP")} />
                                <div />
                                
                                <KeypadButton direction="LEFT" onClick={() => touchMove("LEFT")} />
                                <KeypadButton direction="DOWN" onClick={() => touchMove("DOWN")} />
                                <KeypadButton direction="RIGHT" onClick={() => touchMove("RIGHT")} />
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-3 flex gap-2"> {/* Reduced gap and margin */}
                                <button
                                    onClick={togglePause}
                                    // *** CHANGED: py-1.5 for shorter buttons ***
                                    className="flex-1 bg-gray-800 text-lime-400 py-1.5 rounded-lg border border-lime-800 hover:bg-gray-700 active:translate-y-0.5 transition-transform font-bold tracking-wider text-xs shadow-md" 
                                >
                                    {running ? "PAUSE" : "RESUME"}
                                </button>
                                <button
                                    onClick={resetGame}
                                    // *** CHANGED: py-1.5 for shorter buttons ***
                                    className="flex-1 bg-gray-800 text-lime-600 py-1.5 rounded-lg border border-lime-900 hover:bg-gray-700 active:translate-y-0.5 transition-transform font-bold tracking-wider text-xs shadow-md" 
                                >
                                    RESET
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Tip (Always Visible) */}
                    <div className={`mt-2 text-xs text-black text-center md:text-left`}> {/* Reduced margin */}
                        Tip: Use Arrow keys / WASD on keyboard for Desktop controls.
                    </div>
                    
                </div>
                
                {/* Decoration: Right Snake Image (Only on large screens) */}
                {/* <img 
                    src={RIGHT_SNAKE_IMAGE_URL} // <--- Check this path
                    alt="Decorative snake"
                    className="hidden lg:block absolute right-[-150px] top-1/2 transform -translate-y-1/2 w-36 opacity-75 object-contain"
                /> */}

            </div>
        </div>
        
        {/* Footer / credits: FIXED ALIGNMENT */}
        <div className={`-mt-1 w-full max-w-5xl px-4 text-xl text-black select-none text-center md:text-left relative z-10`}> {/* Reduced margin */}
            Made with love — A Reactive Classic.
        </div>
    </div>
  );
}