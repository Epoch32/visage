import {
  FastForward,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sparkles,
  StepForward,
  Trash2,
  Zap
} from "lucide-react";
import { batch, createEffect, createSignal, onCleanup, Show, untrack } from "visage";
import {
  CELL_BLUE,
  CELL_EMPTY,
  CELL_PINK,
  type CellValue,
  simConfig,
  TrafficSimulation
} from "../sim";

export function App() {
  // Core simulation engine
  const sim = new TrafficSimulation(simConfig);

  // Reactive state
  const [isPlaying, setIsPlaying] = createSignal(true);
  const [isReversed, setIsReversed] = createSignal(false);
  const [density, setDensity] = createSignal(simConfig.fillPercentage);
  const [speedMultiplier, setSpeedMultiplier] = createSignal(1);
  const [collisionMode, setCollisionMode] = createSignal<"traffic" | "pass-through">("traffic");

  // Paint tool state for interactive canvas editing
  const [paintTool, setPaintTool] = createSignal<CellValue | "erase">(CELL_BLUE);
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  // Telemetry HUD signals
  const [stepCount, setStepCount] = createSignal(0);
  const [blueCount, setBlueCount] = createSignal(sim.getTelemetry().blueCount);
  const [pinkCount, setPinkCount] = createSignal(sim.getTelemetry().pinkCount);
  const [totalFilled, setTotalFilled] = createSignal(sim.getTelemetry().totalFilled);
  const [trafficState, setTrafficState] = createSignal<"Free Flow" | "Dynamic Streams" | "Gridlocked">("Free Flow");
  const [fps, setFps] = createSignal(60);
  const [tps, setTps] = createSignal(60);

  let canvasWrapperRef: HTMLDivElement | null = null;
  let canvasRef: HTMLCanvasElement | null = null;
  let imageData: ImageData | null = null;
  let isPointerDown = false;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (canvasWrapperRef?.requestFullscreen) {
        canvasWrapperRef.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const updateTelemetry = () => {
    const data = sim.getTelemetry();
    batch(() => {
      setStepCount(data.stepCount);
      setBlueCount(data.blueCount);
      setPinkCount(data.pinkCount);
      setTotalFilled(data.totalFilled);
      setTrafficState(data.trafficState);
    });
  };

  const renderCanvas = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;
    if (!imageData) {
      imageData = ctx.createImageData(sim.width, sim.height);
    }
    sim.renderToImageData(imageData);
    ctx.putImageData(imageData, 0, 0);
  };

  // Step simulation forward once
  const doStep = () => {
    sim.step(isReversed());
    renderCanvas();
    updateTelemetry();
  };

  // Reset / Reseed with configured density
  const handleRegenerate = (percent: number = density()) => {
    sim.reset(percent);
    renderCanvas();
    updateTelemetry();
  };

  // Clear grid
  const handleClear = () => {
    sim.clear();
    renderCanvas();
    updateTelemetry();
  };

  // Randomize density
  const handleRandomize = () => {
    const randomDensity = Math.floor(Math.random() * 45) + 10;
    setDensity(randomDensity);
    handleRegenerate(randomDensity);
  };

  // Draw the word "visage" onto the grid (clean word mark, no background noise)
  const handleDrawVisage = () => {
    sim.stampText("visage", 0);
    renderCanvas();
    updateTelemetry();
  };

  // Toggle collision mode
  const handleToggleCollision = () => {
    const nextMode = collisionMode() === "traffic" ? "pass-through" : "traffic";
    setCollisionMode(nextMode);
    sim.config.collisionMode = nextMode;
  };

  // Canvas paint handlers
  const paintAtEvent = (e: MouseEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * sim.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * sim.height);
    const tool = paintTool();
    const cellValue = tool === "erase" ? CELL_EMPTY : tool;

    // Paint a 2x2 brush for easy interactive drawing
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        sim.setCell((x + dx) % sim.width, (y + dy) % sim.height, cellValue);
      }
    }
    renderCanvas();
    updateTelemetry();
  };

  // Main animation / tick loop
  createEffect(() => {
    let animId: number;
    let frameCounter = 0;
    let tickCounter = 0;
    let lastTelemetryTime = performance.now();

    const loop = (time: number) => {
      frameCounter++;

      const playing = untrack(() => isPlaying());
      if (playing) {
        const steps = untrack(() => speedMultiplier());
        const reversed = untrack(() => isReversed());
        for (let i = 0; i < steps; i++) {
          sim.step(reversed);
          tickCounter++;
        }
        renderCanvas();
      }

      // Update FPS / TPS and telemetry every 200ms
      const elapsed = time - lastTelemetryTime;
      if (elapsed >= 200) {
        const currentFps = Math.round((frameCounter * 1000) / elapsed);
        const currentTps = Math.round((tickCounter * 1000) / elapsed);
        setFps(currentFps);
        setTps(currentTps);
        frameCounter = 0;
        tickCounter = 0;
        lastTelemetryTime = time;
        updateTelemetry();
      }

      animId = requestAnimationFrame(loop);
    };

    // Initial render
    renderCanvas();
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      cancelAnimationFrame(animId);
    });
  });

  return (
    <div class="sim-container">
      {/* Top Header */}
      <header class="sim-header">
        <div class="sim-title-group">
          <h1>
            BML Traffic Simulation
            <span class="badge badge-neutral">256 x 256</span>
          </h1>
          <p class="sim-subtitle">
            Fine-grained reactive cellular automaton running 65,536 squares with zero-VDOM overhead
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge badge-blue">
            Blue moves {() => (isReversed() ? "Up" : "Down")}
          </span>
          <span class="badge badge-pink">
            Pink moves {() => (isReversed() ? "Left" : "Right")}
          </span>
        </div>
      </header>

      {/* Main Content Layout */}
      <div class="sim-layout">
        {/* Left: 256x256 Viewport Card */}
        <div class="viewport-card">
          <div
            ref={(el: HTMLDivElement) => {
              canvasWrapperRef = el;
            }}
            class="canvas-wrapper"
            onMouseDown={(e: MouseEvent) => {
              isPointerDown = true;
              paintAtEvent(e);
            }}
            onMouseMove={(e: MouseEvent) => {
              if (isPointerDown) paintAtEvent(e);
            }}
            onMouseUp={() => {
              isPointerDown = false;
            }}
            onMouseLeave={() => {
              isPointerDown = false;
            }}
          >
            {/* Floating Overlay Controls */}
            <div class="canvas-floating-controls">
              <button
                type="button"
                class="canvas-icon-btn"
                onClick={toggleFullscreen}
                title={isFullscreen() ? "Exit Fullscreen (Esc)" : "Fullscreen"}
              >
                <Show when={isFullscreen} fallback={<Maximize size={16} />}>
                  <Minimize size={16} />
                </Show>
              </button>
            </div>

            <canvas
              ref={(el: HTMLCanvasElement) => {
                canvasRef = el;
                renderCanvas();
              }}
              width={sim.width}
              height={sim.height}
              class="sim-canvas"
            />
          </div>

          {/* Viewport Toolbar */}
          <div class="viewport-footer">
            <div class="paint-tools">
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-right: 4px;">Draw:</span>
              <button
                type="button"
                class={() => (paintTool() === CELL_BLUE ? "paint-btn active-blue" : "paint-btn")}
                onClick={() => setPaintTool(CELL_BLUE)}
              >
                Blue
              </button>
              <button
                type="button"
                class={() => (paintTool() === CELL_PINK ? "paint-btn active-pink" : "paint-btn")}
                onClick={() => setPaintTool(CELL_PINK)}
              >
                Pink
              </button>
              <button
                type="button"
                class={() => (paintTool() === "erase" ? "paint-btn active-erase" : "paint-btn")}
                onClick={() => setPaintTool("erase")}
              >
                Eraser
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button
                type="button"
                class="paint-btn"
                style="display: inline-flex; align-items: center; gap: 4px; color: var(--pastel-pink); border-color: rgba(244, 114, 182, 0.4);"
                onClick={handleDrawVisage}
                title="Draw 'visage' on canvas with organic imperfections"
              >
                <Sparkles size={12} /> Draw "visage"
              </button>
              <button
                type="button"
                class="paint-btn"
                style="display: inline-flex; align-items: center; gap: 4px;"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
              >
                <Show when={isFullscreen} fallback={<span style="display: inline-flex; align-items: center; gap: 4px;"><Maximize size={12} /> Fullscreen</span>}>
                  <span style="display: inline-flex; align-items: center; gap: 4px;"><Minimize size={12} /> Exit</span>
                </Show>
              </button>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; margin-left: 4px;">
                {sim.width} &times; {sim.height}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls & HUD */}
        <div class="controls-column">
          {/* Controls Panel */}
          <div class="control-panel">
            <div class="panel-section-title">Playback & Trajectory</div>

            <div class="playback-row">
              {/* Play / Pause Toggle */}
              <button
                type="button"
                class={() => (isPlaying() ? "btn btn-pause" : "btn btn-primary")}
                onClick={() => setIsPlaying(!isPlaying())}
              >
                <Show when={isPlaying} fallback={<span style="display: inline-flex; align-items: center; gap: 6px;"><Play size={16} /> Play</span>}>
                  <span style="display: inline-flex; align-items: center; gap: 6px;"><Pause size={16} /> Pause</span>
                </Show>
              </button>

              {/* Single Step Forward */}
              <button
                type="button"
                class="btn btn-secondary"
                disabled={() => isPlaying()}
                style={() => ({
                  opacity: isPlaying() ? 0.45 : 1.0,
                  cursor: isPlaying() ? "not-allowed" : "pointer"
                })}
                onClick={doStep}
              >
                <StepForward size={16} /> Step
              </button>

              {/* Reverse Direction Toggle */}
              <button
                type="button"
                class={() => (isReversed() ? "btn btn-toggle-active" : "btn btn-secondary")}
                onClick={() => setIsReversed(!isReversed())}
                title="Reverse particle movement direction"
              >
                <RotateCcw size={16} />
                <span>{() => (isReversed() ? "Reversed" : "Normal")}</span>
              </button>

              {/* Collision Mode Toggle */}
              <button
                type="button"
                class="btn btn-secondary"
                onClick={handleToggleCollision}
                title="Switch between BML traffic blocking and continuous flow"
              >
                <Zap size={16} />
                <span>{() => (collisionMode() === "traffic" ? "Collisions On" : "Pass-Through")}</span>
              </button>
            </div>

            {/* Speed Multiplier */}
            <div class="slider-group" style="margin-top: 6px;">
              <div class="slider-label-row">
                <span>Simulation Speed</span>
                <span class="slider-value">
                  {() => `${speedMultiplier()}x (${speedMultiplier() * 60} TPS)`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={() => speedMultiplier()}
                class="range-slider"
                onInput={(e: InputEvent) => {
                  setSpeedMultiplier(Number((e.target as HTMLInputElement).value));
                }}
              />
              <div class="speed-presets">
                {[1, 2, 5, 10, 25].map((preset) => (
                  <button
                    type="button"
                    class={() => (speedMultiplier() === preset ? "speed-btn active" : "speed-btn")}
                    onClick={() => setSpeedMultiplier(preset)}
                  >
                    {preset}x
                  </button>
                ))}
              </div>
            </div>

            {/* Density / Fill Percentage */}
            <div class="slider-group" style="margin-top: 6px;">
              <div class="slider-label-row">
                <span>Config Fill Percentage (sim.ts)</span>
                <span class="slider-value">{() => `${density()}%`}</span>
              </div>
              <input
                type="range"
                min="1"
                max="85"
                step="1"
                value={() => density()}
                class="range-slider"
                onInput={(e: InputEvent) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setDensity(val);
                }}
              />
              <div class="playback-row" style="margin-top: 4px;">
                <button
                  type="button"
                  class="btn btn-primary"
                  style="font-size: 0.8125rem; padding: 6px 12px;"
                  onClick={() => handleRegenerate()}
                >
                  <RefreshCw size={14} />
                  <span>{() => `Reseed Grid (${density()}%)`}</span>
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  style="font-size: 0.8125rem; padding: 6px 12px;"
                  onClick={handleRandomize}
                >
                  <Shuffle size={14} /> Randomize
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  style="font-size: 0.8125rem; padding: 6px 12px; border-color: rgba(244, 114, 182, 0.4); color: var(--pastel-pink);"
                  onClick={handleDrawVisage}
                >
                  <Sparkles size={14} /> Draw "visage"
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  style="font-size: 0.8125rem; padding: 6px 12px;"
                  onClick={handleClear}
                >
                  <Trash2 size={14} /> Clear
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry HUD Panel */}
          <div class="control-panel">
            <div class="panel-section-title">Live Telemetry & Diagnostics</div>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-label">Step Count</span>
                <span class="stat-value">{() => stepCount().toLocaleString()}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">FPS / TPS</span>
                <span class="stat-value">{() => `${fps()} / ${tps()}`}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Pastel Blue</span>
                <span class="stat-value stat-value-blue">{() => blueCount().toLocaleString()}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Pastel Pink</span>
                <span class="stat-value stat-value-pink">{() => pinkCount().toLocaleString()}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Occupancy</span>
                <span class="stat-value">
                  {() => `${((totalFilled() / sim.size) * 100).toFixed(1)}%`}
                </span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Traffic State</span>
                <span
                  class={() => {
                    const state = trafficState();
                    return state === "Free Flow"
                      ? "stat-value stat-state-free"
                      : state === "Dynamic Streams"
                      ? "stat-value stat-state-streams"
                      : "stat-value stat-state-jam";
                  }}
                  style="font-size: 0.875rem;"
                >
                  {() => trafficState()}
                </span>
              </div>
            </div>
          </div>

          {/* Guide Card */}
          <div class="info-card">
            <div class="info-title">Movement & Cellular Automaton Rules</div>
            <ul class="info-list">
              <li>
                <strong>Pastel Blue Squares:</strong> Move down 1 cell per step (
                {() => (isReversed() ? "moving up" : "moving down")}).
              </li>
              <li>
                <strong>Pastel Pink Squares:</strong> Move right 1 cell per step (
                {() => (isReversed() ? "moving left" : "moving right")}).
              </li>
              <li>
                <strong>Toroidal Border:</strong> Exiting any side wraps seamlessly across to the opposite border.
              </li>
              <li>
                <strong>Phase Transition:</strong> Near 32-36% density, self-organizing diagonal traffic streams spontaneously jam into a global gridlock.
              </li>
            </ul>
            <div class="swatch-group">
              <div class="swatch-item">
                <span class="swatch-box swatch-box-blue"></span>
                <span>Pastel Blue (Vertical)</span>
              </div>
              <div class="swatch-item">
                <span class="swatch-box swatch-box-pink"></span>
                <span>Pastel Pink (Horizontal)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
