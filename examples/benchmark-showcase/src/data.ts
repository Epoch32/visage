export interface BenchmarkResult {
  id: string;
  name: string;
  description: string;
  category: "creation" | "update" | "dom";
  visage: number;
  visageScript: number;
  solid: number;
  solidScript: number;
  vanilla: number;
  vanillaScript: number;
}

export const BENCHMARK_DATA: BenchmarkResult[] = [
  {
    id: "01_run1k",
    name: "Create 1,000 Rows",
    description: "Instantiates 1,000 table rows with 2 event listeners and dynamic signal bindings",
    category: "creation",
    visage: 75.5,
    visageScript: 8.9,
    solid: 85.7,
    solidScript: 9.1,
    vanilla: 97.1,
    vanillaScript: 6.8
  },
  {
    id: "02_replace1k",
    name: "Replace 1,000 Rows",
    description: "Replaces 1,000 existing table rows with 1,000 newly generated rows",
    category: "creation",
    visage: 62.8,
    visageScript: 13.9,
    solid: 116.1,
    solidScript: 27.5,
    vanilla: 104.8,
    vanillaScript: 16.8
  },
  {
    id: "03_update10th1k",
    name: "Update Every 10th Row (16x)",
    description: "Updates label text of every 10th row in a 1,000-row table repeatedly 16 times",
    category: "update",
    visage: 64.1,
    visageScript: 1.9,
    solid: 75.5,
    solidScript: 5.2,
    vanilla: 87.5,
    vanillaScript: 2.5
  },
  {
    id: "04_select1k",
    name: "Select Row",
    description: "Highlights a row on click via fine-grained reactive selector notification",
    category: "dom",
    visage: 14.7,
    visageScript: 1.3,
    solid: 17.8,
    solidScript: 3.6,
    vanilla: 22.5,
    vanillaScript: 1.8
  },
  {
    id: "05_swap1k",
    name: "Swap Rows",
    description: "Swaps row 2 and row 999 in a 1,000-row table without re-rendering other rows",
    category: "dom",
    visage: 43.1,
    visageScript: 1.1,
    solid: 73.4,
    solidScript: 3.3,
    vanilla: 70.9,
    vanillaScript: 0.7
  },
  {
    id: "06_remove1k",
    name: "Remove Single Row",
    description: "Deletes a specific row and cleans up its DOM nodes and reactive scope",
    category: "dom",
    visage: 51.2,
    visageScript: 0.8,
    solid: 58.8,
    solidScript: 1.4,
    vanilla: 71.6,
    vanillaScript: 1.6
  },
  {
    id: "07_create10k",
    name: "Create 10,000 Rows",
    description: "Stress test creating 10,000 rows in a single frame to measure scalability",
    category: "creation",
    visage: 588.5,
    visageScript: 57.2,
    solid: 1248.6,
    solidScript: 100.6,
    vanilla: 1032.8,
    vanillaScript: 63.5
  },
  {
    id: "08_append1k",
    name: "Append 1,000 Rows (2x)",
    description: "Appends 1,000 rows to an existing 1,000-row table twice sequentially",
    category: "creation",
    visage: 62.6,
    visageScript: 6.6,
    solid: 148.6,
    solidScript: 13.0,
    vanilla: 141.2,
    vanillaScript: 12.0
  },
  {
    id: "09_clear1k",
    name: "Clear 1,000 Rows (8x)",
    description: "Clears all 1,000 rows and reclaims all reactive memory 8 times",
    category: "dom",
    visage: 31.1,
    visageScript: 26.5,
    solid: 64.1,
    solidScript: 53.5,
    vanilla: 49.0,
    vanillaScript: 44.2
  }
];

export const SYSTEM_SPECS = {
  cpu: "x86_64 Linux 6.6",
  browser: "Google Chrome 155.0.8059.79 (Official Build)",
  benchmarkHarness: "krausest/js-framework-benchmark (Puppeteer Headless)",
  visageVersion: "1.8.0",
  solidVersion: "1.9.3",
  runsPerBenchmark: "5 Warmup + 5-15 Measurement Iterations"
};
