/** @jsxImportSource visage */
import { render } from "visage";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("app");
if (root) {
  render(() => <App />, root);
}
