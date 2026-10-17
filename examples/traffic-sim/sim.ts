/**
 * Simulation Configuration & Core Engine
 *
 * Defines the 256x256 grid parameters, fill percentage,
 * pastel colors, and the toroidal movement rules.
 */

export interface SimColors {
  readonly background: string;
  readonly pastelBlue: string;
  readonly pastelPink: string;
  readonly bgRgb: [number, number, number];
  readonly blueRgb: [number, number, number];
  readonly pinkRgb: [number, number, number];
}

export interface SimConfig {
  /**
   * Width of the grid in squares (fixed at 256).
   */
  readonly width: number;

  /**
   * Height of the grid in squares (fixed at 256).
   */
  readonly height: number;

  /**
   * Total number of squares in the grid (256 * 256 = 65,536).
   */
  readonly totalCells: number;

  /**
   * Configured percentage of squares to fill (0 to 100).
   * Default is 34%, near the critical phase transition threshold.
   */
  fillPercentage: number;

  /**
   * Movement and collision mode:
   * - "traffic": Squares block each other when destination is occupied (BML Traffic Model).
   * - "pass-through": Squares wrap freely without collision blocking.
   */
  collisionMode: "traffic" | "pass-through";

  /**
   * Simulation color palette.
   */
  readonly colors: SimColors;
}

export const CELL_EMPTY = 0;
export const CELL_BLUE = 1; // Pastel blue moves down (or up when reversed)
export const CELL_PINK = 2; // Pastel pink moves right (or left when reversed)

export type CellValue = typeof CELL_EMPTY | typeof CELL_BLUE | typeof CELL_PINK;

/**
 * Default simulation configuration.
 */
export const simConfig: SimConfig = {
  width: 256,
  height: 256,
  totalCells: 256 * 256, // 65,536 squares
  fillPercentage: 28  ,    // 34% density
  collisionMode: "traffic",
  colors: {
    background: "#11131a",
    pastelBlue: "#93c5fd", // Pastel blue
    pastelPink: "#f472b6", // Pastel pink
    bgRgb: [17, 19, 26],
    blueRgb: [147, 197, 253],
    pinkRgb: [244, 114, 182]
  }
};

export interface SimTelemetry {
  readonly stepCount: number;
  readonly blueCount: number;
  readonly pinkCount: number;
  readonly totalFilled: number;
  readonly densityPercent: number;
  readonly movedCount: number;
  readonly blockedCount: number;
  readonly velocity: number; // 0.0 (total gridlock) to 1.0 (free flow)
  readonly trafficState: "Free Flow" | "Dynamic Streams" | "Gridlocked";
}

/**
 * Packs RGB values into a 32-bit integer for fast ImageData manipulation.
 */
