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
    if (/Android|iPhone|iPod|Mobile|Silk|Kindle/i.test(ua)) {
        return true;
    }
    if (/iPad/.test(ua)) {
        return true;
    }
    if (navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform)) {
        return true;
    }
    return false;
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

export async function signInWithGoogle() {
    if (!auth || !googleProvider) {
        throw new Error(firebaseConfigError || "Firebase auth not configured.");
    }
    if (shouldUseRedirectSignIn()) {
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
