// Client-side access gating for the dashboard.
// IMPORTANT: This is not a security boundary by itself.
export const allowedEmails = [
    "trevor@trvrj.com",
    "trevorjohnson.texas@gmail.com",
];

export function isUserAuthorizedByEmail(userEmail) {
    if (!userEmail) return false;
    const normalized = String(userEmail).toLowerCase();
    return allowedEmails.some((allowedEmail) => normalized === String(allowedEmail).toLowerCase());
}

export function getAuthorizationError(userEmail) {
    if (!userEmail) return "";
    if (isUserAuthorizedByEmail(userEmail)) return "";
    return "Not authorized for this dashboard.";
}
