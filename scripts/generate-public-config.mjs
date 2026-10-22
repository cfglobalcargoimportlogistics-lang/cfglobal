import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");
const outputPath = resolve(root, "js/public-config.js");

function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[key] = value;
  }
  return values;
}

const [exampleSource, envSource] = await Promise.all([
  readFile(examplePath, "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error)),
  readFile(envPath, "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error))
]);
const env = { ...parseEnv(exampleSource), ...parseEnv(envSource) };
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");
const whatsappHeaderNumber = digitsOnly(env.WHATSAPP_HEADER_NUMBER);
const publicConfig = {
  socialTikTokUrl: env.SOCIAL_TIKTOK_URL || "",
  socialFacebookUrl: env.SOCIAL_FACEBOOK_URL || "",
  socialInstagramUrl: env.SOCIAL_INSTAGRAM_URL || "",
  socialWhatsAppUrl: whatsappHeaderNumber
    ? `https://wa.me/${whatsappHeaderNumber}`
    : env.SOCIAL_WHATSAPP_URL || "",
  whatsappGroupChinaUrl: env.WHATSAPP_GROUP_CHINA_URL || "",
  whatsappGroupChileUrl: env.WHATSAPP_GROUP_CHILE_URL || "",
  whatsappHeaderNumber,
  whatsappContactPhone2: String(env.WHATSAPP_CONTACT_PHONE_2 || "").trim(),
  firebase: {
    apiKey: env.FIREBASE_API_KEY || "",
    authDomain: env.FIREBASE_AUTH_DOMAIN || "",
    projectId: env.FIREBASE_PROJECT_ID || "",
    storageBucket: env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.FIREBASE_APP_ID || "",
    measurementId: env.FIREBASE_MEASUREMENT_ID || ""
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET || ""
  }
};

const output = `// Generado desde .env y .env.example. Solo incluye configuración pública del navegador.\nwindow.APP_CONFIG = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`;
await writeFile(outputPath, output, "utf8");
console.log("Configuración pública actualizada desde .env y .env.example en js/public-config.js.");
