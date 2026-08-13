import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { PlatformProvider } from "./context/PlatformContext";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <BrowserRouter>
          <AuthProvider>
            <PlatformProvider>
              <App />
            </PlatformProvider>
          </AuthProvider>
        </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
);
