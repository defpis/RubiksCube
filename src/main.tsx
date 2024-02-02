import "./styles/main.scss";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.querySelector("#root");

if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  throw new Error("没有找到root节点");
}
