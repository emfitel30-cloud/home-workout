import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase.js";

export async function getActiveCollection(collectionName) {
  const q = query(collection(db, collectionName), where("active", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function getUserLogs(userId) {
  const q = query(collection(db, "activity_logs"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function saveActivityLog(logData) {
  return addDoc(collection(db, "activity_logs"), {
    ...logData,
    createdAt: serverTimestamp(),
    createdAtLocal: new Date().toISOString(),
  });
}

export async function deleteActivityLog(logId) {
  return deleteDoc(doc(db, "activity_logs", logId));
}
