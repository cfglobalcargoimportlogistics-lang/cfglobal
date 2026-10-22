import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { app } from "./firebase-config.js";

export const storage = getStorage(app);
