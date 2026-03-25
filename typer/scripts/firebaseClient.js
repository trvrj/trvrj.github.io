import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const isFirebaseConfigPlaceholder =
    !firebaseConfig ||
    String(firebaseConfig.apiKey ?? "").includes("PASTE_") ||
    String(firebaseConfig.authDomain ?? "").includes("PASTE_") ||
    String(firebaseConfig.projectId ?? "").includes("PASTE_");

export const isFirebaseConfigured = !isFirebaseConfigPlaceholder;
export const firebaseConfigError = isFirebaseConfigPlaceholder
    ? "Firebase not configured yet. Paste your Firebase web app config into typer/scripts/firebaseConfig.js."
    : "";

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isFirebaseConfigured ? getAuth(app) : null;
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

