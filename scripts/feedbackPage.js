const FEEDBACK_EMAIL = "contact@trvrj.com";

const APP_LABELS = {
    adaman: "Adaman",
    duos: "Duos Name Generator",
    bastion: "Bastion Password Manager",
    trovebook: "Trovebook",
    milquetoast: "milquetoast",
};

const TYPE_LABELS = {
    feature_request: "Feature request",
    bug_report: "Bug report",
    general_feedback: "General feedback",
};

const form = document.getElementById("feedbackForm");
const statusEl = document.getElementById("feedbackFormStatus");
const homeFeedbackToggleBtn = document.getElementById("homeFeedbackToggleBtn");
const homeFeedbackPanel = document.getElementById("homeFeedbackPanel");
const ownerPinInput = document.getElementById("ownerPinInput");
const ownerLinks = document.getElementById("ownerLinks");

const OWNER_PIN = "1881";

function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message;
}

function setHomeFeedbackPanelExpanded(isExpanded) {
    if (!homeFeedbackPanel || !homeFeedbackToggleBtn) return;
    homeFeedbackPanel.hidden = !isExpanded;
    homeFeedbackToggleBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    homeFeedbackToggleBtn.textContent = isExpanded ? "Collapse form" : "Expand form";
}

if (homeFeedbackToggleBtn && homeFeedbackPanel) {
    setHomeFeedbackPanelExpanded(false);
    homeFeedbackToggleBtn.addEventListener("click", () => {
        const currentlyExpanded = homeFeedbackToggleBtn.getAttribute("aria-expanded") === "true";
        setHomeFeedbackPanelExpanded(!currentlyExpanded);
    });
}

if (ownerPinInput && ownerLinks) {
    ownerPinInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();

        const isCorrect = ownerPinInput.value.trim() === OWNER_PIN;
        if (isCorrect) {
            ownerLinks.hidden = false;
            ownerPinInput.value = "";
            ownerPinInput.blur();
            return;
        }

        ownerLinks.hidden = true;
        ownerPinInput.value = "";
        ownerPinInput.classList.remove("pin-error");
        void ownerPinInput.offsetWidth;
        ownerPinInput.classList.add("pin-error");
        ownerPinInput.blur();
    });
}

function buildFeedbackEmail({ appName, name, feedbackType, comment }) {
    const subject = `Feedback - ${appName}`;
    const cleanComment = comment.replace(/\r?\n/g, "\r\n");
    const body = `${appName}\r\n${name}\r\n${feedbackType}\r\n\r\n${cleanComment}`;
    return { subject, body };
}

if (form) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const appId = form.feedbackApp?.value ?? "";
        const appName = APP_LABELS[appId] ?? form.feedbackApp?.selectedOptions?.[0]?.textContent?.trim() ?? appId;
        const name = form.feedbackName?.value?.trim() ?? "";
        const typeValue = form.feedbackType?.value ?? "";
        const feedbackType = TYPE_LABELS[typeValue] ?? form.feedbackType?.selectedOptions?.[0]?.textContent?.trim() ?? typeValue;
        const comment = form.feedbackComment?.value?.trim() ?? "";

        if (!appName || !name || !feedbackType || !comment) return;

        const { subject, body } = buildFeedbackEmail({ appName, name, feedbackType, comment });
        const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoUrl;
        form.reset();
        setHomeFeedbackPanelExpanded(false);
        setStatus("Your email app should open with a pre-filled message. Send it to submit your feedback.");
    });
}
