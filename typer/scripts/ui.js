function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function renderAuthLoading(root) {
    root.innerHTML = `
        <div class="typer-auth-card">
            <p class="tagline">Loading auth...</p>
        </div>
    `;
}

export function renderAuthUI(
    root,
    {
        userEmail,
        authorized,
        showUnauthorizedDialog,
        busy,
        error,
        onSignIn,
        onSignOut,
        onUnauthorizedOk,
    },
) {
    const safeEmail = userEmail ? escapeHtml(userEmail) : null;
    const signedIn = !!safeEmail;
    const isAuthorized = signedIn && authorized === true;
    const isNotAuthorized = signedIn && authorized === false;

    root.innerHTML = `
        <div class="typer-auth-card">
            <div class="typer-auth-header">
                <h1 class="typer-auth-title">${isAuthorized ? "&lt; Typer &gt;" : "&lt; Sign In &gt;"}</h1>
            </div>

            <div class="typer-auth-status">
                ${
                    !signedIn
                        ? `<p>Not signed in.</p>`
                        : isAuthorized
                            ? `<p>Authorized as <span class="auth-user">${safeEmail}</span></p>`
                            : `<p class="typer-auth-error">Signed in as <span class="auth-user">${safeEmail}</span>, but not authorized.</p>`
                }
            </div>

            <div class="typer-auth-actions">
                <button class="typer-btn" id="typer-sign-in-btn" ${signedIn ? "style=\"display:none\"" : ""} ${busy ? "disabled" : ""}>
                    Sign in with Google
                </button>
                <button class="typer-btn typer-btn-secondary" id="typer-sign-out-btn" ${signedIn && !showUnauthorizedDialog ? "" : "style=\"display:none\""} ${busy ? "disabled" : ""}>
                    Sign out
                </button>
            </div>

            ${error ? `<p class="typer-auth-error">${escapeHtml(error)}</p>` : ""}
        </div>
        ${
            showUnauthorizedDialog && isNotAuthorized
                ? `
            <div class="typer-dialog-overlay" role="dialog" aria-modal="true" aria-label="Not authorized">
                <div class="typer-dialog">
                    <h2 class="typer-dialog-title">&lt; Not Authorized &gt;</h2>
                    <p class="typer-dialog-message">This account is not allowed to access the Typer page.</p>
                    <p class="typer-dialog-submessage">Signed in as <span class="auth-user">${safeEmail}</span>.</p>
                    <div class="typer-dialog-actions">
                        <button class="typer-btn" id="typer-unauthorized-ok" ${busy ? "disabled" : ""}>
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `
                : ""
        }
    `;

    const signInBtn = root.querySelector("#typer-sign-in-btn");
    const signOutBtn = root.querySelector("#typer-sign-out-btn");
    const okBtn = root.querySelector("#typer-unauthorized-ok");

    if (signInBtn) signInBtn.addEventListener("click", onSignIn);
    if (signOutBtn) signOutBtn.addEventListener("click", onSignOut);
    if (okBtn) okBtn.addEventListener("click", onUnauthorizedOk);
}

