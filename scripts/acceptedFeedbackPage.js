import { firebaseConfigError, isFirebaseConfigured } from "./firebaseClient.js";
import { listAcceptedFeedback } from "./feedbackFirestore.js";

const acceptedRoot = document.getElementById("acceptedFeedbackGroups");

function escapeHtml(raw) {
    return String(raw ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function groupByApp(items) {
    const groups = new Map();
    for (const item of items) {
        const key = item.appId || item.app || "other";
        const label = item.app || item.appLabel || key;
        if (!groups.has(key)) {
            groups.set(key, { label, items: [] });
        }
        groups.get(key).items.push(item);
    }
    return groups;
}

function renderError(message) {
    if (!acceptedRoot) return;
    acceptedRoot.innerHTML = `<p class="info-text">${escapeHtml(message)}</p>`;
}

function formatDate(timestamp) {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleString();
}

function renderAccepted(items) {
    if (!acceptedRoot) return;

    if (!items.length) {
        acceptedRoot.innerHTML = '<p class="info-text">No accepted feedback yet.</p>';
        return;
    }

    const groups = groupByApp(items);
    acceptedRoot.innerHTML = Array.from(groups.values())
        .map((group) => {
            const content = group.items
                .map(
                    (item) => `
                        <article class="feedback-item">
                            <p><strong>${escapeHtml(item.username || item.name || "Anonymous")}</strong></p>
                            <p>${escapeHtml(item.comment)}</p>
                            <p class="info-text accepted-feedback-timestamp">${escapeHtml(formatDate(item.createdAt))}</p>
                        </article>
                    `,
                )
                .join("");
            return `
                <section class="accepted-group">
                    <p class="app-name accepted-group-app-name">${escapeHtml(group.label)}</p>
                    <div class="feedback-list">${content}</div>
                </section>
            `;
        })
        .join("");
}

async function initAcceptedFeedbackPage() {
    if (!isFirebaseConfigured) {
        renderError(firebaseConfigError);
        return;
    }

    try {
        const items = await listAcceptedFeedback();
        renderAccepted(items);
    } catch (error) {
        renderError(error?.message || "Could not load accepted feedback.");
    }
}

initAcceptedFeedbackPage();
