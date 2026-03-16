import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "calc-translation-app";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App platform="web" />
  </StrictMode>,
);
