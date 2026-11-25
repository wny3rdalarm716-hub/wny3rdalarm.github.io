// Local device test history. No payloads, device tokens, locations or accounts.
(() => {
  const kinds = new Set(['local', 'remote']);
  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('wny-test-notification-history', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('tests', {keyPath: 'id', autoIncrement: true});
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(Error('History storage blocked'));
    });
  }
  async function transact(mode, work) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('tests', mode), store = tx.objectStore('tests');
        let result;
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(tx.error || Error('History unavailable'));
        work(store, value => {result = value;});
      });
    } finally { db.close(); }
  }
  async function record(kind) {
    if (!kinds.has(kind)) return;
    await transact('readwrite', store => {
      store.add({kind, at: Date.now()});
      let count = 0;
      const req = store.openCursor(null, 'prev');
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if (++count > 50 || cursor.value.at < Date.now() - 7 * 86400000) cursor.delete();
        cursor.continue();
      };
    });
    globalThis.document?.dispatchEvent(new Event('wny-history-refresh'));
  }
  function read() {
    return transact('readonly', (store, result) => {
      const req = store.getAll();
      req.onsuccess = () => result(req.result.filter(x => kinds.has(x.kind) && Number.isFinite(x.at) && x.at >= Date.now() - 7*86400000).reverse().slice(0,50));
    });
  }
  function clear() { return transact('readwrite', store => {store.clear();}); }
  globalThis.wnyNotificationHistory = {record,read,clear};
})();
