import { firebaseConfigError, isFirebaseConfigured } from "./firebaseClient.js";
import {
    assertAuthorizedUser,
    signInWithGooglePopup,
    signOutUser,
    subscribeToAuthChanges,
} from "./auth.js";

const signInBtn = document.getElementById("dashboardAuthSignInBtn");
const statusEl = document.getElementById("dashboardAuthStatus");

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function describeAuthError(error) {
    const code = String(error?.code ?? "");
    if (code === "auth/unauthorized-domain") {
        return "Sign-in failed: unauthorized domain. Add localhost to Firebase Authentication > Settings > Authorized domains.";
    }
    if (code === "auth/popup-blocked") {
        return "Sign-in popup was blocked by the browser. Allow popups for this site and try again.";
    }
    if (code === "auth/popup-closed-by-user") {
        return "Sign-in popup was closed before completing sign-in.";
    }
    return error?.message || "Sign-in failed.";
}

if (signInBtn) {
    signInBtn.addEventListener("click", async () => {
        if (!isFirebaseConfigured) {
            setStatus(firebaseConfigError);
            return;
        }

        try {
            setStatus("Signing in...");
            await signInWithGooglePopup();
        } catch (error) {
            setStatus(describeAuthError(error));
        }
    });
}

if (!isFirebaseConfigured) {
    setStatus(firebaseConfigError);
} else {
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
