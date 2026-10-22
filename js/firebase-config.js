import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = window.APP_CONFIG?.firebase;
if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
  throw new Error("Falta la configuración pública de Firebase. Revisa .env y genera js/public-config.js.");
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

if (firebaseConfig.measurementId) {
  void import("https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js")
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch((error) => {
      console.warn("Firebase Analytics no está disponible en este navegador/proyecto:", error);
    });
}
