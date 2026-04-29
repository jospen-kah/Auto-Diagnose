import { openDB } from "idb";

const DB_NAME = "kpi-dashboard";
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("vendorData")) {
      db.createObjectStore("vendorData");
    }
    if (!db.objectStoreNames.contains("assembleData")) {
      db.createObjectStore("assembleData");
    }
  },
});

export async function saveVendorData(vendorKey, data) {
  const db = await dbPromise;
  await db.put("vendorData", { data, savedAt: Date.now() }, vendorKey);
}

export async function loadVendorData(vendorKey) {
  const db = await dbPromise;
  return await db.get("vendorData", vendorKey);
}

export async function clearVendorData(vendorKey) {
  const db = await dbPromise;
  await db.delete("vendorData", vendorKey);
}

export async function saveAssembleData(key, data) {
  const db = await dbPromise;
  await db.put("assembleData", { data, savedAt: Date.now() }, key);
}

export async function loadAssembleData(key) {
  const db = await dbPromise;
  return await db.get("assembleData", key);
}

