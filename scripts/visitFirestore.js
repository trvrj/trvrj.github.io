import {
    Timestamp,
    addDoc,
    collection,
    getCountFromServer,
    getDocs,
    limit,
    orderBy,
    query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, firebaseConfigError } from "./firebaseClient.js";

const SITE_VISITS_COLLECTION = "siteVisits";

function siteVisitsCollectionRef() {
    if (!db) {
        throw new Error(firebaseConfigError || "Firestore not configured.");
    }
    return collection(db, SITE_VISITS_COLLECTION);
}

function safeText(value, maxLength) {
    return String(value ?? "").trim().slice(0, maxLength);
}

export async function recordSiteVisit({
    pagePath,
    referrerDomain,
    deviceCategory,
    browserLanguage,
    timezone,
}) {
    const payload = {
        pagePath: safeText(pagePath || "/", 300),
        timestamp: Timestamp.now(),
        referrerDomain: safeText(referrerDomain, 120),
        deviceCategory: safeText(deviceCategory, 20),
        browserLanguage: safeText(browserLanguage, 40),
        timezone: safeText(timezone, 80),
    };

    await addDoc(siteVisitsCollectionRef(), payload);
}

export async function listRecentSiteVisits(maxItems = 100) {
    const capped = Math.max(1, Math.min(Number(maxItems) || 100, 250));
    const q = query(siteVisitsCollectionRef(), orderBy("timestamp", "desc"), limit(capped));
    const snap = await getDocs(q);
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getTotalSiteVisits() {
    const countSnap = await getCountFromServer(query(siteVisitsCollectionRef()));
    return Number(countSnap.data()?.count ?? 0);
}
