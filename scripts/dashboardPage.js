import { firebaseConfigError, isFirebaseConfigured } from "./firebaseClient.js";
import {
    assertAuthorizedUser,
    signOutUser,
    subscribeToAuthChanges,
} from "./auth.js";
import { acceptFeedback, listPendingFeedback, rejectFeedback } from "./feedbackFirestore.js";
import { listRecentSiteVisits } from "./visitFirestore.js";

const signOutBtn = document.getElementById("dashboardSignOutBtn");
const statusEl = document.getElementById("dashboardStatus");
const listEl = document.getElementById("pendingFeedbackList");
const siteVisitListEl = document.getElementById("siteVisitList");

let isAuthorized = false;

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function formatDate(timestamp) {
    if (!timestamp?.toDate) return "just now";
    return timestamp.toDate().toLocaleString();
}

function escapeHtml(raw) {
    return String(raw ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderPendingFeedback(items) {
    if (!listEl) return;
    if (!items.length) {
        listEl.innerHTML = '<p class="info-text">No pending feedback.</p>';
        return;
    }

    listEl.innerHTML = items
        .map((item) => {
            const emailLine = item.email
                ? `<p class="info-text">Email: ${escapeHtml(item.email)}</p>`
                : "";
            const typeLine = item.type
                ? `<p class="info-text">Type: ${escapeHtml(item.type)}</p>`
                : "";
            const appLabel = item.app || item.appLabel || item.appId || "Unknown app";
            const username = item.username || item.name || "Anonymous";
            return `
                <article class="feedback-item">
                    <p><strong>${escapeHtml(appLabel)}</strong></p>
                    <p>Name: ${escapeHtml(username)}</p>
                    ${emailLine}
                    ${typeLine}
                    <p>${escapeHtml(item.comment)}</p>
                    <p class="info-text">Submitted: ${escapeHtml(formatDate(item.createdAt))}</p>
                    <button type="button" data-action="accept" data-feedback-id="${escapeHtml(item.id)}">Accept</button>
                    <button type="button" class="reject-btn" data-action="reject" data-feedback-id="${escapeHtml(item.id)}">Reject</button>
                </article>
            `;
        })
        .join("");
}

function renderSiteVisits(items) {
    if (!siteVisitListEl) return;
    if (!items.length) {
        siteVisitListEl.innerHTML = '<p class="info-text">No visit data yet.</p>';
        return;
    }

    siteVisitListEl.innerHTML = items
        .map((item) => {
            const path = item.pagePath || "/";
            const when = formatDate(item.timestamp);
            const referrer = item.referrerDomain || "direct";
            const device = item.deviceCategory || "unknown";
            const language = item.browserLanguage || "unknown";
            const timezone = item.timezone || "unknown";

            return `
                <article class="feedback-item">
                    <p><strong>${escapeHtml(path)}</strong></p>
                    <p class="info-text">Time: ${escapeHtml(when)}</p>
                    <p class="info-text">Referrer: ${escapeHtml(referrer)}</p>
                    <p class="info-text">Device: ${escapeHtml(device)}</p>
                    <p class="info-text">Lang: ${escapeHtml(language)}</p>
                    <p class="info-text">Timezone: ${escapeHtml(timezone)}</p>
                </article>
            `;
        })
        .join("");
}

async function refreshPendingList() {
    if (!isAuthorized) {
        renderPendingFeedback([]);
        return;
    }
    try {
        const items = await listPendingFeedback();
        renderPendingFeedback(items);
    } catch (error) {
        renderPendingFeedback([]);
        const code = String(error?.code ?? "");
        if (code === "permission-denied") {
            setStatus("Firestore read was denied. Verify Firestore rules admin email is trevor@trvrj.com.");
            return;
        }
        setStatus(error?.message || "Could not load pending feedback.");
    }
}

async function refreshSiteVisitList() {
    if (!isAuthorized) {
        renderSiteVisits([]);
        return;
    }

    try {
        const items = await listRecentSiteVisits(100);
        renderSiteVisits(items);
    } catch (error) {
        renderSiteVisits([]);
        const code = String(error?.code ?? "");
        if (code === "permission-denied") {
            setStatus("Firestore read was denied for site visits. Verify rules allow authorized dashboard users.");
            return;
        }
        setStatus(error?.message || "Could not load site visits.");
    }
}

if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
        await signOutUser();
        window.location.href = "./auth/";
    });
}

if (listEl) {
    listEl.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) return;
        const action = target.getAttribute("data-action");
        const feedbackId = target.getAttribute("data-feedback-id");
        if (!feedbackId || !isAuthorized) return;

        try {
            target.disabled = true;
            const originalLabel = target.textContent;
            if (action === "accept") {
                target.textContent = "Accepting...";
                await acceptFeedback(feedbackId);
                setStatus("Feedback accepted.");
            } else if (action === "reject") {
                target.textContent = "Rejecting...";
                await rejectFeedback(feedbackId);
                setStatus("Feedback rejected.");
            } else {
                target.disabled = false;
                return;
            }
            await refreshPendingList();
            target.textContent = originalLabel;
        } catch (error) {
            target.disabled = false;
            target.textContent = action === "reject" ? "Reject" : "Accept";
            setStatus(error?.message || "Could not update feedback.");
        }
    });
}

if (!isFirebaseConfigured) {
    setStatus(firebaseConfigError);
    renderPendingFeedback([]);
    renderSiteVisits([]);
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
        await refreshPendingList();
        await refreshSiteVisitList();
    });
}
