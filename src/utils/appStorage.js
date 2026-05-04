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
  // IDB uses structured cloning; if something in `data` is not cloneable,
  // we fall back to storing a JSON string.
  try {
    await db.put("vendorData", { data, savedAt: Date.now(), isJson: false }, vendorKey);
  } catch (err) {
    try {
      const json = JSON.stringify(data);
      await db.put(
        "vendorData",
        { data: json, savedAt: Date.now(), isJson: true },
        vendorKey
      );
    } catch (e2) {
      console.error("saveVendorData: failed structured clone and JSON", vendorKey, e2);
      throw e2;
    }
  }
}

export async function loadVendorData(vendorKey) {
  const db = await dbPromise;
  const record = await db.get("vendorData", vendorKey);
  if (!record) return undefined;
  if (record.isJson && typeof record.data === "string") {
    try {
      return { ...record, data: JSON.parse(record.data) };
    } catch {
      return record;
    }
  }
  return record;
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

