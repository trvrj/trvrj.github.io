import { subscribeToAuthChanges, signOutUser } from "./auth.js";
import { firebaseConfigError } from "./firebaseClient.js";
import { isUserAuthorizedByEmail } from "./authorization.js";
import { mountTypewriter } from "./typewriter/mountTypewriter.js";
import {
    draftHasNonEmptyContent,
    loadTyperDraft,
    listTyperDocs,
    sanitizeDocId,
    saveTyperDraft,
} from "./draftFirestore.js";
import {
    exitDocumentFullscreen,
    getFullscreenElement,
    requestDocumentFullscreen,
} from "./fullscreenDesk.js";

const AUTOSAVE_MS = 60_000;

function storageDocKey(uid) {
    return `typer.docId.${uid}`;
}

/** User-facing message when Firestore rejects create/load (often missing rules on files subcollection). */
function firestoreErrorHint(err) {
    if (err?.code === "permission-denied") {
        return "Permission denied. In Firestore → Rules, allow read/write on typerDrafts/{uid}/files/{fileId} for signed-in users (same uid).";
    }
    if (typeof err?.message === "string" && err.message.length > 0 && err.message.length < 240) {
        return err.message;
    }
    return "Could not create that document.";
}

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
                    <button class="desk-toolbar-btn" type="button" data-action="new">New</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="open">Open</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="read">Read</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button
                        class="desk-toolbar-btn"
                        type="button"
                        data-action="focus"
                        id="focus-btn"
                        aria-pressed="false"
                    >Focus</button>
                    <span class="desk-toolbar-sep">|</span>
                    <button class="desk-toolbar-btn" type="button" data-action="logout">Logout</button>
                </div>

                <div class="desk-toolbar-right" aria-label="Desk status">
                    <div class="desk-toolbar-item">
                        <button
                            class="desk-toolbar-btn"
                            type="button"
                            data-action="pomodoro"
                            id="pomodoro-btn"
                            aria-expanded="false"
                            aria-controls="pomodoro-panel"
                        >Pomodoro</button>
                        <div
                            class="desk-popover"
                            id="pomodoro-panel"
                            role="region"
                            aria-label="Pomodoro timer"
                            hidden
                        ></div>
                    </div>
                    <span class="desk-toolbar-sep">|</span>
                    <div class="desk-toolbar-item">
                        <button class="desk-toolbar-btn" type="button" data-action="word-count">Word Count</button>
                        <div class="desk-hoverbox" role="status" aria-live="polite">
                            <div class="desk-hoverbox-value" id="word-count-value">0</div>
                        </div>
                    </div>
                    <span class="desk-toolbar-sep">|</span>
                    <div class="desk-toolbar-item">
                        <button class="desk-toolbar-btn" type="button" data-action="word-count-goal">Word Count Goal</button>
                        <div class="desk-hoverbox" id="word-goal-hoverbox" role="status" aria-live="polite">
                            <div class="desk-hoverbox-value" id="word-goal-value">0</div>
                        </div>
                    </div>
                    <span class="desk-toolbar-sep">|</span>
                    <span class="desk-toolbar-saved" aria-live="polite">Last saved: <span id="last-saved-status">—</span></span>
                </div>
            </div>

            <div class="desk-doc-title-bar" id="desk-doc-title-bar" hidden>
                <span class="desk-doc-title-text" id="desk-doc-title-text"></span>
            </div>

            <div class="typewriter-stage">
                <div id="typewriter-root" class="typewriter-root" aria-label="Typewriter"></div>
            </div>

            <div
                class="write-overlay"
                id="write-overlay"
                hidden
                role="dialog"
                aria-modal="true"
                aria-labelledby="write-overlay-heading"
                aria-hidden="true"
            >
                <div class="write-overlay-inner">
                    <h2 class="write-overlay-heading" id="write-overlay-heading">New document</h2>
                    <label class="write-overlay-label" for="write-doc-title-input">Title</label>
                    <input
                        class="write-overlay-input"
                        type="text"
                        id="write-doc-title-input"
                        name="doc-title"
                        autocomplete="off"
                        spellcheck="false"
                        placeholder="e.g. Op SS 001"
                    />
                    <p class="write-overlay-error" id="write-overlay-error" hidden></p>
                    <div class="write-overlay-actions">
                        <button type="button" class="desk-toolbar-btn write-overlay-cancel" data-action="write-overlay-cancel">
                            Cancel
                        </button>
                        <button type="button" class="desk-toolbar-btn write-overlay-confirm" data-action="write-overlay-confirm">
                            OK
                        </button>
                    </div>
                </div>
            </div>

            <div
                class="write-overlay"
                id="open-overlay"
                hidden
                role="dialog"
                aria-modal="true"
                aria-labelledby="open-overlay-heading"
                aria-hidden="true"
            >
                <div class="write-overlay-inner">
                    <h2 class="write-overlay-heading" id="open-overlay-heading">Open documents</h2>
                    <div class="write-overlay-actions">
                        <button type="button" class="desk-toolbar-btn open-overlay-close" data-action="open-overlay-close">
                            Close
                        </button>
                    </div>
                    <div class="open-doc-list" id="open-doc-list">Loading...</div>
                </div>
            </div>

            <div
                class="write-overlay"
                id="goal-overlay"
                hidden
                role="dialog"
                aria-modal="true"
                aria-labelledby="goal-overlay-heading"
                aria-hidden="true"
            >
                <div class="write-overlay-inner">
                    <h2 class="write-overlay-heading" id="goal-overlay-heading">Word count goal</h2>
                    <label class="write-overlay-label" for="goal-input">Words to add</label>
                    <input
                        class="write-overlay-input"
                        type="number"
                        id="goal-input"
                        name="goal-input"
                        min="1"
                        step="1"
                        inputmode="numeric"
                        placeholder="e.g. 250"
                    />
                    <p class="write-overlay-error" id="goal-overlay-error" hidden></p>
                    <div class="write-overlay-actions">
                        <button type="button" class="desk-toolbar-btn" data-action="goal-overlay-cancel">
                            Cancel
                        </button>
                        <button type="button" class="desk-toolbar-btn" data-action="goal-overlay-confirm">
                            Save
                        </button>
                    </div>
                </div>
            </div>

            <div
                class="read-overlay"
                id="read-overlay"
                hidden
                role="dialog"
                aria-modal="true"
                aria-label="Read document"
                aria-hidden="true"
            >
                <div class="read-overlay-inner">
                    <div class="read-overlay-header">
                        <button
                            type="button"
                            class="desk-toolbar-btn read-overlay-close"
                            data-action="close-read"
                        >Close</button>
                    </div>
                    <div class="read-overlay-body" id="read-overlay-content"></div>
                </div>
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
        const toolbar = root.querySelector(".desk-toolbar");
        const tw = mountTypewriter({
            root: root.querySelector("#typewriter-root"),
        });

        const uid = user.uid;
        let activeDocId = null;
        let lastPersisted = null;
        let wordGoalDelta = null;
        let wordGoalTarget = null;
        let wordGoalDocId = null;
        let goalShownForTarget = null;
        let goalRevealTimer = null;

        const wordCountEl = root.querySelector("#word-count-value");
        const wordGoalHoverbox = root.querySelector("#word-goal-hoverbox");
        const wordGoalValueEl = root.querySelector("#word-goal-value");
        const lastSavedEl = root.querySelector("#last-saved-status");

        function hideWordGoalReveal() {
            if (goalRevealTimer) {
                window.clearTimeout(goalRevealTimer);
                goalRevealTimer = null;
            }
            wordGoalHoverbox?.classList.remove("desk-hoverbox--visible");
        }

        function maybeShowWordGoalReveal(currentCount) {
            if (
                typeof wordGoalTarget !== "number" ||
                typeof wordGoalDelta !== "number" ||
                !wordGoalDocId ||
                !activeDocId ||
                activeDocId !== wordGoalDocId
            ) {
                return;
            }
            if (currentCount < wordGoalTarget) return;
            if (goalShownForTarget === wordGoalTarget) return;

            goalShownForTarget = wordGoalTarget;
            if (wordGoalValueEl) {
                wordGoalValueEl.textContent = String(wordGoalDelta);
            }
            wordGoalHoverbox?.classList.add("desk-hoverbox--visible");
            goalRevealTimer = window.setTimeout(() => {
                wordGoalHoverbox?.classList.remove("desk-hoverbox--visible");
                goalRevealTimer = null;
            }, 2000);
        }

        const updateWordCount = () => {
            if (!wordCountEl || !tw) return;
            const currentCount = countWords(tw.getValue());
            wordCountEl.textContent = String(currentCount);
            maybeShowWordGoalReveal(currentCount);
        };
        updateWordCount();
        if (tw?.el) tw.el.addEventListener("input", updateWordCount);

        const docTitleBar = root.querySelector("#desk-doc-title-bar");
        const docTitleText = root.querySelector("#desk-doc-title-text");
        const writeOverlay = root.querySelector("#write-overlay");
        const writeTitleInput = root.querySelector("#write-doc-title-input");
        const writeErrorEl = root.querySelector("#write-overlay-error");
        const goalOverlay = root.querySelector("#goal-overlay");
        const goalInput = root.querySelector("#goal-input");
        const goalErrorEl = root.querySelector("#goal-overlay-error");

        function setLastSavedStatus(text) {
            if (lastSavedEl) lastSavedEl.textContent = text;
        }

        function setDocTitleUI(docId) {
            if (!docTitleBar || !docTitleText) return;
            if (docId) {
                docTitleText.textContent = docId;
                docTitleBar.hidden = false;
            } else {
                docTitleText.textContent = "";
                docTitleBar.hidden = true;
            }
        }

        function showWriteError(msg) {
            if (!writeErrorEl) return;
            if (msg) {
                writeErrorEl.textContent = msg;
                writeErrorEl.hidden = false;
            } else {
                writeErrorEl.textContent = "";
                writeErrorEl.hidden = true;
            }
        }

        function showGoalError(msg) {
            if (!goalErrorEl) return;
            if (msg) {
                goalErrorEl.textContent = msg;
                goalErrorEl.hidden = false;
            } else {
                goalErrorEl.textContent = "";
                goalErrorEl.hidden = true;
            }
        }

        function openNewDocOverlay() {
            if (!writeOverlay || !writeTitleInput) return;
            writeTitleInput.value = "";
            showWriteError("");
            closeOpenOverlay();
            closeReadOverlay();
            closeGoalOverlay();
            writeOverlay.hidden = false;
            writeOverlay.setAttribute("aria-hidden", "false");
            queueMicrotask(() => writeTitleInput.focus());
        }

        function closeWriteOverlay() {
            if (!writeOverlay) return;
            writeOverlay.hidden = true;
            writeOverlay.setAttribute("aria-hidden", "true");
            showWriteError("");
        }

        function openGoalOverlay() {
            if (!goalOverlay || !goalInput) return;
            if (!activeDocId) {
                setLastSavedStatus("open a document first");
                return;
            }
            closeOpenOverlay();
            closeReadOverlay();
            closeWriteOverlay();
            showGoalError("");
            goalInput.value = "";
            goalOverlay.hidden = false;
            goalOverlay.setAttribute("aria-hidden", "false");
            queueMicrotask(() => goalInput.focus());
        }

        function closeGoalOverlay() {
            if (!goalOverlay) return;
            goalOverlay.hidden = true;
            goalOverlay.setAttribute("aria-hidden", "true");
            showGoalError("");
        }

        function confirmGoal() {
            if (!goalInput || !tw || !activeDocId) {
                setLastSavedStatus("open a document first");
                return false;
            }
            const raw = String(goalInput.value ?? "").trim();
            const parsed = Number.parseInt(raw, 10);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                showGoalError("Enter a whole number greater than 0.");
                return false;
            }

            const currentCount = countWords(tw.getValue());
            wordGoalDelta = parsed;
            wordGoalTarget = currentCount + parsed;
            wordGoalDocId = activeDocId;
            goalShownForTarget = null;
            hideWordGoalReveal();
            closeGoalOverlay();
            setLastSavedStatus(`goal set (+${parsed})`);
            return true;
        }

        async function persistCurrentDoc() {
            if (!tw || !activeDocId) return;
            const text = tw.getValue();
            if (text === lastPersisted) return;
            await saveTyperDraft(uid, activeDocId, text);
            lastPersisted = text;
            setLastSavedStatus(
                new Date().toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                }),
            );
        }

        /** Load an existing file from Firestore (e.g. last session). Does not create a doc. */
        async function loadDocId(raw) {
            const id = sanitizeDocId(raw);
            if (!id) return false;
            if (activeDocId === id) return true;
            try {
                if (activeDocId) {
                    try {
                        await persistCurrentDoc();
                    } catch (persistErr) {
                        console.error(persistErr);
                        setLastSavedStatus("save failed");
                        return false;
                    }
                }
                const draft = await loadTyperDraft(uid, id);
                tw.setValue(draft);
                lastPersisted = draft;
                activeDocId = id;
                try {
                    localStorage.setItem(storageDocKey(uid), id);
                } catch (_) {
                    /* ignore quota */
                }
                setDocTitleUI(id);
                setLastSavedStatus(draft.length > 0 ? "draft loaded" : "—");
                updateWordCount();
                return true;
            } catch (e) {
                console.error(e);
                setLastSavedStatus("load failed");
                return false;
            }
        }

        /** New overlay: create Firestore doc with empty body immediately, then clear editor. */
        async function confirmNewDocument() {
            const raw = writeTitleInput?.value ?? "";
            const id = sanitizeDocId(raw);
            if (!id) {
                showWriteError("Enter a valid title (no slashes; not empty).");
                return false;
            }
            if (activeDocId === id) {
                closeWriteOverlay();
                return true;
            }
            try {
                if (activeDocId) {
                    try {
                        await persistCurrentDoc();
                    } catch (persistErr) {
                        console.error(persistErr);
                        setLastSavedStatus("save failed");
                        showWriteError("Could not save the current document before starting a new one.");
                        return false;
                    }
                }
                const taken = await draftHasNonEmptyContent(uid, id);
                if (taken) {
                    showWriteError("A document with that title already exists. Choose another title.");
                    return false;
                }
                await saveTyperDraft(uid, id, "");
                tw.setValue("");
                lastPersisted = "";
                activeDocId = id;
                try {
                    localStorage.setItem(storageDocKey(uid), id);
                } catch (_) {
                    /* ignore quota */
                }
                setDocTitleUI(id);
                setLastSavedStatus(
                    new Date().toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                );
                updateWordCount();
                closeWriteOverlay();
                return true;
            } catch (e) {
                console.error(e);
                setLastSavedStatus("save failed");
                showWriteError(firestoreErrorHint(e));
                return false;
            }
        }

        try {
            const stored = localStorage.getItem(storageDocKey(uid));
            if (stored) {
                await loadDocId(stored);
            } else {
                setLastSavedStatus("—");
            }
        } catch (e) {
            console.error(e);
            setLastSavedStatus("load failed");
        }

        writeTitleInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                confirmNewDocument();
            }
        });
        goalInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                confirmGoal();
            }
        });

        async function runAutosave() {
            if (!tw || !activeDocId) return;
            const text = tw.getValue();
            if (text === lastPersisted) return;
            try {
                await saveTyperDraft(uid, activeDocId, text);
                lastPersisted = text;
                setLastSavedStatus(
                    new Date().toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                );
            } catch (e) {
                console.error(e);
                setLastSavedStatus("save failed");
            }
        }

        const autosaveTimer = window.setInterval(runAutosave, AUTOSAVE_MS);

        window.addEventListener(
            "beforeunload",
            () => {
                window.clearInterval(autosaveTimer);
            },
            { once: true },
        );

        const pomodoroPanel = root.querySelector("#pomodoro-panel");
        const pomodoroBtn = root.querySelector("#pomodoro-btn");
        const focusBtn = root.querySelector("#focus-btn");

        function updateFocusButton(isFocused) {
            if (!focusBtn) return;
            focusBtn.textContent = isFocused ? "Unfocus" : "Focus";
            focusBtn.setAttribute("aria-pressed", String(isFocused));
        }

        async function enterFocusMode() {
            toolbar.classList.add("desk-toolbar--faded");
            docTitleBar?.classList.add("desk-toolbar--faded");
            updateFocusButton(true);
            try {
                await requestDocumentFullscreen();
            } catch (err) {
                console.warn("Fullscreen not available or denied:", err);
            }
        }

        async function exitFocusMode() {
            try {
                await exitDocumentFullscreen();
            } catch (err) {
                console.warn("Exit fullscreen failed:", err);
            }
            toolbar.classList.remove("desk-toolbar--faded");
            docTitleBar?.classList.remove("desk-toolbar--faded");
            updateFocusButton(false);
        }

        function syncFocusFromFullscreen() {
            if (!getFullscreenElement() && toolbar.classList.contains("desk-toolbar--faded")) {
                toolbar.classList.remove("desk-toolbar--faded");
                docTitleBar?.classList.remove("desk-toolbar--faded");
                updateFocusButton(false);
            }
        }

        document.addEventListener("fullscreenchange", syncFocusFromFullscreen);
        document.addEventListener("webkitfullscreenchange", syncFocusFromFullscreen);

        const openOverlay = root.querySelector("#open-overlay");
        const openDocList = root.querySelector("#open-doc-list");
        const readOverlay = root.querySelector("#read-overlay");
        const readOverlayContent = root.querySelector("#read-overlay-content");

        function closeOpenOverlay() {
            if (!openOverlay) return;
            openOverlay.hidden = true;
            openOverlay.setAttribute("aria-hidden", "true");
        }

        async function openDeskOpenFiles() {
            if (!openOverlay || !openDocList) return;
            // Ensure only one dialog/overlay is visible.
            closeReadOverlay();
            closeWriteOverlay();
            closeGoalOverlay();

            openDocList.textContent = "Loading...";
            openOverlay.hidden = false;
            openOverlay.setAttribute("aria-hidden", "false");

            try {
                const docs = await listTyperDocs(uid);
                openDocList.textContent = "";

                if (!docs.length) {
                    openDocList.textContent = "No documents yet.";
                    return;
                }

                for (const docInfo of docs) {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "open-doc-item";
                    btn.textContent = docInfo.docId;
                    btn.dataset.openDocId = docInfo.docId;
                    if (docInfo.docId === activeDocId) {
                        btn.setAttribute("aria-current", "true");
                    }
                    openDocList.appendChild(btn);
                }
            } catch (e) {
                console.error(e);
                openDocList.textContent = firestoreErrorHint(e);
            }
        }

        function openReadOverlay() {
            if (!readOverlay || !readOverlayContent || !tw) return;
            closeOpenOverlay();
            closeWriteOverlay();
            closeGoalOverlay();
            readOverlayContent.textContent = tw.getValue();
            readOverlay.hidden = false;
            readOverlay.setAttribute("aria-hidden", "false");
        }

        function closeReadOverlay() {
            if (!readOverlay) return;
            readOverlay.hidden = true;
            readOverlay.setAttribute("aria-hidden", "true");
        }

        function onOverlayKeydown(e) {
            if (e.key !== "Escape") return;
            if (readOverlay && !readOverlay.hidden) {
                e.preventDefault();
                closeReadOverlay();
                return;
            }
            if (writeOverlay && !writeOverlay.hidden) {
                e.preventDefault();
                closeWriteOverlay();
                return;
            }
            if (goalOverlay && !goalOverlay.hidden) {
                e.preventDefault();
                closeGoalOverlay();
                return;
            }
            if (openOverlay && !openOverlay.hidden) {
                e.preventDefault();
                closeOpenOverlay();
            }
        }

        document.addEventListener("keydown", onOverlayKeydown);

        root.addEventListener("click", (e) => {
            const openDocBtn = e.target?.closest?.('[data-open-doc-id]');
            if (openDocBtn && openOverlay && !openOverlay.hidden) {
                e.preventDefault();
                const docId = openDocBtn.getAttribute("data-open-doc-id");
                if (docId) {
                    void loadDocId(docId)
                        .then(() => closeOpenOverlay())
                        .catch((err) => {
                            console.error(err);
                            setLastSavedStatus("load failed");
                        });
                }
                return;
            }

            const closeBtn = e.target?.closest?.('[data-action="close-read"]');
            if (closeBtn) {
                e.preventDefault();
                closeReadOverlay();
                return;
            }
            if (e.target?.closest?.('[data-action="write-overlay-cancel"]')) {
                e.preventDefault();
                closeWriteOverlay();
                return;
            }
            if (e.target?.closest?.('[data-action="write-overlay-confirm"]')) {
                e.preventDefault();
                confirmNewDocument();
                return;
            }
            if (e.target?.closest?.('[data-action="goal-overlay-cancel"]')) {
                e.preventDefault();
                closeGoalOverlay();
                return;
            }
            if (e.target?.closest?.('[data-action="goal-overlay-confirm"]')) {
                e.preventDefault();
                confirmGoal();
                return;
            }
            if (e.target?.closest?.('[data-action="open-overlay-close"]')) {
                e.preventDefault();
                closeOpenOverlay();
            }
        });

        if (toolbar) {
            toolbar.addEventListener("click", async (e) => {
                const btn = e.target?.closest?.("button[data-action]");
                const action = btn?.getAttribute?.("data-action");
                if (!action) return;

                if (action === "new") {
                    e.preventDefault();
                    openNewDocOverlay();
                    return;
                }

                if (action === "open") {
                    e.preventDefault();
                    openDeskOpenFiles();
                    return;
                }

                if (action === "read") {
                    e.preventDefault();
                    openReadOverlay();
                    return;
                }

                if (action === "word-count-goal") {
                    e.preventDefault();
                    openGoalOverlay();
                    return;
                }

                if (action === "focus") {
                    e.preventDefault();
                    const isFocused = toolbar.classList.contains("desk-toolbar--faded");
                    if (isFocused) {
                        await exitFocusMode();
                    } else {
                        await enterFocusMode();
                    }
                    return;
                }

                if (action === "pomodoro") {
                    e.preventDefault();
                    if (pomodoroPanel && pomodoroBtn) {
                        pomodoroPanel.hidden = !pomodoroPanel.hidden;
                        pomodoroBtn.setAttribute("aria-expanded", String(!pomodoroPanel.hidden));
                    }
                    return;
                }

                if (action === "logout") {
                    window.clearInterval(autosaveTimer);
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

