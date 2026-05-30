import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    doc,
    where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, firebaseConfigError } from "./firebaseClient.js";

const FEEDBACK_COLLECTION = "feedback";

function feedbackCollectionRef() {
    if (!db) {
        throw new Error(firebaseConfigError || "Firestore not configured.");
    }
    return collection(db, FEEDBACK_COLLECTION);
}

function toSafeString(value, maxLength) {
    return String(value ?? "").trim().slice(0, maxLength);
}

export async function submitFeedback({ appId, appLabel, username, email, type, comment }) {
    const payload = {
        app: toSafeString(appLabel, 120),
        appId: toSafeString(appId, 60),
        appLabel: toSafeString(appLabel, 120),
        username: toSafeString(username, 80),
        email: toSafeString(email, 160),
        type: toSafeString(type, 40),
        comment: toSafeString(comment, 4000),
        status: "new",
        published: false,
        createdAt: serverTimestamp(),
    };

    if (!payload.app || !payload.username || !payload.type || !payload.comment) {
        throw new Error("App, name, feedback type, and comment are required.");
    }

    await addDoc(feedbackCollectionRef(), payload);
}

export async function listPendingFeedback() {
    const q = query(feedbackCollectionRef(), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.status === "new" || item.status === "pending");
}

export async function acceptFeedback(feedbackId) {
    if (!feedbackId) throw new Error("Missing feedback id.");
    const ref = doc(feedbackCollectionRef(), feedbackId);
    await updateDoc(ref, {
        status: "accepted",
        published: true,
    });
}

export async function rejectFeedback(feedbackId) {
    if (!feedbackId) throw new Error("Missing feedback id.");
    const ref = doc(feedbackCollectionRef(), feedbackId);
    await updateDoc(ref, {
        status: "rejected",
        published: false,
    });
}

export async function listAcceptedFeedback() {
    const q = query(feedbackCollectionRef(), where("published", "==", true));
    const snap = await getDocs(q);
    return snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
            const aMs = a?.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bMs = b?.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bMs - aMs;
        });
}
