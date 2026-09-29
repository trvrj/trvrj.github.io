import { firebaseConfigError, isFirebaseConfigured } from "./firebaseClient.js";
import {
    assertAuthorizedUser,
    signOutUser,
    subscribeToAuthChanges,
} from "./auth.js";

const signOutBtn = document.getElementById("dashboardSignOutBtn");
const statusEl = document.getElementById("dashboardStatus");

let isAuthorized = false;

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
        await signOutUser();
        window.location.href = "./auth/";
    });
}

if (!isFirebaseConfigured) {
    setStatus(firebaseConfigError);
} else {
    subscribeToAuthChanges(async (user) => {
        isAuthorized = assertAuthorizedUser(user);

        if (!user) {
            window.location.href = "./auth/";
            return;
        }

        if (!isAuthorized) {
            await signOutUser();
            window.location.href = "./auth/";
            return;
        }

        setStatus(`Signed in as ${user.email}`);
        signOutBtn?.removeAttribute("disabled");
    });
}
