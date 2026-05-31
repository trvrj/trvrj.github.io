import { firebaseConfigError, isFirebaseConfigured } from "./firebaseClient.js";
import {
    assertAuthorizedUser,
    completeGoogleRedirectSignIn,
    getDefaultGoogleSignInMethod,
    signInWithGoogle,
    signOutUser,
    subscribeToAuthChanges,
} from "./auth.js";

const signInBtn = document.getElementById("dashboardAuthSignInBtn");
const alternateSignInBtn = document.getElementById("dashboardAuthAlternateSignInBtn");
const statusEl = document.getElementById("dashboardAuthStatus");

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function describeAuthError(error) {
    const code = String(error?.code ?? "");
    const message = String(error?.message ?? "").toLowerCase();
    if (code === "auth/unauthorized-domain") {
        const host = window.location.hostname || "this site";
        return `Sign-in failed: unauthorized domain (${host}). In Firebase Console, open Authentication > Settings > Authorized domains and add ${host}. For production, also add trvrj.com if it is missing.`;
    }
    if (code === "auth/popup-blocked") {
        return "Sign-in popup was blocked by the browser. Allow popups for this site and try again.";
    }
    if (code === "auth/popup-closed-by-user") {
        return "Sign-in popup was closed before completing sign-in.";
    }
    if (code === "auth/redirect-cancelled-by-user") {
        return "Sign-in was cancelled before completing.";
    }
    if (code === "auth/missing-initial-state" || message.includes("missing initial state")) {
        return "Sign-in failed because the browser cleared temporary login state. Retry in a normal Chrome tab (not an in-app browser or strict privacy mode), or use desktop.";
    }
    return error?.message || "Sign-in failed.";
}

async function beginSignIn(method = "auto") {
    if (!isFirebaseConfigured) {
        setStatus(firebaseConfigError);
        return;
    }

    try {
        setStatus("Signing in...");
        await signInWithGoogle({ method });
    } catch (error) {
        setStatus(describeAuthError(error));
    }
}

if (signInBtn) {
    signInBtn.addEventListener("click", () => {
        void beginSignIn("auto");
    });
}

if (alternateSignInBtn) {
    const defaultMethod = getDefaultGoogleSignInMethod();
    const alternateMethod = defaultMethod === "redirect" ? "popup" : "redirect";
    const alternateLabel = alternateMethod === "redirect" ? "redirect flow" : "popup flow";
    alternateSignInBtn.textContent = `Try alternate sign-in (${alternateLabel})`;

    alternateSignInBtn.addEventListener("click", () => {
        void beginSignIn(alternateMethod);
    });
}

if (!isFirebaseConfigured) {
    setStatus(firebaseConfigError);
} else {
    completeGoogleRedirectSignIn().catch((error) => {
        setStatus(describeAuthError(error));
    });

    subscribeToAuthChanges(async (user) => {
        if (!user) {
            setStatus("Sign in with your admin Google account.");
            return;
        }

        if (!assertAuthorizedUser(user)) {
            setStatus("This account is not authorized for dashboard access.");
            await signOutUser();
            return;
        }

        window.location.href = "../index.html";
    });
}
