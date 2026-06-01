import { entityStores } from "../data/defaults";

const DB_NAME = "life-planner-offline";
const DB_VERSION = 1;
const META_STORE = "meta";
const QUEUE_STORE = "syncQueue";

let dbPromise;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      [...entityStores, META_STORE, QUEUE_STORE].forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = callback(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllLocal(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function putLocal(storeName, record) {
  return tx(storeName, "readwrite", (store) => store.put(record));
}

export function deleteLocal(storeName, id) {
  return tx(storeName, "readwrite", (store) => store.delete(id));
}

export function queueMutation(mutation) {
  return putLocal(QUEUE_STORE, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...mutation });
}

export async function getQueue() {
  return getAllLocal(QUEUE_STORE);
}

export function removeQueueItem(id) {
  return deleteLocal(QUEUE_STORE, id);
}

export async function replaceLocalCollection(storeName, records, userId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
      (request.result || [])
        .filter((record) => !userId || record.userId === userId)
        .forEach((record) => store.delete(record.id));
      records.forEach((record) => store.put(record));
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
