// flexidrive-front/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google"; // ✅ NUEVO
import "./index.css";
import App from "./App.jsx";

// El Client ID viene de Google Cloud Console → APIs & Services → Credentials
// Tiene que ser el MISMO que está en el backend como GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
console.log("CLIENT ID:", GOOGLE_CLIENT_ID); // ← agregá esto

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* ✅ GoogleOAuthProvider envuelve toda la app para que GoogleLogin
        pueda funcionar en cualquier componente */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
