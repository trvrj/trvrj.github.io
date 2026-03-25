import { subscribeToAuthChanges, signInWithGooglePopup, signOutUser } from "./auth.js";
import { renderAuthLoading, renderAuthUI } from "./ui.js";
import { firebaseConfigError } from "./firebaseClient.js";
import {
    getAuthorizationError,
    isAuthorizationConfigured,
    isUserAuthorizedByEmail,
} from "./authorization.js";

export function initAuthPage({ rootId, redirectOnSuccessTo }) {
    const root = document.getElementById(rootId);
    if (!root) return;

    let busy = false;
    let error = firebaseConfigError || "";

    let currentUserEmail = null;
    let authorized = false;
    let showUnauthorizedDialog = false;

    renderAuthLoading(root);

    function updateUI() {
        renderAuthUI(root, {
            userEmail: currentUserEmail,
            authorized,
            showUnauthorizedDialog,
            busy,
            error,
            onSignIn: handleSignIn,
            onSignOut: handleSignOut,
            onUnauthorizedOk: handleUnauthorizedOk,
        });
    }

    async function handleSignIn() {
        if (busy) return;
        busy = true;
        error = "";
        updateUI();

        try {
            await signInWithGooglePopup();
        } catch (e) {
            error = e?.message ? String(e.message) : "Sign-in failed.";
        } finally {
            busy = false;
            updateUI();
        }
    }

    async function handleSignOut() {
        if (busy) return;
        busy = true;
        error = "";
        updateUI();

        try {
            await signOutUser();
        } catch (e) {
            error = e?.message ? String(e.message) : "Sign-out failed.";
        } finally {
            busy = false;
            updateUI();
        }
    }

    async function handleUnauthorizedOk() {
        if (busy) return;
        busy = true;
        error = "";
        updateUI();

        try {
            await signOutUser();
        } catch (e) {
            error = e?.message ? String(e.message) : "Sign-out failed.";
        } finally {
            busy = false;
            showUnauthorizedDialog = false;
            updateUI();
        }
    }

    subscribeToAuthChanges((user) => {
        currentUserEmail = user?.email ?? null;
        busy = false;

        if (!user) {
            authorized = false;
            showUnauthorizedDialog = false;
            error = firebaseConfigError || "";
            updateUI();
            return;
        }

        authorized = isUserAuthorizedByEmail(currentUserEmail);
        error = getAuthorizationError(currentUserEmail) || "";
        showUnauthorizedDialog = false;

        if (authorized) {
            if (redirectOnSuccessTo) {
                window.location.replace(redirectOnSuccessTo);
                return;
            }
        } else if (isAuthorizationConfigured() && !firebaseConfigError) {
            showUnauthorizedDialog = true;
        }

        updateUI();
    });
}

