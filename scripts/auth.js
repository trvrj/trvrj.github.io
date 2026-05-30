import { auth, googleProvider, firebaseConfigError } from "./firebaseClient.js";
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { isUserAuthorizedByEmail } from "./authorization.js";

export function subscribeToAuthChanges(callback) {
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup() {
    if (!auth || !googleProvider) {
        throw new Error(firebaseConfigError || "Firebase auth not configured.");
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
