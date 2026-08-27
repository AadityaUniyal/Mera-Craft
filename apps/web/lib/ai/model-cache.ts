/**
 * MINDCRAFT — Browser IndexedDB Model Cache Manager
 * Caches neural network ONNX binary ArrayBuffers in browser IndexedDB
 * allowing subsequent loads to achieve 0ms network latency.
 */

const DB_NAME = "mindcraft_model_cache_v1";
const STORE_NAME = "onnx_models";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported in current environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "uri" });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function getCachedModelBuffer(uri: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(uri);

      request.onsuccess = () => {
        if (request.result && request.result.buffer instanceof ArrayBuffer) {
          resolve(request.result.buffer);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function saveModelBuffer(uri: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const item = {
        uri,
        buffer,
        cachedAt: Date.now(),
        sizeBytes: buffer.byteLength,
      };
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  } catch {}
}

export async function fetchAndCacheModel(uri: string): Promise<ArrayBuffer> {
  // 1. Try reading from IndexedDB
  const cached = await getCachedModelBuffer(uri);
  if (cached) {
    console.log(`[+] Loaded model from IndexedDB Cache (0ms network): ${uri}`);
    return cached;
  }

  // 2. Fetch from server
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch model binary from ${uri}: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // 3. Write to IndexedDB asynchronously
  saveModelBuffer(uri, arrayBuffer).catch(() => {});

  return arrayBuffer;
}
