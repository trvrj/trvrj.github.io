import { isFirebaseConfigured, firebaseConfigError } from "./firebaseClient.js";
import { submitFeedback } from "./feedbackFirestore.js";

const APP_LABELS = {
    duos: "Duos Name Generator",
    adaman: "Adaman",
    bastion: "Bastion Password Manager",
    trovebook: "Trovebook",
};

const form = document.getElementById("feedbackForm");
const submitButton = document.getElementById("feedbackSubmitBtn");
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

function setSubmitting(isSubmitting) {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Submitting..." : "Submit";
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

if (form) {
    if (!isFirebaseConfigured) {
        setStatus(firebaseConfigError);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!isFirebaseConfigured) {
            setStatus(firebaseConfigError);
            return;
        }

        const appId = form.feedbackApp?.value ?? "";
        const appLabel = APP_LABELS[appId] ?? "";
        const username = form.feedbackName?.value ?? "";
        const email = form.feedbackEmail?.value ?? "";
        const type = form.feedbackType?.value ?? "";
        const comment = form.feedbackComment?.value ?? "";

        try {
            setSubmitting(true);
            setStatus("Submitting feedback...");
            await submitFeedback({ appId, appLabel, username, email, type, comment });
            form.reset();
            setStatus("Thanks! Your feedback is pending review.");
            setHomeFeedbackPanelExpanded(false);
        } catch (error) {
            setStatus(error?.message || "Could not submit feedback.");
        } finally {
            setSubmitting(false);
        }
    });
}
