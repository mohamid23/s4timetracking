const LOCAL_PREFIX = "s4tt.local.";
const SYNC_URL_KEY = "s4tt.sync.url";

const mem = {};

const ls = {
  get(k) {
    try {
      const v = window.localStorage.getItem(LOCAL_PREFIX + k);
      return v == null ? null : JSON.parse(v);
    } catch {
      return mem[k] ?? null;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(LOCAL_PREFIX + k, JSON.stringify(v));
      return true;
    } catch {
      mem[k] = v;
      return true;
    }
  },
  keys(prefix) {
    try {
      const out = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LOCAL_PREFIX + prefix)) out.push(k.slice(LOCAL_PREFIX.length));
      }
      return out;
    } catch {
      return Object.keys(mem).filter((k) => k.startsWith(prefix));
    }
  },
};

/* Two ways to run.
   Local only: everything sits in this browser, which is fine for one person or a trial.
   Synced: point the app at a Google Apps Script endpoint and the whole team shares one book.
   Either way a local copy is always written, so a sync outage never costs anyone their week. */
export const S = {
  mode: "local",
  url: "",
  online: true,
  onStatus: null,
  onError: null,

  setUrl(url) {
    this.url = (url || "").trim();
    this.mode = this.url ? "remote" : "local";
    this.online = true;
    try {
      if (this.url) window.localStorage.setItem(SYNC_URL_KEY, this.url);
      else window.localStorage.removeItem(SYNC_URL_KEY);
    } catch {}
  },

  loadUrl() {
    try {
      const u = window.localStorage.getItem(SYNC_URL_KEY);
      if (u) this.setUrl(u);
    } catch {}
    return this.url;
  },

  async call(action, payload) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error("Sync endpoint returned " + res.status);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  flag(ok, err) {
    if (this.online !== ok) {
      this.online = ok;
      if (this.onStatus) this.onStatus(ok, err);
    } else if (!ok && this.onStatus) {
      this.onStatus(ok, err);
    }
    if (!ok && this.onError) this.onError(err);
  },

  async ping(url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "ping" }),
    });
    if (!res.ok) throw new Error("Endpoint returned " + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Endpoint did not answer as expected");
    return true;
  },

  async get(key) {
    if (this.mode === "remote") {
      try {
        const r = await this.call("get", { key });
        this.flag(true);
        const val = r.value == null ? null : JSON.parse(r.value);
        if (val !== null) ls.set(key, val);
        return val;
      } catch (e) {
        this.flag(false, e.message);
      }
    }
    return ls.get(key);
  },

  async set(key, value) {
    ls.set(key, value);
    if (this.mode === "remote") {
      try {
        await this.call("set", { key, value: JSON.stringify(value) });
        this.flag(true);
        return true;
      } catch (e) {
        this.flag(false, e.message);
        return false;
      }
    }
    return true;
  },

  async list(prefix) {
    if (this.mode === "remote") {
      try {
        const r = await this.call("list", { prefix });
        this.flag(true);
        return r.keys || [];
      } catch (e) {
        this.flag(false, e.message);
      }
    }
    return ls.keys(prefix);
  },

  async getPersonal(key) {
    return ls.get("personal." + key);
  },

  async setPersonal(key, value) {
    return ls.set("personal." + key, value);
  },

  /* Fire-and-forget activity/error logging. Never blocks the UI and never throws:
     a logging outage must not be able to take down the app it's trying to observe. */
  log(kind, entry) {
    const row = { ts: Date.now(), kind, ...entry };
    try {
      const key = kind === "error" ? "s4tt:log:error" : "s4tt:log:activity";
      const existing = ls.get(key) || [];
      existing.push(row);
      ls.set(key, existing.slice(-500));
    } catch {}
    if (this.mode === "remote") {
      this.call("log", { kind, entry: row }).catch(() => {});
    }
  },

  /* Local-only fallback so the log viewer has something to show even without a
     shared endpoint connected; remote mode merges in what the backend has too. */
  async listLogs(kind, limit = 200) {
    const localKey = kind === "error" ? "s4tt:log:error" : "s4tt:log:activity";
    const local = (ls.get(localKey) || []).slice(-limit).reverse();
    if (this.mode !== "remote") return local;
    try {
      const r = await this.call("listLogs", { kind, limit });
      this.flag(true);
      return r.rows || local;
    } catch (e) {
      this.flag(false, e.message);
      return local;
    }
  },

  async invite({ email, role, inviter, appUrl }) {
    if (this.mode !== "remote") return { ok: false, error: "Connect the shared endpoint under Setup first." };
    try {
      const r = await this.call("invite", { email, role, inviter, appUrl });
      this.flag(true);
      return r.error ? { ok: false, error: r.error } : { ok: true };
    } catch (e) {
      this.flag(false, e.message);
      return { ok: false, error: e.message };
    }
  },
};
