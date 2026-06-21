import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n"; // initialize i18next before rendering
import { App } from "./App";
import { GlobalStyles } from "./responsive";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalStyles />
    <App />
  </React.StrictMode>,
);