function packColor(r: number, g: number, b: number, a = 255): number {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

/**
 * High-performance 256x256 simulation engine.
 * Uses double-buffered Uint8Arrays for zero-allocation tick execution.
 */
export class TrafficSimulation {
  readonly width: number;
  readonly height: number;
  readonly size: number;

  private gridA: Uint8Array;
  private gridB: Uint8Array;
  private currentGrid: Uint8Array;

  private stepCount = 0;
  private blueCount = 0;
  private pinkCount = 0;
  private lastMoved = 0;
  private lastBlocked = 0;

  // Packed 32-bit pixel colors
  private readonly pixelBg: number;
  private readonly pixelBlue: number;
  private readonly pixelPink: number;

  constructor(public config: SimConfig = simConfig) {
    this.width = config.width;
    this.height = config.height;
    this.size = this.width * this.height;

    this.gridA = new Uint8Array(this.size);
    this.gridB = new Uint8Array(this.size);
    this.currentGrid = this.gridA;

    const { bgRgb, blueRgb, pinkRgb } = config.colors;
    this.pixelBg = packColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    this.pixelBlue = packColor(blueRgb[0], blueRgb[1], blueRgb[2]);
    this.pixelPink = packColor(pinkRgb[0], pinkRgb[1], pinkRgb[2]);

    this.reset(config.fillPercentage);
  }

  /**
   * Resets and populates the grid with the specified fill percentage.
   * Half of filled squares are pastel blue, half are pastel pink.
   */
  reset(fillPercentage: number = this.config.fillPercentage): void {
    this.config.fillPercentage = fillPercentage;
    this.stepCount = 0;
    this.lastMoved = 0;
    this.lastBlocked = 0;

    const totalCells = this.size;
    const clampedPercentage = Math.max(0, Math.min(100, fillPercentage));
    const totalFilled = Math.round((totalCells * clampedPercentage) / 100);

    // Half pastel blue, half pastel pink
    this.pinkCount = Math.floor(totalFilled / 2);
    this.blueCount = totalFilled - this.pinkCount;

    // Reset buffer
    this.gridA.fill(CELL_EMPTY);
    this.gridB.fill(CELL_EMPTY);
    this.currentGrid = this.gridA;

    if (totalFilled === 0) return;

    // Create random uniform placement using modern reservoir shuffle
    const indices = new Int32Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      indices[i] = i;
    }

    // Partial Fisher-Yates shuffle for the filled count
    for (let i = 0; i < totalFilled; i++) {
      const randIdx = i + Math.floor(Math.random() * (totalCells - i));
      const temp = indices[i];
      indices[i] = indices[randIdx];
      indices[randIdx] = temp;
    }

    // Assign first half as pink, second half as blue
    for (let i = 0; i < this.pinkCount; i++) {
      this.currentGrid[indices[i]] = CELL_PINK;
    }
    for (let i = this.pinkCount; i < totalFilled; i++) {
      this.currentGrid[indices[i]] = CELL_BLUE;
    }
  }

  /**
   * Clears the entire grid.
   */
  clear(): void {
    this.gridA.fill(CELL_EMPTY);
    this.gridB.fill(CELL_EMPTY);
    this.blueCount = 0;
    this.pinkCount = 0;
    this.stepCount = 0;
    this.lastMoved = 0;
    this.lastBlocked = 0;
  }

  /**
   * Executes a single simulation step.
   *
   * Movement Rules:
   * - Pastel Pink squares move right one square (left if reversed).
   * - Pastel Blue squares move down one square (up if reversed).
   * - Crossing a border wraps to the opposite border (toroidal topology).
   * - In traffic mode, squares only move into empty cells.
   */
  step(reversed = false): void {
    const W = this.width;
    const H = this.height;
    const isTrafficMode = this.config.collisionMode === "traffic";

    let src = this.currentGrid;
    let dst = src === this.gridA ? this.gridB : this.gridA;

    let moved = 0;
    let blocked = 0;

    // Phase 1: Pastel Pink (Horizontal movement: Right default, Left if reversed)
    dst.fill(CELL_EMPTY);

    // Keep blue squares in place during horizontal phase
    for (let i = 0; i < this.size; i++) {
      if (src[i] === CELL_BLUE) {
        dst[i] = CELL_BLUE;
      }
    }

    for (let y = 0; y < H; y++) {
      const rowOffset = y * W;
      for (let x = 0; x < W; x++) {
        const idx = rowOffset + x;
        if (src[idx] === CELL_PINK) {
          const targetX = reversed ? (x - 1 + W) % W : (x + 1) % W;
          const targetIdx = rowOffset + targetX;

          if (isTrafficMode) {
            // Can only move if destination is empty in current grid
            if (src[targetIdx] === CELL_EMPTY) {
              dst[targetIdx] = CELL_PINK;
              moved++;
            } else {
              dst[idx] = CELL_PINK;
              blocked++;
            }
          } else {
            // Pass-through mode
            dst[targetIdx] = CELL_PINK;
            moved++;
          }
        }
      }
    }

    // Swap buffers for Phase 2
    src = dst;
    dst = src === this.gridA ? this.gridB : this.gridA;
    dst.fill(CELL_EMPTY);

    // Keep pink squares in place during vertical phase
    for (let i = 0; i < this.size; i++) {
      if (src[i] === CELL_PINK) {
        dst[i] = CELL_PINK;
      }
    }

    // Phase 2: Pastel Blue (Vertical movement: Down default, Up if reversed)
    for (let y = 0; y < H; y++) {
      const rowOffset = y * W;
      const targetY = reversed ? (y - 1 + H) % H : (y + 1) % H;
      const targetRowOffset = targetY * W;

      for (let x = 0; x < W; x++) {
        const idx = rowOffset + x;
        if (src[idx] === CELL_BLUE) {
          const targetIdx = targetRowOffset + x;

          if (isTrafficMode) {
            // Can only move if destination is empty
            if (src[targetIdx] === CELL_EMPTY) {
              dst[targetIdx] = CELL_BLUE;
              moved++;
            } else {
              dst[idx] = CELL_BLUE;
              blocked++;
            }
          } else {
            // Pass-through mode
            dst[targetIdx] = CELL_BLUE;
            moved++;
          }
        }
      }
    }

    this.currentGrid = dst;
    this.stepCount++;
    this.lastMoved = moved;
    this.lastBlocked = blocked;
  }

  /**
   * Renders the current grid state directly into an HTML5 ImageData buffer.
   * Blits 65,536 pixels using 32-bit packed integers in ~0.2ms.
   */
  renderToImageData(imageData: ImageData): void {
    const pixels = new Uint32Array(imageData.data.buffer);
    const grid = this.currentGrid;
    const len = this.size;

    const pBg = this.pixelBg;
    const pBlue = this.pixelBlue;
    const pPink = this.pixelPink;

    for (let i = 0; i < len; i++) {
      const cell = grid[i];
      if (cell === CELL_EMPTY) {
        pixels[i] = pBg;
      } else if (cell === CELL_BLUE) {
        pixels[i] = pBlue;
      } else {
        pixels[i] = pPink;
      }
    }
  }

  /**
   * Computes telemetry statistics for the simulation HUD.
   */
  getTelemetry(): SimTelemetry {
    const totalFilled = this.blueCount + this.pinkCount;
    const densityPercent = Number(((totalFilled / this.size) * 100).toFixed(1));
    const totalAttempted = this.lastMoved + this.lastBlocked;
    const velocity = totalAttempted > 0 ? this.lastMoved / totalAttempted : 1.0;

    let trafficState: "Free Flow" | "Dynamic Streams" | "Gridlocked";
    if (totalFilled === 0 || velocity >= 0.85) {
      trafficState = "Free Flow";
    } else if (velocity >= 0.2) {
      trafficState = "Dynamic Streams";
    } else {
      trafficState = "Gridlocked";
    }

    return {
      stepCount: this.stepCount,
      blueCount: this.blueCount,
      pinkCount: this.pinkCount,
      totalFilled,
      densityPercent,
      movedCount: this.lastMoved,
      blockedCount: this.lastBlocked,
      velocity: Number(velocity.toFixed(3)),
      trafficState
    };
  }

  /**
   * Direct read access to the underlying cell at coordinate (x, y).
   */
  getCell(x: number, y: number): CellValue {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return CELL_EMPTY;
    }
    return this.currentGrid[y * this.width + x] as CellValue;
  }

  /**
   * Direct write access to set a cell at (x, y).
   */
  setCell(x: number, y: number, value: CellValue): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    const oldVal = this.currentGrid[idx];
    if (oldVal === value) return;

    if (oldVal === CELL_BLUE) this.blueCount--;
    if (oldVal === CELL_PINK) this.pinkCount--;
    if (value === CELL_BLUE) this.blueCount++;
    if (value === CELL_PINK) this.pinkCount++;

    this.currentGrid[idx] = value;
  }

  /**
   * Draws text (default: "visage") onto the 256x256 grid using pastel blue
   * and pastel pink particles with subtle stroke imperfections (zero background noise).
   */
  stampText(text = "visage", ambientDensity = 0): void {
    this.clear();
    if (typeof document === "undefined") return;

    const offscreen = document.createElement("canvas");
    offscreen.width = this.width;
    offscreen.height = this.height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(text.toLowerCase(), this.width / 2, this.height / 2);

    const imgData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;

    let bCount = 0;
    let pCount = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const alpha = data[idx * 4]; // Grayscale intensity (0 to 255)

        if (alpha > 70) {
          // Inside letter stroke: 88% chance to spawn particle (12% dropout imperfection)
          if (Math.random() < 0.88) {
            let targetX = x;
            let targetY = y;
            // Edge jitter on boundary pixels
            if (alpha < 210 && Math.random() < 0.28) {
              targetX = (x + (Math.random() < 0.5 ? -1 : 1) + this.width) % this.width;
              targetY = (y + (Math.random() < 0.5 ? -1 : 1) + this.height) % this.height;
            }

            const targetIdx = targetY * this.width + targetX;
            if (this.currentGrid[targetIdx] === CELL_EMPTY) {
              const cellType = Math.random() < 0.5 ? CELL_BLUE : CELL_PINK;
              this.currentGrid[targetIdx] = cellType;
              if (cellType === CELL_BLUE) bCount++;
              else pCount++;
            }
          }
        } else if (ambientDensity > 0 && Math.random() < ambientDensity / 100) {
          // Low-density ambient noise dust around canvas
          const cellType = Math.random() < 0.5 ? CELL_BLUE : CELL_PINK;
          this.currentGrid[idx] = cellType;
          if (cellType === CELL_BLUE) bCount++;
          else pCount++;
        }
      }
    }

    this.blueCount = bCount;
    this.pinkCount = pCount;
    this.stepCount = 0;
    this.lastMoved = 0;
    this.lastBlocked = 0;
  }
}
