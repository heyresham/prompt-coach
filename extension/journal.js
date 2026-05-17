const JournalCrypto = {
  async deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  },
  async encrypt(key, data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
    return { iv: this.toBase64(iv), data: this.toBase64(new Uint8Array(ct)) };
  },
  async decrypt(key, iv64, data64) {
    const iv = this.fromBase64(iv64);
    const ct = this.fromBase64(data64);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(dec));
  },
  toBase64(buf) { return btoa(String.fromCharCode(...buf)); },
  fromBase64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
};

const JournalStorage = {
  _key: null,

  async _getMeta() {
    const { pcJournal } = await chrome.storage.local.get('pcJournal');
    return pcJournal || { version: 1, salt: null, entries: [], encrypted: false };
  },
  async _setMeta(meta) {
    await chrome.storage.local.set({ pcJournal: meta });
  },

  async addEntry(entry) {
    const meta = await this._getMeta();
    if (meta.encrypted && this._key) {
      const enc = await JournalCrypto.encrypt(this._key, entry);
      meta.entries.push(enc);
    } else {
      meta.entries.push({ plain: entry });
    }
    await this._setMeta(meta);
  },

  async getEntries() {
    const meta = await this._getMeta();
    const results = [];
    for (const e of meta.entries) {
      if (e.plain) { results.push(e.plain); }
      else if (e.iv && e.data && this._key) {
        try { results.push(await JournalCrypto.decrypt(this._key, e.iv, e.data)); }
        catch (err) { results.push({ error: 'Failed to decrypt entry' }); }
      } else {
        results.push({ error: 'Locked — passphrase required' });
      }
    }
    return results;
  },

  async getCount() {
    const meta = await this._getMeta();
    return meta.entries.length;
  },

  async clear() {
    await chrome.storage.local.remove('pcJournal');
    this._key = null;
  },

  async setPassphrase(passphrase) {
    const meta = await this._getMeta();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await JournalCrypto.deriveKey(passphrase, salt);
    // Encrypt any existing plaintext entries
    const newEntries = [];
    for (const e of meta.entries) {
      if (e.plain) {
        newEntries.push(await JournalCrypto.encrypt(key, e.plain));
      } else {
        newEntries.push(e);
      }
    }
    meta.salt = JournalCrypto.toBase64(salt);
    meta.entries = newEntries;
    meta.encrypted = true;
    this._key = key;
    await this._setMeta(meta);
  },

  async unlock(passphrase) {
    const meta = await this._getMeta();
    if (!meta.encrypted || !meta.salt) return false;
    const salt = JournalCrypto.fromBase64(meta.salt);
    const key = await JournalCrypto.deriveKey(passphrase, salt);
    // Test decryption on the first encrypted entry
    const testEntry = meta.entries.find(e => e.iv && e.data);
    if (testEntry) {
      try { await JournalCrypto.decrypt(key, testEntry.iv, testEntry.data); }
      catch (err) { return false; }
    }
    this._key = key;
    return true;
  },

  isUnlocked() { return !!this._key; },
  async isEncrypted() { return (await this._getMeta()).encrypted; }
};
