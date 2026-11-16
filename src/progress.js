export function createExplorerProgress({ request, storage, demoMode, changed, validId }) {
  const savedIds = key => {
    const value = storage.get(key, []);
    return new Set(Array.isArray(value) ? value.filter(validId) : []);
  };
  const guest = { explored: savedIds('echoes-opened-v2'), read: savedIds('echoes-read-v3') };
  const progress = {
    ...guest,
    scope: null,
    status: demoMode ? 'guest' : 'loading',
    refresh,
    record,
    importGuest,
    canImport
  };
  const pending = new Map();
  let refreshing = false;
  let flushing = false;

  function apply(target, id, status) {
    target.explored.add(id);
    if (status === 'read') target.read.add(id);
    if (status === 'unread') target.read.delete(id);
  }

  function update(status) {
    progress.status = status;
    changed();
  }

  function queueKey(kind) {
    return `echoes-passport-${kind}-${progress.scope}`;
  }

  function saveQueue() {
    storage.set(queueKey('queue'), [...pending.values()]);
  }

  function guestChanges() {
    return [...new Set([...guest.read, ...guest.explored])].map(id => ({
      id, status: guest.read.has(id) ? 'import-read' : 'open'
    }));
  }

  function canImport() {
    const items = guestChanges();
    return Boolean(progress.scope && items.length &&
      JSON.stringify(items) !== storage.get(queueKey('imported'), ''));
  }

  async function importGuest() {
    if (!canImport() || refreshing || flushing) return;
    const scope = progress.scope;
    const items = guestChanges();
    const fingerprint = JSON.stringify(items);
    for (const item of items) {
      if (!pending.has(item.id)) pending.set(item.id, item);
    }
    saveQueue();
    if (await flush() && progress.scope === scope) {
      storage.set(queueKey('imported'), fingerprint);
      await refresh();
    }
  }

  async function refresh() {
    if (demoMode || refreshing || flushing) return;
    refreshing = true;
    try {
      const response = await request('/api/progress', { cache: 'no-store' });
      if (response.status === 401) {
        Object.assign(progress, guest, { scope: null });
        pending.clear();
        update('guest');
        return;
      }
      if (!response.ok) throw new Error('Passport unavailable');
      const { scope, progress: rows } = await response.json();
      if (scope !== progress.scope) {
        progress.scope = scope;
        pending.clear();
        for (const item of storage.get(queueKey('queue'), [])) pending.set(item.id, item);
      }
      progress.explored = new Set(rows.map(row => row.id));
      progress.read = new Set(rows.filter(row => row.read).map(row => row.id));
      for (const item of pending.values()) apply(progress, item.id, item.status);
      update(pending.size ? 'syncing' : 'synced');
    } catch {
      update('error');
      return;
    } finally {
      refreshing = false;
    }
    if (pending.size) await flush();
  }

  function record(id, status) {
    if (status === 'open' && progress.explored.has(id)) return;
    apply(progress, id, status);
    if (!progress.scope) {
      storage.set('echoes-opened-v2', [...guest.explored]);
      storage.set('echoes-read-v3', [...guest.read]);
      changed();
      return;
    }
    pending.set(id, { id, status });
    saveQueue();
    if (refreshing || flushing) update('syncing');
    void flush();
  }

  async function flush() {
    if (flushing || refreshing) return false;
    flushing = true;
    const scope = progress.scope;
    update('syncing');
    try {
      while (pending.size) {
        const changes = [...pending.values()].slice(0, 40);
        const response = await request('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, changes }),
          keepalive: true
        });
        if (response.status === 409 || response.status === 401) {
          flushing = false;
          void refresh();
          return false;
        }
        if (!response.ok) throw new Error('Passport save failed');
        for (const item of changes) {
          if (pending.get(item.id) === item) pending.delete(item.id);
        }
        saveQueue();
      }
      update('synced');
      return true;
    } catch {
      update('error');
      return false;
    } finally {
      flushing = false;
    }
  }

  return progress;
}
