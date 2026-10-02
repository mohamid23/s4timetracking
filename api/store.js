import { Redis } from "@upstash/redis";

/* The app's entire shared backend: one serverless function, one Redis store,
   both provisioned from the same Vercel project this deploys from. No
   external service to stand up by hand, no URL to copy anywhere — every
   browser hitting this app talks to the same /api/store automatically.

   Protocol mirrors a tiny key/value store: get, set, list keys by prefix,
   plus an append-only log for activity/errors. "list" is backed by a
   separate index set since Redis doesn't do prefix scans by key pattern
   cheaply at this scale without one.

   Env var names vary by how the Redis integration was connected in the
   Vercel dashboard (Storage → Create Database, or Marketplace → Upstash),
   so this checks the handful of names Vercel is known to use rather than
   assuming one. */
function redisFromEnv() {
  const pairs = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["REDIS_REST_API_URL", "REDIS_REST_API_TOKEN"],
  ];
  for (const [urlKey, tokenKey] of pairs) {
    if (process.env[urlKey] && process.env[tokenKey]) {
      return new Redis({ url: process.env[urlKey], token: process.env[tokenKey] });
    }
  }
  return null;
}

const KEY_INDEX = "s4tt:__keys__";
const LOG_MAX = 2000;

const NOT_CONNECTED_MESSAGE =
  "Shared storage isn't connected in this Vercel project yet. In the Vercel dashboard: Storage → Create Database → pick a Redis option (Upstash) → connect it to this project → redeploy.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const redis = redisFromEnv();
  if (!redis) {
    res.status(200).json({ error: NOT_CONNECTED_MESSAGE });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { action } = body || {};

  try {
    if (action === "ping") {
      await redis.get("__ping__");
      res.json({ ok: true });
      return;
    }

    if (action === "get") {
      const value = await redis.get(body.key);
      res.json({ ok: true, value: value == null ? null : JSON.stringify(value) });
      return;
    }

    if (action === "set") {
      await redis.set(body.key, JSON.parse(body.value));
      await redis.sadd(KEY_INDEX, body.key);
      res.json({ ok: true });
      return;
    }

    if (action === "list") {
      const allKeys = (await redis.smembers(KEY_INDEX)) || [];
      const prefix = body.prefix || "";
      res.json({ ok: true, keys: allKeys.filter((k) => k.startsWith(prefix)) });
      return;
    }

    if (action === "log") {
      const row = { ts: Date.now(), kind: body.kind, ...body.entry };
      const logKey = `s4tt:log:${body.kind === "error" ? "error" : "activity"}`;
      await redis.lpush(logKey, JSON.stringify(row));
      await redis.ltrim(logKey, 0, LOG_MAX - 1);
      res.json({ ok: true });
      return;
    }

    if (action === "listLogs") {
      const logKey = `s4tt:log:${body.kind === "error" ? "error" : "activity"}`;
      const limit = body.limit || 200;
      const raw = (await redis.lrange(logKey, 0, limit - 1)) || [];
      const rows = raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
      res.json({ ok: true, rows });
      return;
    }

    res.status(400).json({ error: "Unknown action: " + action });
  } catch (err) {
    res.status(200).json({ error: String(err?.message || err) });
  }
}
