import { browserLocalPersistence, initializeAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { app } from "./firebase-config.js";

// Conserva la sesión en este navegador hasta que se cierre explícitamente desde el panel.
export const auth = initializeAuth(app, { persistence: browserLocalPersistence });
