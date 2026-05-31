import { auth, googleProvider, firebaseConfigError } from "./firebaseClient.js";
import {
    getRedirectResult,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { isUserAuthorizedByEmail } from "./authorization.js";

function shouldUseRedirectSignIn() {
    const ua = navigator.userAgent || "";
    const isIpad = /iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform));
    const isIphoneOrIpod = /iPhone|iPod/.test(ua);
    const isIos = isIpad || isIphoneOrIpod;
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

    // Redirect is more reliable on iOS Safari; popup is preferred elsewhere.
    return isIos && isSafari;
}

export function getDefaultGoogleSignInMethod() {
    return shouldUseRedirectSignIn() ? "redirect" : "popup";
}

export function subscribeToAuthChanges(callback) {
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
}

export async function completeGoogleRedirectSignIn() {
    if (!auth) {
        return null;
    }
    return getRedirectResult(auth);
}

export async function signInWithGoogle(options = {}) {
    if (!auth || !googleProvider) {
        throw new Error(firebaseConfigError || "Firebase auth not configured.");
    }

    const requestedMethod = options?.method ?? "auto";
    const method = requestedMethod === "auto" ? getDefaultGoogleSignInMethod() : requestedMethod;

    if (method === "redirect") {
        await signInWithRedirect(auth, googleProvider);
        return null;
    }
    return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
    if (!auth) return;
    await signOut(auth);
}

export function assertAuthorizedUser(user) {
    const email = user?.email ?? "";
    return Boolean(user && isUserAuthorizedByEmail(email));
}
