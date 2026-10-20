/**
 * Options for custom window borders on native desktop hosts
 */
export interface WindowBorderOptions {
  /**
   * Custom border color (CSS color string, e.g. "#3b82f6" or "rgb(59, 130, 246)")
   * @default "#3b82f6"
   */
  color?: string;

  /**
   * Border stroke width in pixels
   * @default 1
   */
  width?: number;

  /**
   * Border corner radius in pixels
   * @default 0
   */
  radius?: number;
}

/**
 * Configuration options for the experimental Zig native compiler target
 */
export interface ZigNativeOptions {
  /**
   * Title of the native OS application window
   * @default "Visage App"
   */
  title?: string;

  /**
   * Initial window width in pixels
   * @default 1024
   */
  width?: number;

  /**
   * Initial window height in pixels
   * @default 768
   */
  height?: number;

  /**
   * Allow window resizing
   * @default true
   */
  resizable?: boolean;

  /**
   * Enable browser developer tools in the native window
   * @default false
   */
  debug?: boolean;

  /**
   * Target directory for generated Zig host code and build.zig
   * @default "src-native"
   */
  outputDir?: string;

  /**
   * Automatically scaffold build.zig and main.zig if not present
   * @default true
   */
  scaffold?: boolean;

  /**
   * Explicit virtual origin scheme and host for embedded webviews
   * @default "visage://localhost"
   */
  virtualOrigin?: string;

  /**
   * Enable or disable native window decorations (titlebar and OS window borders).
   * Set to `false` to create a frameless window with custom borders.
   * @default true
   */
  decorations?: boolean;

  /**
   * Custom window border styling for the native desktop host.
   */
  border?: boolean | WindowBorderOptions;
}
