const DB_NAME = 'collage-editor-db';
const STORE_NAME = 'projects';
const AUTO_SAVE_KEY = 'autosave';
const DB_VERSION = 1;

export interface StoredProject {
  id: string;
  name: string;
  savedAt: string;
  data: string; // CollageProjectFile JSON string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAutoProject(value: string) {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, AUTO_SAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

export async function loadAutoProject(): Promise<string | null> {
  const database = await openDatabase();
  const result = await new Promise<string | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(AUTO_SAVE_KEY);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => reject(request.error);
  });

  database.close();
  return result;
}

export async function saveProject(project: StoredProject): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(project, project.id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function loadProjectById(id: string): Promise<StoredProject | null> {
  const database = await openDatabase();
  const result = await new Promise<StoredProject | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function deleteProjectById(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function listProjects(): Promise<StoredProject[]> {
  const database = await openDatabase();
  const result = await new Promise<StoredProject[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    const list: StoredProject[] = [];
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.key !== AUTO_SAVE_KEY && cursor.key !== 'active-project-id' && typeof cursor.value === 'object' && cursor.value !== null && 'id' in cursor.value) {
          list.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(list);
      }
    };
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function getActiveProjectId(): Promise<string | null> {
  const database = await openDatabase();
  const result = await new Promise<string | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get('active-project-id');
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function setActiveProjectId(id: string | null): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    if (id === null) {
      transaction.objectStore(STORE_NAME).delete('active-project-id');
    } else {
      transaction.objectStore(STORE_NAME).put(id, 'active-project-id');
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
