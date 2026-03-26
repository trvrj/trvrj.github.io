// Client-side access gating for /typer.
// IMPORTANT: This is NOT a security boundary. Firestore/Storage rules are the real enforcement.

export const allowedEmails = ["trevorjohnson.texas@gmail.com", "chriscroft30114@gmail.com"];

export function isUserAuthorizedByEmail(userEmail) {
    if (!userEmail) return false;
    if (!Array.isArray(allowedEmails) || !allowedEmails.length) return false;
    const normalizedUserEmail = String(userEmail).toLowerCase();
    return allowedEmails.some((allowedEmail) => {
        if (!allowedEmail || String(allowedEmail).includes("PASTE_")) return false;
        return normalizedUserEmail === String(allowedEmail).toLowerCase();
    });
}

export function isAuthorizationConfigured() {
    return Array.isArray(allowedEmails) && allowedEmails.some((email) => !!email && !String(email).includes("PASTE_"));
}

export function getAuthorizationError(userEmail) {
    if (!isAuthorizationConfigured()) {
        return "Set `allowedEmails` in typer/scripts/authorization.js to enable access gating.";
    }

    if (!userEmail) return "";
    if (isUserAuthorizedByEmail(userEmail)) return "";

    return "Not authorized for this page.";
}

