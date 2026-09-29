const DATA_REMOVAL_EMAIL = "support@trvrj.com";

const APP_LABELS = {
    wordparley: "Word Parley",
};

const homeDataToggleBtn = document.getElementById("homeDataToggleBtn");
const homeDataPanel = document.getElementById("homeDataPanel");
const dataForm = document.getElementById("dataRemovalForm");
const submitButton = document.getElementById("dataSubmitBtn");
const statusEl = document.getElementById("dataFormStatus");

function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
}

function setHomeDataPanelExpanded(isExpanded) {
    if (!homeDataPanel || !homeDataToggleBtn) return;
    homeDataPanel.hidden = !isExpanded;
    homeDataToggleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    homeDataToggleBtn.textContent = isExpanded ? "Collapse form" : "Expand form";
}

function buildDataRemovalEmail({ name, appName, email }) {
    const subject = `Data removal request - ${appName}`;
    const body = [
        `The user, ${name}, wishes to remove their data from ${appName}.`,
        "",
        email,
    ].join("\r\n");

    return { subject, body };
}

if (homeDataToggleBtn && homeDataPanel) {
    setHomeDataPanelExpanded(false);
    homeDataToggleBtn.addEventListener("click", () => {
        const currentlyExpanded = homeDataToggleBtn.getAttribute("aria-expanded") === "true";
        setHomeDataPanelExpanded(!currentlyExpanded);
    });
}

if (dataForm) {
    dataForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const appId = dataForm.dataApp?.value ?? "";
        const appName = APP_LABELS[appId] ?? dataForm.dataApp?.selectedOptions?.[0]?.textContent ?? appId;
        const name = dataForm.dataName?.value?.trim() ?? "";
        const email = dataForm.dataEmail?.value?.trim() ?? "";

        if (!name || !email || !appId) return;

        const { subject, body } = buildDataRemovalEmail({ name, appName, email });
        const mailtoUrl = `mailto:${DATA_REMOVAL_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoUrl;
        dataForm.reset();
        setHomeDataPanelExpanded(false);
        setStatus("Your email app should open with a pre-filled message. Send it to complete your request.");
    });
}
