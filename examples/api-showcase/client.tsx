import { render } from "visage";
import { App } from "./App";

const root = document.getElementById("root");
if (root) {
  root.innerHTML = "";
  render(() => <App />, root);
}
