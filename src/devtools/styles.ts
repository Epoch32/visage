export const devtoolsStyles = `
  .visage-devtools-root {
    position: fixed;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #f1f5f9;
    box-sizing: border-box;
  }
  .visage-devtools-root * {
    box-sizing: border-box;
  }
  .visage-devtools-trigger {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: #0f172a;
    color: #38bdf8;
    border: 1px solid #334155;
    border-radius: 9999px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 600;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 0 10px rgba(56, 189, 248, 0.2);
    transition: all 0.2s ease;
    z-index: 999999;
  }
  .visage-devtools-trigger:hover {
    background: #1e293b;
    border-color: #38bdf8;
    transform: translateY(-2px);
  }
  .visage-devtools-drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 420px;
    background: #090d16;
    border-top: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -20px 25px -5px rgba(0, 0, 0, 0.7);
    z-index: 999999;
  }
  .visage-devtools-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
  }
  .visage-devtools-tabs {
    display: flex;
    gap: 4px;
  }
  .visage-devtools-tab {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .visage-devtools-tab:hover {
    color: #f1f5f9;
    background: #1e293b;
  }
  .visage-devtools-tab.active {
    color: #38bdf8;
    background: #1e293b;
    font-weight: 600;
  }
  .visage-devtools-badge {
    background: #334155;
    color: #f1f5f9;
    padding: 1px 6px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 600;
  }
  .visage-devtools-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .visage-devtools-sidebar {
    width: 320px;
    border-right: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
    background: #0c111d;
  }
  .visage-devtools-search {
    padding: 8px;
    border-bottom: 1px solid #1e293b;
  }
  .visage-devtools-input {
    width: 100%;
    background: #090d16;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #f1f5f9;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;
  }
  .visage-devtools-input:focus {
    border-color: #38bdf8;
  }
  .visage-devtools-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }
  .visage-devtools-item {
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
    font-size: 12px;
  }
  .visage-devtools-item:hover {
    background: #1e293b;
  }
  .visage-devtools-item.selected {
    background: #1e293b;
    border-left: 3px solid #38bdf8;
  }
  .visage-devtools-main {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #090d16;
  }
  .visage-devtools-json {
    background: #050811;
    border: 1px solid #1e293b;
    border-radius: 6px;
    padding: 12px;
    font-family: "JetBrains Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #38bdf8;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  .visage-devtools-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .visage-devtools-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f1f5f9;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    font-weight: 500;
  }
  .visage-devtools-btn:hover {
    background: #334155;
  }
  .visage-devtools-btn.active {
    background: #0284c7;
    border-color: #38bdf8;
  }
  /* DAG Graph Visualization */
  .visage-graph-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #050811;
    position: relative;
  }
  .visage-graph-toolbar {
    padding: 8px 16px;
    background: #090d16;
    border-bottom: 1px solid #1e293b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .visage-graph-canvas {
    flex: 1;
    overflow: auto;
    padding: 24px;
    position: relative;
    display: flex;
    gap: 40px;
  }
  .visage-graph-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 220px;
  }
  .visage-graph-col-header {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .visage-graph-node {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  .visage-graph-node:hover {
    border-color: #38bdf8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.15);
  }
  .visage-graph-node.selected {
    border-color: #38bdf8;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
    background: #131d35;
  }
  .visage-graph-node-title {
    font-weight: 600;
    font-size: 12px;
    color: #f8fafc;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .visage-graph-node-val {
    font-family: monospace;
    font-size: 11px;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 190px;
  }
  .visage-graph-pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }
  .visage-graph-pulse.computed {
    background: #a855f7;
    box-shadow: 0 0 8px #a855f7;
  }
`;
