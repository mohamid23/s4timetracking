import crypto from "node:crypto";
import { Resend } from "resend";
import { redisFromEnv, NOT_CONNECTED_MESSAGE } from "./_lib/redis.js";

/* Real accounts: a password per person, never stored in plaintext, and a
   time-limited emailed link to prove the person setting the password
   actually controls that inbox. Everything lives in the same Redis store
   as the rest of the app's data — no separate user database. */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const credKey = (email) => `s4tt:cred:${email.trim().toLowerCase()}`;
const tokenKey = (token) => `s4tt:authtoken:${token}`;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendSetupEmail({ email, name, inviter, appUrl, token }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY isn't set in this Vercel project yet, so no email was sent." };
  }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM || "S4 Connect <onboarding@resend.dev>";
  const link = `${appUrl}/?setpw=${token}`;
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject: "Set your password for S4 Connect Time and Profitability",
      html: `
        <p>Hi${name ? ` ${name}` : ""},</p>
        <p>${inviter || "Your team"} added you to S4 Connect's time and profitability tool.</p>
        <p><a href="${link}">Set your password and sign in</a></p>
        <p>This link works for 24 hours. If you didn't expect this, you can ignore it.</p>
      `,
    });
    if (error) return { ok: false, error: error.message || JSON.stringify(error) };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

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
    if (action === "hasPassword") {
      const stored = await redis.get(credKey(body.email || ""));
      res.json({ ok: true, hasPassword: !!stored });
      return;
    }

    if (action === "login") {
      const stored = await redis.get(credKey(body.email || ""));
      if (!stored || !verifyPassword(body.password || "", stored)) {
        res.json({ ok: false, error: "Wrong email or password." });
        return;
      }
      res.json({ ok: true });
      return;
    }

    if (action === "requestSetup") {
      const email = String(body.email || "").trim();
      if (!email) {
        res.json({ ok: false, error: "Missing email." });
        return;
      }
      const token = crypto.randomBytes(24).toString("hex");
      await redis.set(tokenKey(token), JSON.stringify({ email, exp: Date.now() + TOKEN_TTL_MS }), {
        ex: Math.ceil(TOKEN_TTL_MS / 1000),
      });
      const sent = await sendSetupEmail({
        email,
        name: body.name,
        inviter: body.inviter,
        appUrl: body.appUrl || "",
        token,
      });
      res.json(sent);
      return;
    }

    /* Same token as requestSetup, just handed back to the admin to paste into
       Slack/text themselves instead of emailed automatically — for when
       outbound email isn't set up or isn't landing. */
    if (action === "createSetupLink") {
      const email = String(body.email || "").trim();
      if (!email) {
        res.json({ ok: false, error: "Missing email." });
        return;
      }
      const token = crypto.randomBytes(24).toString("hex");
      await redis.set(tokenKey(token), JSON.stringify({ email, exp: Date.now() + TOKEN_TTL_MS }), {
        ex: Math.ceil(TOKEN_TTL_MS / 1000),
      });
      res.json({ ok: true, token });
      return;
    }

    /* No token: anyone who knows a teammate's email can set its first
       password if one hasn't been set yet. Acceptable trade-off for an
       internal tool when email delivery isn't available — the account still
       requires a password to sign in afterward, this only skips proving
       inbox ownership up front. */
    if (action === "setPasswordDirect") {
      const email = String(body.email || "").trim();
      if (!email) {
        res.json({ ok: false, error: "Missing email." });
        return;
      }
      const existing = await redis.get(credKey(email));
      if (existing) {
        res.json({ ok: false, error: "This account already has a password. Use \"Forgot password\" instead." });
        return;
      }
      if (!body.password || body.password.length < 8) {
        res.json({ ok: false, error: "Password needs to be at least 8 characters." });
        return;
      }
      await redis.set(credKey(email), hashPassword(body.password));
      res.json({ ok: true });
      return;
    }

    if (action === "verifySetupToken") {
      const raw = await redis.get(tokenKey(body.token || ""));
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!data || data.exp < Date.now()) {
        res.json({ ok: false, error: "This link has expired. Ask to be invited again." });
        return;
      }
      res.json({ ok: true, email: data.email });
      return;
    }

    if (action === "setPassword") {
      const raw = await redis.get(tokenKey(body.token || ""));
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!data || data.exp < Date.now()) {
        res.json({ ok: false, error: "This link has expired. Ask to be invited again." });
        return;
      }
      if (!body.password || body.password.length < 8) {
        res.json({ ok: false, error: "Password needs to be at least 8 characters." });
        return;
      }
      await redis.set(credKey(data.email), hashPassword(body.password));
      await redis.del(tokenKey(body.token));
      res.json({ ok: true, email: data.email });
      return;
    }

    res.status(400).json({ error: "Unknown action: " + action });
  } catch (err) {
    res.status(200).json({ error: String(err?.message || err) });
  }
}
