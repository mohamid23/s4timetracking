const LOCAL_PREFIX = "s4tt.local.";

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

/* The shared backend is a Vercel serverless function (/api/store) backed by
   Vercel KV, deployed as part of this same project — every browser talks to
   it automatically, nothing to configure. A local copy is always written
   too, so a storage outage never costs anyone their week; it just means
   this browser is temporarily the only one that's seen the change. */
export const S = {
  online: true,
  onStatus: null,
  onError: null,

  async call(action, payload) {
    const res = await fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error("Shared storage returned " + res.status);
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

  async get(key) {
    try {
      const r = await this.call("get", { key });
      this.flag(true);
      const val = r.value == null ? null : JSON.parse(r.value);
      if (val !== null) ls.set(key, val);
      return val;
    } catch (e) {
      this.flag(false, e.message);
      return ls.get(key);
    }
  },

  async set(key, value) {
    ls.set(key, value);
    try {
      await this.call("set", { key, value: JSON.stringify(value) });
      this.flag(true);
      return true;
    } catch (e) {
      this.flag(false, e.message);
      return false;
    }
  },

  async list(prefix) {
    try {
      const r = await this.call("list", { prefix });
      this.flag(true);
      return r.keys || [];
    } catch (e) {
      this.flag(false, e.message);
      return ls.keys(prefix);
    }
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
    this.call("log", { kind, entry: row }).catch(() => {});
  },

  /* Local-only fallback so the log viewer has something to show even if the
     shared store is temporarily unreachable; normally this just merges in
     what the backend has. */
  async listLogs(kind, limit = 200) {
    const localKey = kind === "error" ? "s4tt:log:error" : "s4tt:log:activity";
    const local = (ls.get(localKey) || []).slice(-limit).reverse();
    try {
      const r = await this.call("listLogs", { kind, limit });
      this.flag(true);
      return r.rows && r.rows.length ? r.rows : local;
    } catch (e) {
      this.flag(false, e.message);
      return local;
    }
  },

  async auth(action, payload) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      return await res.json();
    } catch {
      return { ok: false, error: "Can't reach the shared account service right now." };
    }
  },

  async hasPassword(email) {
    const r = await this.auth("hasPassword", { email });
    return !!r.hasPassword;
  },

  async login(email, password) {
    return this.auth("login", { email, password });
  },

  /* Emails a time-limited link so the setup step proves the person actually
     controls that inbox, rather than just typing a name they found. */
  async requestSetup({ email, name, inviter }) {
    return this.auth("requestSetup", { email, name, inviter, appUrl: window.location.origin });
  },

  async verifySetupToken(token) {
    return this.auth("verifySetupToken", { token });
  },

  async setPassword(token, password) {
    return this.auth("setPassword", { token, password });
  },

  /* Returns a token to build a shareable link from, without emailing it —
     for pasting into Slack/text yourself. */
  async createSetupLink(email) {
    return this.auth("createSetupLink", { email });
  },

  /* No proof of inbox ownership — just lets someone set the first password
     on an account that doesn't have one yet. */
  async setPasswordDirect(email, password) {
    return this.auth("setPasswordDirect", { email, password });
  },
};
