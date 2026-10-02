import { Redis } from "@upstash/redis";

/* Shared across every API route. Not a route itself — the leading underscore
   on this folder tells Vercel to skip it when wiring up /api/* endpoints.
   Env var names vary by how the Redis integration was connected in the
   Vercel dashboard, so this checks the handful of names Vercel is known
   to use rather than assuming one. */
export function redisFromEnv() {
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

export const NOT_CONNECTED_MESSAGE =
  "Shared storage isn't connected in this Vercel project yet. In the Vercel dashboard: Storage → Create Database → pick a Redis option (Upstash) → connect it to this project → redeploy.";
