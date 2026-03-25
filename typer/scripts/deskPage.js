import { subscribeToAuthChanges, signOutUser } from "./auth.js";
import { firebaseConfigError } from "./firebaseClient.js";
import { isUserAuthorizedByEmail } from "./authorization.js";
import { mountTypewriter } from "./typewriter/mountTypewriter.js";

function countWords(text) {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

function renderDesk(root) {
    root.innerHTML = `
        <div class="desk-shell">
            <div class="desk-toolbar" role="toolbar" aria-label="Typer toolbar">
                <div class="desk-toolbar-left">
                    <button class="desk-toolbar-btn" type="button" data-action="read">Read</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="write">Write</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="export">Export</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="logout">Logout</button>
                </div>

                <div class="desk-toolbar-right" aria-label="Desk status">
                    <button class="desk-toolbar-btn" type="button" data-action="pomodoro">Pomodoro</button>
                    <span class="desk-toolbar-sep">|</span>
                    <div class="desk-toolbar-item">
                        <button class="desk-toolbar-btn" type="button" data-action="word-count">Word Count</button>
                        <div class="desk-hoverbox" role="status" aria-live="polite">
                            <div class="desk-hoverbox-title">Word Count</div>
                            <div class="desk-hoverbox-value" id="word-count-value">0</div>
                        </div>
                    </div>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="last-saved">Last Saved</button>
                </div>
            </div>

            <div class="typewriter-stage">
                <div id="typewriter-root" class="typewriter-root" aria-label="Typewriter"></div>
            </div>
        </div>
    `;
}

export function initDeskPage({ rootId, redirectIfNotAuthedTo }) {
    const root = document.getElementById(rootId);
    if (!root) return;

    root.innerHTML = `<p class="tagline">Loading...</p>`;

    if (firebaseConfigError) {
        root.innerHTML = `<p class="typer-auth-error">${firebaseConfigError}</p>`;
        return;
    }

    subscribeToAuthChanges(async (user) => {
        if (!user) {
            if (redirectIfNotAuthedTo) window.location.replace(redirectIfNotAuthedTo);
            return;
        }

        const email = user.email ?? "";
        if (!isUserAuthorizedByEmail(email)) {
            try {
                await signOutUser();
            } finally {
                if (redirectIfNotAuthedTo) window.location.replace(redirectIfNotAuthedTo);
            }
            return;
        }

        renderDesk(root);
        const tw = mountTypewriter({
            root: root.querySelector("#typewriter-root"),
        });

        const toolbar = root.querySelector(".desk-toolbar");
        const setToolbarHeightVar = () => {
            const h = toolbar?.offsetHeight ?? 0;
            document.body.style.setProperty("--desk-toolbar-height", `${h}px`);
        };
        setToolbarHeightVar();
        window.addEventListener("resize", setToolbarHeightVar, { passive: true });

        const wordCountEl = root.querySelector("#word-count-value");
        const updateWordCount = () => {
            if (!wordCountEl || !tw) return;
            wordCountEl.textContent = String(countWords(tw.getValue()));
        };
        updateWordCount();
        if (tw?.el) tw.el.addEventListener("input", updateWordCount);

        if (toolbar) {
            toolbar.addEventListener("click", async (e) => {
                const btn = e.target?.closest?.("button[data-action]");
                const action = btn?.getAttribute?.("data-action");
                if (!action) return;

                if (action === "logout") {
                    try {
                        await signOutUser();
                    } finally {
                        if (redirectIfNotAuthedTo) window.location.replace(redirectIfNotAuthedTo);
                    }
                }
            });
        }
    });
}

