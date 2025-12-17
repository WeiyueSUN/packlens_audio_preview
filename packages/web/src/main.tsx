import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { vscodeLogger } from "./Utils/vscodeLogger";

// 记录 webview 启动
vscodeLogger.success('[Main] Webview 已启动');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
