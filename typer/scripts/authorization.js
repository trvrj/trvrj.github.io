// Client-side access gating for /typer.
// IMPORTANT: This is NOT a security boundary. Firestore/Storage rules are the real enforcement.

export const allowedEmail = "trevorjohnson.texas@gmail.com";

export function isUserAuthorizedByEmail(userEmail) {
    if (!userEmail) return false;
    if (!allowedEmail || allowedEmail.includes("PASTE_")) return false;
    return String(userEmail).toLowerCase() === String(allowedEmail).toLowerCase();
}

export function isAuthorizationConfigured() {
    return !!allowedEmail && !String(allowedEmail).includes("PASTE_");
}

export function getAuthorizationError(userEmail) {
    if (!allowedEmail || allowedEmail.includes("PASTE_")) {
        return "Set `allowedEmail` in typer/scripts/authorization.js to enable access gating.";
    }

    if (!userEmail) return "";
    if (isUserAuthorizedByEmail(userEmail)) return "";

    return "Not authorized for this page.";
}

