import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { PosProvider } from "./lib/pos/store";
import { PrinterProvider } from "./context/PrinterContext";

import "./styles.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PrinterProvider>
        <PosProvider>
          <App />
        </PosProvider>
      </PrinterProvider>
    </BrowserRouter>
  </StrictMode>
);