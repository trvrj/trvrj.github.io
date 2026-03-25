import { auth, googleProvider, firebaseConfigError } from "./firebaseClient.js";
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// NOTE: `auth` and `googleProvider` come from `firebaseClient.js`.
// This module focuses on the auth flows and state subscription.

export function subscribeToAuthChanges(callback) {
    if (!auth) {
        callback(null);
        return () => {};
    }

    // onAuthStateChanged returns an unsubscribe function.
    return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup() {
    if (!auth || !googleProvider) {
        throw new Error(firebaseConfigError || "Firebase auth not configured.");
    }
    // signInWithPopup opens the Google OAuth popup.
    return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
    if (!auth) {
        throw new Error(firebaseConfigError || "Firebase auth not configured.");
    }
    return signOut(auth);
}

