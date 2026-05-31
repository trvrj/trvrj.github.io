import { isFirebaseConfigured } from "./firebaseClient.js";
import { recordSiteVisit } from "./visitFirestore.js";

function safeText(value, maxLength) {
    return String(value ?? "").trim().slice(0, maxLength);
}

function isInternalReferrerHost(hostname) {
    const host = String(hostname || "").toLowerCase();
    const currentHost = String(window.location.hostname || "").toLowerCase();
    if (!host) return true;
    if (host === currentHost) return true;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (host === "trvrj.com" || host === "www.trvrj.com" || host === "trvrj.github.io") return true;
    if (host.endsWith(".trvrj.com")) return true;
    return false;
}

function getReferrerDomain() {
    if (!document.referrer) return "";

    try {
        const hostname = safeText(new URL(document.referrer).hostname, 120);
        if (isInternalReferrerHost(hostname)) return "";
        return hostname;
    } catch {
        return "";
    }
}

function getDeviceCategory() {
    const ua = navigator.userAgent || "";
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
    if (/Mobile|Android|iPhone|iPod|IEMobile|BlackBerry|Opera Mini/i.test(ua)) return "mobile";
    return "desktop";
}

async function trackVisit() {
    if (!isFirebaseConfigured) return;

    const payload = {
        pagePath: safeText(window.location.pathname || "/", 300),
        referrerDomain: getReferrerDomain(),
        deviceCategory: getDeviceCategory(),
        browserLanguage: safeText(navigator.language || "", 40),
        timezone: safeText(Intl.DateTimeFormat().resolvedOptions().timeZone || "", 80),
    };

    try {
        await recordSiteVisit(payload);
    } catch (error) {
        // Analytics should never break page behavior.
        console.warn("visitTracker: failed to record visit", error);
    }
}

void trackVisit();
