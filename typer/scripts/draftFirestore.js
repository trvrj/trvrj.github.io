import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebaseClient.js";

const TOP = "typerDrafts";
const FILES = "files";

function fileDocRef(uid, docId) {
    return doc(db, TOP, uid, FILES, docId);
}

function filesCollectionRef(uid) {
    return collection(db, TOP, uid, FILES);
}

/** Returns a Firestore-safe doc id string, or null if invalid. */
export function sanitizeDocId(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    if (s === "." || s === "..") return null;
    if (s.includes("/")) return null;
    if (new TextEncoder().encode(s).length > 1500) return null;
    return s;
}

export async function loadTyperDraft(uid, docId) {
    if (!db || !uid || !docId) return "";
    const snap = await getDoc(fileDocRef(uid, docId));
    if (!snap.exists()) return "";
    const data = snap.data();
    return typeof data.content === "string" ? data.content : "";
}

/** True if the file doc exists and `content` has non-whitespace text. */
export async function draftHasNonEmptyContent(uid, docId) {
    if (!db || !uid || !docId) return false;
    const snap = await getDoc(fileDocRef(uid, docId));
    if (!snap.exists()) return false;
    const data = snap.data();
    const c = typeof data.content === "string" ? data.content : "";
    return c.trim().length > 0;
}

export async function saveTyperDraft(uid, docId, content) {
    if (!db || !uid || !docId) throw new Error("Firestore not available.");
    await setDoc(
        fileDocRef(uid, docId),
        {
            content: String(content ?? ""),
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    );
}

/**
 * Lists all typer docs for a user.
 * Returns [{ docId, content }] sorted by updatedAt desc (best-effort).
 */
export async function listTyperDocs(uid) {
    if (!db || !uid) return [];
    const snap = await getDocs(
        query(filesCollectionRef(uid), orderBy("updatedAt", "desc")),
    );
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            docId: d.id,
            content: typeof data.content === "string" ? data.content : "",
        };
    });
}
